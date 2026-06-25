# octocode Windows Installer
# Usage: irm https://octocode.ai/install.ps1 | iex
# Or: .\install.ps1

param(
    [string]$Version,
    [switch]$NoModifyPath
)

$ErrorActionPreference = "Stop"
$APP = "octo"
$INSTALL_DIR = "$env:USERPROFILE\.octo\bin"

Write-Host ""
Write-Host "█▀▀█ █▀▀█ █▀▀█ █▀▀▄ █▀▀▀ █▀▀█ █▀▀█ █▀▀█" -ForegroundColor Cyan
Write-Host "█░░█ █░░█ █▀▀▀ █░░█ █░░░ █░░█ █░░█ █▀▀▀" -ForegroundColor Cyan
Write-Host "▀▀▀▀ █▀▀▀ ▀▀▀▀ ▀  ▀ ▀▀▀▀ ▀▀▀▀ ▀▀▀▀ ▀▀▀▀" -ForegroundColor Cyan
Write-Host ""

# Detect architecture
$arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
if ($arch -eq "x86") {
    Write-Host "Error: 32-bit systems are not supported" -ForegroundColor Red
    exit 1
}

# Detect if baseline (no AVX2)
$needsBaseline = $false
try {
    $command = '(Add-Type -MemberDefinition "[DllImport(""kernel32.dll"")] public static extern bool IsProcessorFeaturePresent(int ProcessorFeature);" -Name Kernel32 -Namespace Win32 -PassThru)::IsProcessorFeaturePresent(40)'
    $result = powershell.exe -NoProfile -NonInteractive -Command $command 2>$null
    if ($result.Trim() -ne "True") {
        $needsBaseline = $true
    }
} catch {
    $needsBaseline = $true
}

$target = "windows-$arch"
if ($needsBaseline) {
    $target = "$target-baseline"
}

# Get version
if ($Version) {
    $Version = $Version -replace '^v', ''
    $specificVersion = $Version
} else {
    Write-Host "Fetching latest version..." -ForegroundColor Yellow
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/farhanic017/octocode/releases/latest"
    $specificVersion = $release.tag_name -replace '^v', ''
}

$filename = "$APP-$target.zip"
$url = "https://github.com/farhanic017/octocode/releases/download/v$specificVersion/$filename"

Write-Host "Installing octocode version: $specificVersion" -ForegroundColor Green
Write-Host "Target: $target" -ForegroundColor Gray

# Create install directory
New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null

# Download
Write-Host "Downloading $filename..." -ForegroundColor Yellow
$tempFile = "$env:TEMP\octocode_$([System.IO.Path]::GetRandomFileName()).zip"
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $url -OutFile $tempFile -UseBasicParsing
} catch {
    Write-Host "Error: Failed to download $url" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Extract
Write-Host "Extracting..." -ForegroundColor Yellow
Expand-Archive -Path $tempFile -DestinationPath "$env:TEMP\octocode_extract" -Force
Copy-Item "$env:TEMP\octocode_extract\octo.exe" "$INSTALL_DIR\octo.exe" -Force
Remove-Item $tempFile -Force
Remove-Item "$env:TEMP\octocode_extract" -Recurse -Force

# Add to PATH if not already there
if (-not $NoModifyPath) {
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($currentPath -notlike "*$INSTALL_DIR*") {
        [Environment]::SetEnvironmentVariable("Path", "$INSTALL_DIR;$currentPath", "User")
        Write-Host "Added $INSTALL_DIR to PATH" -ForegroundColor Green
    }
}

# Verify
& "$INSTALL_DIR\octo.exe" --version | Out-Null
if ($LASTEXITCODE -eq 0) {
    $installedVersion = & "$INSTALL_DIR\octo.exe" --version 2>&1
    Write-Host ""
    Write-Host "Success! octocode $installedVersion installed." -ForegroundColor Green
    Write-Host ""
    Write-Host "To get started:" -ForegroundColor Yellow
    Write-Host "  1. Restart your terminal (or refresh PATH)" -ForegroundColor Gray
    Write-Host "  2. cd <project>" -ForegroundColor Gray
    Write-Host "  3. octo" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "Error: Installation verification failed" -ForegroundColor Red
    exit 1
}
