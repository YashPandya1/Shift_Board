# ShiftBoard - Stop backend and frontend dev servers
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$PidDir = Join-Path $Root ".pids"

function Stop-ByPidFile($Name, $Port) {
    $pidFile = Join-Path $PidDir "$Name.pid"
    if (Test-Path $pidFile) {
        $procId = Get-Content $pidFile
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if ($proc) {
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            Write-Host "Stopped $Name (PID $procId)" -ForegroundColor Green
        }
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    }
    # Fallback: kill anything on the port
    $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($conn) {
        $conn | ForEach-Object {
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
        Write-Host "Freed port $Port" -ForegroundColor Yellow
    }
}

$target = if ($args.Count -gt 0) { $args[0] } else { "all" }

switch ($target) {
    "backend"  { Stop-ByPidFile "backend" 3000 }
    "frontend" { Stop-ByPidFile "frontend" 4200 }
    "all"      { Stop-ByPidFile "backend" 3000; Stop-ByPidFile "frontend" 4200 }
    default    { Write-Host "Usage: .\stop.ps1 [backend|frontend|all]"; exit 1 }
}

Write-Host "Done." -ForegroundColor Gray
