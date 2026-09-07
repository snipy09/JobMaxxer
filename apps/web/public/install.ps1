# Nomadic AI 1-Click Zero-Friction Installer & Unblocker
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$version = "1.0.5"
$url = "https://github.com/snipy09/JobMaxxer/releases/download/v$version/Nomadic.Setup.$version.exe"
$dest = "$env:TEMP\Nomadic.Setup.$version.exe"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Nomadic Career OS — Quick Installer   " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Downloading Nomadic v$version..." -ForegroundColor Yellow

try {
    Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
    Unblock-File -Path $dest -ErrorAction SilentlyContinue
    Write-Host "Download verified & unblocked successfully!" -ForegroundColor Green
    Write-Host "Launching Nomadic Installer..." -ForegroundColor Green
    Start-Process -FilePath $dest
} catch {
    Write-Host "Error downloading Nomadic: $_" -ForegroundColor Red
    Write-Host "Opening web download portal..." -ForegroundColor Yellow
    Start-Process "https://nomadicai.vercel.app/#/download"
}
