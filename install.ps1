# Use Node's bundled npm (10.x) instead of the outdated Roaming npm (6.x)
$NpmCli = "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js"

if (-not (Test-Path $NpmCli)) {
    Write-Error "Could not find bundled npm at $NpmCli"
    exit 1
}

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Target = if ($args.Count -gt 0) { $args[0] } else { "all" }

function Invoke-NpmInstall($Dir, [string[]]$ExtraArgs = @()) {
    Write-Host "`n==> Installing in $Dir" -ForegroundColor Cyan
    Push-Location $Dir
    try {
        if (Test-Path "node_modules") {
            Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
        }
        node $NpmCli install @ExtraArgs
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    } finally {
        Pop-Location
    }
}

switch ($Target) {
    "backend"  { Invoke-NpmInstall "$ProjectRoot\backend" }
    "frontend" { Invoke-NpmInstall "$ProjectRoot\frontend" @("--legacy-peer-deps") }
    "all" {
        Invoke-NpmInstall "$ProjectRoot\backend"
        Invoke-NpmInstall "$ProjectRoot\frontend" @("--legacy-peer-deps")
    }
    default { Write-Error "Usage: .\install.ps1 [backend|frontend|all]"; exit 1 }
}

Write-Host "`nDone!" -ForegroundColor Green
