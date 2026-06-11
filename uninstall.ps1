$ErrorActionPreference = "Stop"

$CodexRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
$Target = Join-Path $CodexRoot "skills\frontend-design-ultra"

Write-Host "Removing Frontend Design Ultra from $Target"
if (Test-Path $Target) {
  Remove-Item -Path $Target -Recurse -Force
}
Write-Host "[OK] Removed. Restart Codex if it is running." -ForegroundColor Green

