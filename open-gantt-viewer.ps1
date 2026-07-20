$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8765
$url = "http://127.0.0.1:$port/gantt-viewer.html"

Set-Location -LiteralPath $projectRoot

try {
    $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop
    Start-Process $url
    Write-Host "Opened existing Gantt viewer at $url"
    exit 0
} catch {
    # No existing server on the chosen port.
}

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    throw 'Python is required to launch the local viewer. Run: python -m http.server 8765'
}

Start-Process -FilePath $python.Source -ArgumentList @('-m', 'http.server', $port, '--bind', '127.0.0.1') -WorkingDirectory $projectRoot -WindowStyle Hidden
Start-Sleep -Milliseconds 900
Start-Process $url
Write-Host "Gantt viewer opened at $url"
