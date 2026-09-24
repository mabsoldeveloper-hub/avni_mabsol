param(
  [string]$ServiceName = "MabsolCrmSync",
  [string]$DisplayName = "Mabsol CRM Sync Worker"
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$workerPath = Join-Path $projectRoot "scripts\mabsolcrm-sync\worker.cjs"
$nodePath = (Get-Command node).Source

if (-not (Test-Path $workerPath)) {
  throw "Worker not found at $workerPath"
}

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
  throw "Service $ServiceName already exists. Stop and remove it first if you need to reinstall."
}

$binaryPath = "`"$nodePath`" `"$workerPath`""

New-Service `
  -Name $ServiceName `
  -DisplayName $DisplayName `
  -BinaryPathName $binaryPath `
  -StartupType Automatic `
  -Description "Watches DBF files and syncs them into MabsolCrm MongoDB."

Write-Host "Installed $ServiceName."
Write-Host "Start it with: Start-Service $ServiceName"
