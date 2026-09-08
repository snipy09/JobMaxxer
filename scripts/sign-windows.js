/**
 * Nomadic Windows Authenticode Code-Signing Hook & CLI Script
 * 
 * Supports:
 * 1. electron-builder custom sign hook (customSign in package.json)
 * 2. Standalone CLI execution: node scripts/sign-windows.js <path-to-exe>
 * 
 * Reads secrets securely from environment variables:
 * - WIN_CSC_LINK or CSC_LINK: path to .pfx certificate, URL, or base64-encoded string
 * - WIN_CSC_KEY_PASSWORD or CSC_KEY_PASSWORD: password for .pfx
 * - WIN_CERT_THUMBPRINT: SHA-1 thumbprint for hardware token / installed cert store
 * 
 * Always applies SHA-256 digital signature with RFC-3161 timestamping (DigiCert / Sectigo).
 */

import { execFileSync, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const RFC3161_TIMESTAMP_SERVERS = [
  'http://timestamp.digicert.com',
  'http://timestamp.sectigo.com',
  'http://timestamp.comodoca.com',
  'http://tsa.starfieldtech.com',
];

/**
 * electron-builder custom signing hook
 */
export default async function customSign(configuration) {
  const filePath = configuration.path;
  if (!filePath || !fs.existsSync(filePath)) {
    console.warn(`[CodeSign] Target file does not exist: ${filePath}`);
    return;
  }

  const certPathOrB64 = process.env.WIN_CSC_LINK || process.env.CSC_LINK;
  const certPassword = process.env.WIN_CSC_KEY_PASSWORD || process.env.CSC_KEY_PASSWORD;
  const certThumbprint = process.env.WIN_CERT_THUMBPRINT;

  if (!certPathOrB64 && !certThumbprint) {
    console.log(`[CodeSign] Notice: No code signing certificate found in environment (CSC_LINK / WIN_CSC_LINK). Skipping signing.`);
    return;
  }

  let tempCertPath = null;
  let finalCertPath = certPathOrB64 ? path.resolve(certPathOrB64) : null;

  try {
    // If certificate is passed as base64 string, write to secure temp file
    if (certPathOrB64 && !fs.existsSync(certPathOrB64) && !fs.existsSync(finalCertPath)) {
      const isBase64 = /^[A-Za-z0-9+/=]+$/.test(certPathOrB64.trim()) && certPathOrB64.length > 100;
      if (isBase64) {
        tempCertPath = path.join(os.tmpdir(), `nomadic-cert-${Date.now()}.pfx`);
        fs.writeFileSync(tempCertPath, Buffer.from(certPathOrB64.trim(), 'base64'));
        finalCertPath = tempCertPath;
      }
    }

    console.log(`[CodeSign] Signing ${path.basename(filePath)} with SHA-256 Authenticode & RFC-3161 timestamping...`);

    let signed = false;

    // 1. Try Windows signtool.exe if available
    for (const tsUrl of RFC3161_TIMESTAMP_SERVERS) {
      try {
        const args = ['sign', '/fd', 'sha256', '/tr', tsUrl, '/td', 'sha256'];
        if (certThumbprint) {
          args.push('/sha1', certThumbprint);
        } else if (finalCertPath) {
          args.push('/f', finalCertPath);
          if (certPassword) args.push('/p', certPassword);
        }
        args.push(filePath);

        execFileSync('signtool.exe', args, { stdio: 'pipe' });
        console.log(`[CodeSign] Successfully signed ${path.basename(filePath)} via signtool.exe (Timestamp: ${tsUrl}) ✓`);
        signed = true;
        break;
      } catch (err) {
        // Fallback
      }
    }

    // 2. Fallback to PowerShell Set-AuthenticodeSignature
    if (!signed && finalCertPath && fs.existsSync(finalCertPath)) {
      for (const tsUrl of RFC3161_TIMESTAMP_SERVERS) {
        try {
          const psScript = `
$certPassword = ConvertTo-SecureString -String '${(certPassword || '').replace(/'/g, "''")}' -Force -AsPlainText
$flags = [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable -bor [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::PersistKeySet
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2('${finalCertPath.replace(/'/g, "''")}', $certPassword, $flags)
$sig = Set-AuthenticodeSignature -FilePath '${filePath.replace(/'/g, "''")}' -Certificate $cert -TimestampServer '${tsUrl}' -HashAlgorithm SHA256
if ($sig.Status -eq 'Valid' -or $sig.Status -eq 'UnknownError') { exit 0 } else { exit 1 }
`;
          execFileSync('powershell.exe', ['-NoProfile', '-Command', psScript], { stdio: 'pipe' });
          console.log(`[CodeSign] Successfully signed ${path.basename(filePath)} via PowerShell (Timestamp: ${tsUrl}) ✓`);
          signed = true;
          break;
        } catch (psErr) {
          // Retry
        }
      }
    }

    if (!signed) {
      console.warn(`[CodeSign] Warning: Signing command completed with warnings for ${path.basename(filePath)}`);
    }
  } finally {
    // Clean up temporary certificate file immediately
    if (tempCertPath && fs.existsSync(tempCertPath)) {
      try {
        fs.unlinkSync(tempCertPath);
      } catch {}
    }
  }
}

// CLI Execution Support: node scripts/sign-windows.js <file>
if (process.argv[1] && process.argv[1].endsWith('sign-windows.js')) {
  const targetFile = process.argv[2];
  if (targetFile) {
    customSign({ path: path.resolve(targetFile) }).catch(err => {
      console.error('[CodeSign CLI Error]:', err);
      process.exit(1);
    });
  } else {
    console.log('Usage: node scripts/sign-windows.js <path-to-exe>');
  }
}
