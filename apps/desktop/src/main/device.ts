import os from 'os';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

let cachedFingerprint: string | null = null;
let cachedDeviceName: string | null = null;

export function getDeviceIdentifier(userDataPath: string): {
  deviceFingerprint: string;
  deviceName: string;
} {
  if (cachedFingerprint && cachedDeviceName) {
    return { deviceFingerprint: cachedFingerprint, deviceName: cachedDeviceName };
  }

  const deviceIdFile = path.join(userDataPath, 'device_id.json');
  let persistentId = '';

  try {
    if (fs.existsSync(deviceIdFile)) {
      const raw = fs.readFileSync(deviceIdFile, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.id === 'string' && parsed.id.length > 0) {
        persistentId = parsed.id;
      }
    }
  } catch {}

  if (!persistentId) {
    persistentId = crypto.randomUUID();
    try {
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }
      fs.writeFileSync(deviceIdFile, JSON.stringify({ id: persistentId, created: new Date().toISOString() }, null, 2));
    } catch {}
  }

  // Combine hardware components
  const hostname = os.hostname();
  const platform = os.platform();
  const arch = os.arch();
  const username = (() => {
    try {
      return os.userInfo().username;
    } catch {
      return 'user';
    }
  })();

  const rawSeed = `${persistentId}:${hostname}:${platform}:${arch}:${username}`;
  cachedFingerprint = crypto.createHash('sha256').update(rawSeed).digest('hex');

  // Friendly human readable device name
  const platformPretty = platform === 'win32' ? 'Windows' : platform === 'darwin' ? 'macOS' : 'Linux';
  cachedDeviceName = `${hostname} (${platformPretty} - ${username})`;

  return { deviceFingerprint: cachedFingerprint, deviceName: cachedDeviceName };
}
