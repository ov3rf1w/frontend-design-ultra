$ErrorActionPreference = "Stop"

$RepoUrl = if ($env:FRONTEND_DESIGN_ULTRA_REPO) { $env:FRONTEND_DESIGN_ULTRA_REPO } else { "https://github.com/ov3rf1w/frontend-design-ultra.git" }
$RepoRef = if ($env:FRONTEND_DESIGN_ULTRA_REF) { $env:FRONTEND_DESIGN_ULTRA_REF } else { "main" }
$CodexRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
$SkillsRoot = Join-Path $CodexRoot "skills"
$SkillName = "frontend-design-ultra"
$Target = Join-Path $SkillsRoot $SkillName

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Frontend Design Ultra - Codex Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "Git is required."
}

$Python = Get-Command python -ErrorAction SilentlyContinue
if (-not $Python) {
  $Python = Get-Command py -ErrorAction SilentlyContinue
}
if (-not $Python) {
  throw "Python is required for validation."
}

$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

try {
  $Checkout = Join-Path $TempDir "repo"
  Write-Host "[INFO] Downloading $RepoRef..." -ForegroundColor Yellow
  git clone --depth 1 --branch $RepoRef $RepoUrl $Checkout

  Write-Host "[INFO] Installing skill..." -ForegroundColor Yellow
  New-Item -ItemType Directory -Force -Path $SkillsRoot | Out-Null
  if (Test-Path $Target) {
    Remove-Item -Path $Target -Recurse -Force
  }
  Copy-Item -Path (Join-Path $Checkout "frontend-design-ultra") -Destination $Target -Recurse -Force

  $Validator = Join-Path $CodexRoot "skills\.system\skill-creator\scripts\quick_validate.py"
  if (Test-Path $Validator) {
    & $Python.Source $Validator $Target
  } else {
    Write-Host "[WARN] Codex skill validator not found at $Validator; skipped validation." -ForegroundColor Yellow
  }

  Write-Host ""
  Write-Host "[OK] Frontend Design Ultra installed" -ForegroundColor Green
  Write-Host "Installed to: $Target"
  Write-Host "Next: restart Codex so skill metadata reloads."
} finally {
  if (Test-Path $TempDir) {
    Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}

