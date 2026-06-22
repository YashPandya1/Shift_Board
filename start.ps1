# ShiftBoard - Start backend and frontend dev servers
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$PidDir = Join-Path $Root ".pids"
$NpmCli = "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js"

if (-not (Test-Path $PidDir)) { New-Item -ItemType Directory -Path $PidDir | Out-Null }

function Test-PortInUse($Port) {
    $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $conn
}

function Start-Backend {
    if (Test-PortInUse 3000) {
        Write-Host "Backend already running on port 3000" -ForegroundColor Yellow
        return
    }
    Write-Host "Starting backend..." -ForegroundColor Cyan
    $proc = Start-Process -FilePath "node" -ArgumentList "src/server.js" `
        -WorkingDirectory (Join-Path $Root "backend") `
        -WindowStyle Hidden -PassThru
    $proc.Id | Out-File (Join-Path $PidDir "backend.pid")
    Start-Sleep -Seconds 2
    if (Test-PortInUse 3000) {
        Write-Host "  Backend running at http://localhost:3000" -ForegroundColor Green
    } else {
        Write-Host "  Backend failed to start — check MongoDB is running" -ForegroundColor Red
    }
}

function Start-Frontend {
    if (Test-PortInUse 4200) {
        Write-Host "Frontend already running on port 4200" -ForegroundColor Yellow
        return
    }
    Write-Host "Starting frontend..." -ForegroundColor Cyan
    $proc = Start-Process -FilePath "node" -ArgumentList "`"$NpmCli`" start" `
        -WorkingDirectory (Join-Path $Root "frontend") `
        -WindowStyle Hidden -PassThru
    $proc.Id | Out-File (Join-Path $PidDir "frontend.pid")
    Write-Host "  Frontend starting at http://localhost:4200 (may take ~30s)" -ForegroundColor Green
}

$target = if ($args.Count -gt 0) { $args[0] } else { "all" }

switch ($target) {
    "backend"  { Start-Backend }
    "frontend" { Start-Frontend }
    "all"      { Start-Backend; Start-Frontend }
    default    { Write-Host "Usage: .\start.ps1 [backend|frontend|all]"; exit 1 }
}

Write-Host "`nUse .\stop.ps1 to shut down servers." -ForegroundColor Gray
