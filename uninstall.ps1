$ErrorActionPreference = "Stop"

$UserProfile = [Environment]::GetFolderPath("UserProfile")
$CodexRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $UserProfile ".codex" }
$CodexRoot = [IO.Path]::GetFullPath($CodexRoot)
$SkillsRoot = [IO.Path]::GetFullPath((Join-Path $CodexRoot "skills"))
$Target = [IO.Path]::GetFullPath((Join-Path $SkillsRoot "frontend-design-ultra"))
$ExpectedPrefix = $SkillsRoot.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar

if (-not $Target.StartsWith($ExpectedPrefix, [StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($Target) -ne "frontend-design-ultra") {
  throw "Refusing to remove a target outside the expected Codex skills directory."
}

Write-Host "Removing Frontend Design Ultra from $Target"
if (Test-Path -LiteralPath $Target -PathType Container) {
  $TargetItem = Get-Item -LiteralPath $Target -Force
  if (($TargetItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
    Remove-Item -LiteralPath $Target -Force
  } else {
    Remove-Item -LiteralPath $Target -Recurse -Force
  }
} elseif (Test-Path -LiteralPath $Target) {
  throw "Refusing to remove a non-directory target: $Target"
}
Write-Host "[OK] Removed. Restart Codex if it is running." -ForegroundColor Green
