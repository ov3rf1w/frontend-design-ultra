[CmdletBinding()]
param(
  [ValidateSet("Auto", "Local", "Remote")]
  [string]$Source = "Auto",
  [string]$Ref = $env:FRONTEND_DESIGN_ULTRA_REF,
  [string]$Repo = $env:FRONTEND_DESIGN_ULTRA_REPO,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if ($Source -eq "Auto" -and $env:FRONTEND_DESIGN_ULTRA_SOURCE) {
  $Source = $env:FRONTEND_DESIGN_ULTRA_SOURCE
}
$Source = (Get-Culture).TextInfo.ToTitleCase($Source.ToLowerInvariant())
if ($Source -notin @("Auto", "Local", "Remote")) {
  throw "FRONTEND_DESIGN_ULTRA_SOURCE must be Auto, Local, or Remote."
}

if ([string]::IsNullOrWhiteSpace($Ref)) {
  $Ref = "main"
}
if ([string]::IsNullOrWhiteSpace($Repo)) {
  $Repo = "https://github.com/ov3rf1w/frontend-design-ultra.git"
}

$DryRunRequested = [bool]$DryRun
if (-not $DryRunRequested -and $env:FRONTEND_DESIGN_ULTRA_DRY_RUN) {
  switch ($env:FRONTEND_DESIGN_ULTRA_DRY_RUN.ToLowerInvariant()) {
    { $_ -in @("1", "true", "yes") } { $DryRunRequested = $true; break }
    { $_ -in @("0", "false", "no", "") } { break }
    default { throw "FRONTEND_DESIGN_ULTRA_DRY_RUN must be 0 or 1." }
  }
}

$CodexRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
$SkillsRoot = Join-Path $CodexRoot "skills"
$SkillName = "frontend-design-ultra"
$Target = Join-Path $SkillsRoot $SkillName

$LocalPayload = $null
if ($PSScriptRoot) {
  $Candidate = Join-Path $PSScriptRoot $SkillName
  if (Test-Path -LiteralPath (Join-Path $Candidate "SKILL.md") -PathType Leaf) {
    $LocalPayload = $Candidate
  }
}

if ($Source -eq "Auto") {
  $Source = if ($LocalPayload) { "Local" } else { "Remote" }
}
if ($Source -eq "Local" -and -not $LocalPayload) {
  throw "Local payload not found next to install.ps1. Run the checked-out script from the repository root or use -Source Remote."
}
if ($Source -eq "Remote") {
  if ([string]::IsNullOrWhiteSpace($Repo) -or $Repo.StartsWith("-")) {
    throw "Repository URL must not be empty or start with '-'."
  }
  if ([string]::IsNullOrWhiteSpace($Ref) -or $Ref.StartsWith("-")) {
    throw "Repository ref must not be empty or start with '-'."
  }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Frontend Design Ultra - Codex Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[INFO] Mode: $Source"
Write-Host "[INFO] Target: $Target"
if ($DryRunRequested) {
  Write-Host "[INFO] Dry run: the current installation will not be changed." -ForegroundColor Yellow
}

$Git = $null
if ($Source -eq "Remote") {
  $Git = Get-Command git -ErrorAction SilentlyContinue
  if (-not $Git) {
    throw "Git is required for a remote install."
  }
}

function Invoke-Git {
  param(
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [switch]$SuppressOutput
  )

  $ExitCode = 0
  if ($SuppressOutput) {
    $PreviousErrorPreference = $ErrorActionPreference
    try {
      # Windows PowerShell 5 can surface native stderr as ErrorRecord output even
      # with *> $null when ErrorActionPreference is Stop. Merge and consume it
      # under Continue so credential-bearing remote errors never reach the host.
      $ErrorActionPreference = "Continue"
      & $Git.Source @Arguments 2>&1 | Out-Null
      $ExitCode = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = $PreviousErrorPreference
    }
  } else {
    & $Git.Source @Arguments
    $ExitCode = $LASTEXITCODE
  }
  if ($ExitCode -ne 0) {
    throw "Git failed with exit code $ExitCode."
  }
}

function Get-RedactedRepoUrl {
  param([Parameter(Mandatory = $true)][string]$Value)

  $WithoutQuery = $Value -replace '\?.*$', ''
  return $WithoutQuery -replace '^([A-Za-z][A-Za-z0-9+.-]*://)[^/@]+@', '${1}***@'
}

function Test-StagedSkill {
  param([Parameter(Mandatory = $true)][string]$Path)

  foreach ($RequiredFile in @("README.md", "LICENSE", "THIRD_PARTY_NOTICES.md")) {
    $RequiredPath = Join-Path $Path $RequiredFile
    if (-not (Test-Path -LiteralPath $RequiredPath -PathType Leaf)) {
      throw "Staged payload is missing $RequiredFile."
    }
    if ([string]::IsNullOrWhiteSpace((Get-Content -Raw -LiteralPath $RequiredPath))) {
      throw "Staged payload contains an empty $RequiredFile."
    }
  }

  $SkillFile = Join-Path $Path "SKILL.md"
  if (-not (Test-Path -LiteralPath $SkillFile -PathType Leaf)) {
    throw "Staged payload is missing SKILL.md."
  }

  $Content = Get-Content -Raw -LiteralPath $SkillFile
  if ([string]::IsNullOrWhiteSpace($Content)) {
    throw "Staged SKILL.md is empty."
  }
  $FrontmatterMatch = [regex]::Match(
    $Content,
    '\A---\r?\n(?<body>.*?)\r?\n---(?:\r?\n|\z)',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
  )
  if (-not $FrontmatterMatch.Success) {
    throw "Staged SKILL.md does not contain valid leading YAML frontmatter."
  }
  $Frontmatter = $FrontmatterMatch.Groups["body"].Value
  if ($Frontmatter -notmatch '(?m)^name:\s*["'']?frontend-design-ultra["'']?\s*$') {
    throw "Staged SKILL.md does not declare name: frontend-design-ultra."
  }
  if ($Frontmatter -notmatch '(?m)^description:\s*.+$') {
    throw "Staged SKILL.md does not declare a description."
  }

  $Validator = Join-Path $CodexRoot "skills\.system\skill-creator\scripts\quick_validate.py"
  $Python = Get-Command python3, python, py -ErrorAction SilentlyContinue | Select-Object -First 1
  if ((Test-Path -LiteralPath $Validator -PathType Leaf) -and $Python) {
    $YamlAvailable = $false
    $PreviousErrorActionPreference = $ErrorActionPreference
    try {
      $ErrorActionPreference = "SilentlyContinue"
      & $Python.Source -c "import yaml" *> $null
      $YamlAvailable = $LASTEXITCODE -eq 0
    } finally {
      $ErrorActionPreference = $PreviousErrorActionPreference
    }
    if ($YamlAvailable) {
      & $Python.Source $Validator $Path
      if ($LASTEXITCODE -ne 0) {
        throw "Codex skill validation failed with exit code $LASTEXITCODE."
      }
    } else {
      Write-Warning "Codex validator dependencies are unavailable; built-in structural validation passed."
    }
  } elseif (Test-Path -LiteralPath $Validator -PathType Leaf) {
    Write-Warning "Python is unavailable; built-in structural validation passed."
  } else {
    Write-Host "[INFO] Codex validator not found; built-in structural validation passed."
  }
}

$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("frontend-design-ultra-" + [System.Guid]::NewGuid().ToString("N"))
$Stage = $null
$Backup = $null
$BackupActive = $false
$InstallCommitted = $false
New-Item -ItemType Directory -Path $TempDir | Out-Null

try {
  if ($Source -eq "Local") {
    $Payload = $LocalPayload
    $SourceLabel = "local checkout at $PSScriptRoot"
    Write-Host "[INFO] Source: $SourceLabel"
  } else {
    $Checkout = Join-Path $TempDir "repo"
    $RepoDisplay = Get-RedactedRepoUrl -Value $Repo
    Write-Host "[INFO] Fetching $Ref from $RepoDisplay..." -ForegroundColor Yellow
    Invoke-Git -Arguments @("init", "--quiet", $Checkout)
    Invoke-Git -Arguments @("-C", $Checkout, "remote", "add", "origin", $Repo)
    Invoke-Git -Arguments @("-C", $Checkout, "fetch", "--quiet", "--depth", "1", "origin", $Ref) -SuppressOutput
    Invoke-Git -Arguments @("-C", $Checkout, "-c", "advice.detachedHead=false", "checkout", "--quiet", "--detach", "FETCH_HEAD")
    $ResolvedCommit = (Invoke-Git -Arguments @("-C", $Checkout, "rev-parse", "--verify", "HEAD") | Select-Object -Last 1).Trim()
    $Payload = Join-Path $Checkout $SkillName
    $SourceLabel = "$Ref at $ResolvedCommit"
    Write-Host "[INFO] Resolved remote ref: $SourceLabel"
  }

  if (-not (Test-Path -LiteralPath $Payload -PathType Container)) {
    throw "Skill payload not found at $Payload."
  }
  if (-not (Test-Path -LiteralPath (Join-Path $Payload "SKILL.md") -PathType Leaf)) {
    throw "Skill payload is missing SKILL.md."
  }

  if ($DryRunRequested) {
    $Stage = Join-Path $TempDir "staged-skill"
  } else {
    New-Item -ItemType Directory -Force -Path $SkillsRoot | Out-Null
    $Stage = Join-Path $SkillsRoot (".$SkillName.stage." + [System.Guid]::NewGuid().ToString("N"))
  }

  Write-Host "[INFO] Copying payload into staging..." -ForegroundColor Yellow
  Copy-Item -LiteralPath $Payload -Destination $Stage -Recurse -Force

  Write-Host "[INFO] Validating staged skill..." -ForegroundColor Yellow
  Test-StagedSkill -Path $Stage

  if ($DryRunRequested) {
    Write-Host ""
    Write-Host "[OK] Dry run passed for $SourceLabel" -ForegroundColor Green
    Write-Host "No files were changed at $Target."
    return
  }

  if (Test-Path -LiteralPath $Target) {
    $Backup = "$Target.backup.$([System.Guid]::NewGuid().ToString('N'))"
    Write-Host "[INFO] Moving current installation to a temporary backup..." -ForegroundColor Yellow
    $BackupActive = $true
    Move-Item -LiteralPath $Target -Destination $Backup
  }

  Write-Host "[INFO] Activating staged skill..." -ForegroundColor Yellow
  Move-Item -LiteralPath $Stage -Destination $Target
  $Stage = $null
  $InstallCommitted = $true

  if ($BackupActive -and (Test-Path -LiteralPath $Backup)) {
    try {
      Remove-Item -LiteralPath $Backup -Recurse -Force
      $BackupActive = $false
      $Backup = $null
    } catch {
      Write-Warning "Install succeeded, but the temporary backup could not be removed: $Backup"
      $BackupActive = $false
    }
  }

  Write-Host ""
  Write-Host "[OK] Frontend Design Ultra installed from $SourceLabel" -ForegroundColor Green
  Write-Host "Installed to: $Target"
  Write-Host "Next: restart Codex so skill metadata reloads."
} finally {
  if ($BackupActive -and -not $InstallCommitted -and $Backup -and (Test-Path -LiteralPath $Backup)) {
    Write-Host "[INFO] Restoring the previous installation..." -ForegroundColor Yellow
    try {
      if (Test-Path -LiteralPath $Target) {
        Remove-Item -LiteralPath $Target -Recurse -Force
      }
      Move-Item -LiteralPath $Backup -Destination $Target
      $BackupActive = $false
      Write-Host "[OK] Previous installation restored." -ForegroundColor Green
    } catch {
      Write-Warning "Automatic restore failed. The previous installation remains at $Backup."
    }
  }
  if ($Stage -and (Test-Path -LiteralPath $Stage)) {
    Remove-Item -LiteralPath $Stage -Recurse -Force -ErrorAction SilentlyContinue
  }
  if (Test-Path -LiteralPath $TempDir) {
    Remove-Item -LiteralPath $TempDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}
