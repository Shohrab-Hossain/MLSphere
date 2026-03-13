# MLSphere Agent - Build Script for All Platforms (PowerShell)
# This script packages the desktop agent for Windows, macOS, and Linux

param(
    [switch]$SkipInstall
)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "MLSphere Agent Packaging Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if pkg is installed
if (-not $SkipInstall) {
    Write-Host "[*] Checking for pkg..." -ForegroundColor Yellow
    $pkgInstalled = Get-Command pkg -ErrorAction SilentlyContinue
    
    if (-not $pkgInstalled) {
        Write-Host "[*] Installing pkg (Node.js binary packager)..." -ForegroundColor Yellow
        npm install -g pkg
    } else {
        Write-Host "[OK] pkg already installed" -ForegroundColor Green
    }
}

# Setup paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CodeBaseDir = Split-Path -Parent $ScriptDir
$LocalServerRoot = Split-Path -Parent $CodeBaseDir
$ProjectRoot = Split-Path -Parent $LocalServerRoot
$AgentDir = Join-Path $CodeBaseDir "Local Server"
$ReleasedInstallerRoot = Join-Path $LocalServerRoot "Released Installer"
$PrebuiltDir = Join-Path $ProjectRoot "public\downloads"

# Create timestamped release folder
$Timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$ReleaseDir = Join-Path $ReleasedInstallerRoot "Installer_[$Timestamp]"
$WindowsDir = Join-Path $ReleaseDir "windows"
$MacosDir = Join-Path $ReleaseDir "macos"
$LinuxDir = Join-Path $ReleaseDir "linux"

New-Item -ItemType Directory -Path $ReleaseDir -Force | Out-Null
New-Item -ItemType Directory -Path $WindowsDir -Force | Out-Null
New-Item -ItemType Directory -Path $MacosDir -Force | Out-Null
New-Item -ItemType Directory -Path $LinuxDir -Force | Out-Null

Write-Host "[*] Agent directory: $AgentDir" -ForegroundColor Gray
Write-Host "[*] Output directory: $ReleaseDir" -ForegroundColor Gray
Write-Host "[*] Timestamp: $Timestamp" -ForegroundColor Gray
Write-Host ""

function Use-PrebuiltIfAvailable {
    param(
        [string]$FallbackFileName,
        [string]$OutputPath,
        [string]$TargetLabel
    )

    $fallbackPath = Join-Path $PrebuiltDir $FallbackFileName
    if (Test-Path -LiteralPath $fallbackPath) {
        Copy-Item -LiteralPath $fallbackPath -Destination $OutputPath -Force
        Write-Host "[WARN] $TargetLabel build failed, used prebuilt binary: $FallbackFileName" -ForegroundColor Yellow
        return $true
    }
    return $false
}

# Package for Windows
Write-Host "[*] Packaging for Windows (x64)..." -ForegroundColor Cyan
$windowsExe = Join-Path $WindowsDir "mlsphere-agent-win-x64.exe"

npx pkg (Join-Path $AgentDir "server.js") `
    --targets node16-win-x64 `
    --output $windowsExe `
    --compress GZip

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Windows build complete: mlsphere-agent-win-x64.exe" -ForegroundColor Green
    $size = (Get-Item -LiteralPath $windowsExe).Length / 1MB
    Write-Host "    Size: $([math]::Round($size, 2)) MB" -ForegroundColor Gray
} else {
    if (-not (Use-PrebuiltIfAvailable -FallbackFileName "mlsphere-agent-win-x64.exe" -OutputPath $windowsExe -TargetLabel "Windows x64")) {
        Write-Host "[ERROR] Windows build failed and no prebuilt binary found" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Package for macOS (Intel)
Write-Host "[*] Packaging for macOS (Intel)..." -ForegroundColor Cyan
$macosIntel = Join-Path $MacosDir "mlsphere-agent-macos-x64"

npx pkg (Join-Path $AgentDir "server.js") `
    --targets node16-macos-x64 `
    --output $macosIntel `
    --compress GZip

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] macOS (Intel) build complete: mlsphere-agent-macos-x64" -ForegroundColor Green
} else {
    if (-not (Use-PrebuiltIfAvailable -FallbackFileName "mlsphere-agent-macos-x64" -OutputPath $macosIntel -TargetLabel "macOS x64")) {
        Write-Host "[ERROR] macOS Intel build failed and no prebuilt binary found" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Package for macOS (Apple Silicon)
Write-Host "[*] Packaging for macOS (Apple Silicon)..." -ForegroundColor Cyan
$macosArm = Join-Path $MacosDir "mlsphere-agent-macos-arm64"

npx pkg (Join-Path $AgentDir "server.js") `
    --targets node16-macos-arm64 `
    --output $macosArm `
    --compress GZip

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] macOS (Apple Silicon) build complete: mlsphere-agent-macos-arm64" -ForegroundColor Green
} else {
    if (-not (Use-PrebuiltIfAvailable -FallbackFileName "mlsphere-agent-macos-arm64" -OutputPath $macosArm -TargetLabel "macOS arm64")) {
        Write-Host "[ERROR] macOS ARM build failed and no prebuilt binary found" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Package for Linux
Write-Host "[*] Packaging for Linux (x64)..." -ForegroundColor Cyan
$linuxBin = Join-Path $LinuxDir "mlsphere-agent-linux-x64"

npx pkg (Join-Path $AgentDir "server.js") `
    --targets node16-linux-x64 `
    --output $linuxBin `
    --compress GZip

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Linux build complete: mlsphere-agent-linux-x64" -ForegroundColor Green
} else {
    if (-not (Use-PrebuiltIfAvailable -FallbackFileName "mlsphere-agent-linux-x64" -OutputPath $linuxBin -TargetLabel "Linux x64")) {
        Write-Host "[ERROR] Linux build failed and no prebuilt binary found" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Copy documentation
Write-Host "[*] Copying documentation..." -ForegroundColor Cyan
$readmeSrc = Join-Path $ScriptDir "README.md"
$readmeDst = Join-Path $ReleaseDir "README.md"

if (Test-Path -LiteralPath $readmeSrc) {
    Copy-Item -LiteralPath $readmeSrc -Destination $readmeDst -Force
    Write-Host "[OK] README copied" -ForegroundColor Green
}

# Create version file
Set-Content -LiteralPath (Join-Path $ReleaseDir "VERSION.txt") -Value "1.0.0" -Encoding UTF8

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Build Summary" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# List all built files
Get-ChildItem -LiteralPath $ReleaseDir -Recurse -File -Filter "*agent*" | ForEach-Object {
    $sizeMB = [math]::Round($_.Length / 1MB, 2)
    $relativePath = $_.FullName.Replace($ReleaseDir, '').TrimStart('\\')
    Write-Host "  ${relativePath}: $sizeMB MB" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[OK] All builds complete!" -ForegroundColor Green
Write-Host "[*] Installers available at: $ReleaseDir" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Test each installer on target platforms" -ForegroundColor Gray
Write-Host "2. Sign executables (Windows: signtool, macOS: codesign)" -ForegroundColor Gray
Write-Host "3. Create installers with protocol handler registration" -ForegroundColor Gray
Write-Host "4. Upload to CDN or release page" -ForegroundColor Gray
Write-Host ""

# Open folder in Explorer  
Write-Host "Built files ready in: $ReleaseDir" -ForegroundColor Yellow
