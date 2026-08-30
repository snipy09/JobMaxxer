<#
  build-jobmaxxer.ps1
  Builds JobMaxxer v2.0.0 for Windows and copies the finished .exe into your
  Downloads folder. Run this on your Windows machine (it cannot run in the
  Claude Linux sandbox — the packaged app needs native Windows binaries).

  USAGE (PowerShell, from the repo root C:\Users\sajal\job-automator):

    # With your Supabase creds (so login works) — recommended:
    .\build-jobmaxxer.ps1 -SupabaseUrl "https://xxxx.supabase.co" -SupabaseAnonKey "your-anon-key"

    # Or, if you've already set SUPABASE_URL / SUPABASE_ANON_KEY in your env:
    .\build-jobmaxxer.ps1

    # Just to see the UI build (login won't reach the server):
    .\build-jobmaxxer.ps1 -SkipCredsCheck

  If you get an execution-policy error, run once:
    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#>

param(
  # Defaults are baked to sajal's project so this runs with ZERO arguments.
  # Precedence: explicit -arg  >  environment variable  >  baked default below.
  # NOTE: use the BASE project URL (no /rest/v1) — the app appends the path.
  [string]$SupabaseUrl     = $(if ($env:SUPABASE_URL)      { $env:SUPABASE_URL }      else { "https://jympejesevicwleptfzq.supabase.co" }),
  [string]$SupabaseAnonKey = $(if ($env:SUPABASE_ANON_KEY) { $env:SUPABASE_ANON_KEY } else { "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bXBlamVzZXZpY3dsZXB0ZnpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczOTU5NzQsImV4cCI6MjEwMjk3MTk3NH0.1b6XFrIxH1hLVdjp2arHLdJ4fkiKV-0gb6yNZ7eMbPA" }),
  [switch]$SkipCredsCheck
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
Set-Location $root

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host " JobMaxxer v2.0.0  -  Windows build & package" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# --- 1. Credentials -----------------------------------------------------------
# SUPABASE_URL + SUPABASE_ANON_KEY are baked into the app at build time so a
# fresh install can reach the licensing server. The service_role key is NOT
# baked (it stays on your machine only). See DEPLOY.md Part B.
if ((-not $SupabaseUrl -or -not $SupabaseAnonKey) -and -not $SkipCredsCheck) {
  Write-Warning "SUPABASE_URL / SUPABASE_ANON_KEY were not provided."
  Write-Warning "The app will still build, but NOBODY will be able to log in until"
  Write-Warning "it is rebuilt with them. Pass -SupabaseUrl / -SupabaseAnonKey, or"
  Write-Warning "re-run with -SkipCredsCheck if you just want to see the UI build."
  $answer = Read-Host "Continue without credentials? (y/N)"
  if ($answer -ne "y") { Write-Host "Aborted."; exit 1 }
}

$env:SUPABASE_URL           = $SupabaseUrl
$env:SUPABASE_ANON_KEY      = $SupabaseAnonKey
$env:VITE_SUPABASE_URL      = $SupabaseUrl   # renderer (Vite) copy
$env:VITE_SUPABASE_ANON_KEY = $SupabaseAnonKey

# --- 2. Dependencies ----------------------------------------------------------
if (-not (Test-Path (Join-Path $root "node_modules"))) {
  Write-Host "`n[1/3] Installing dependencies (first run only, a few minutes)..." -ForegroundColor Yellow
  npm install
} else {
  Write-Host "`n[1/3] Dependencies already installed - skipping npm install." -ForegroundColor DarkGray
}

# --- 3. Build + package -------------------------------------------------------
Write-Host "`n[2/3] Building renderer + main and packaging the Windows installer..." -ForegroundColor Yellow
npm run package:desktop

# --- 4. Copy artifacts to Downloads ------------------------------------------
Write-Host "`n[3/3] Copying the app to your Downloads folder..." -ForegroundColor Yellow
$dist      = Join-Path $root "apps\desktop\dist-electron"
$downloads = Join-Path $env:USERPROFILE "Downloads"

if (-not (Test-Path $dist)) { throw "Build output not found at $dist" }
$exes = Get-ChildItem $dist -Filter *.exe -File -ErrorAction SilentlyContinue
if (-not $exes) { throw "No .exe was produced in $dist" }

foreach ($exe in $exes) {
  Copy-Item $exe.FullName -Destination $downloads -Force
  $size = "{0:N1} MB" -f ($exe.Length / 1MB)
  Write-Host ("  copied  {0}  ({1})" -f $exe.Name, $size) -ForegroundColor Green
}

Write-Host "`nDone. Your app is in: $downloads" -ForegroundColor Cyan
Write-Host "  - 'JobMaxxer Setup 2.0.0.exe'  = installer (recommended)" -ForegroundColor Gray
Write-Host "  - 'JobMaxxer 2.0.0.exe'        = portable, no install" -ForegroundColor Gray
Start-Process explorer.exe $downloads
