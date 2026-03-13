# MLSphere Agent Packaging Guide

This guide explains how to package the MLSphere Desktop Agent for distribution across Windows, macOS, and Linux.

---

## Overview

The desktop agent is packaged as standalone executables for each platform:
- **Windows**: `.exe` (single executable)
- **macOS**: Binary (Intel x64 and Apple Silicon arm64)
- **Linux**: Binary (x64)

Each package includes:
- Node.js runtime (bundled)
- Agent server code
- Configuration files
- README documentation

---

## Prerequisites

### Required Software

1. **Node.js 16+** and npm
   ```bash
   node --version  # Should be v16.x or higher
   npm --version
   ```

2. **pkg** (Node.js binary packager)
   ```bash
   npm install -g pkg
   ```

3. **Platform-Specific** (for advanced installers):
   - Windows: Inno Setup or NSIS
   - macOS: create-dmg, codesign
   - Linux: debbuild, appimagetool

### Optional (for signing):
- **Windows**: Microsoft Authenticode certificate + signtool
- **macOS**: Apple Developer ID certificate + codesign
- **Linux**: GPG keys for package signing

---

## Quick Start

### Option 1: PowerShell (Windows/Linux/macOS)

```powershell
# Package all platforms
.\scripts\package-agent.ps1

# Package Windows only
.\scripts\package-agent.ps1 -WindowsOnly

# Skip pkg installation check
.\scripts\package-agent.ps1 -SkipInstall
```

### Option 2: Bash (Linux/macOS)

```bash
# Make script executable
chmod +x "local-server/Release Script/package-agent.sh"

# Package all platforms
./local-server/Release\ Script/package-agent.sh
```

### Option 3: npm Scripts

```bash
cd "local-server/Local Server"

# Install pkg locally
npm install

# Package all platforms
npm run package:all

# Package specific platform
npm run package:win
npm run package:macos
npm run package:linux
```

---

## Output

Packaged executables are created in:
```
desktop-agent/Release/Released/Installer_[timestamp]/
  windows/
    mlsphere-agent-win-x64.exe      (~40-50 MB)
  linux/
    mlsphere-agent-linux-x64        (~50-60 MB)
  macos/
    mlsphere-agent-macos-x64        (~50-60 MB)
    mlsphere-agent-macos-arm64      (~50-60 MB)
  VERSION.txt
  README.md
```

---

## Testing Packaged Agents

### Windows

```cmd
cd release\agent\installers
mlsphere-agent-win-x64.exe
```

Should see:
```
MLSphere Desktop Agent v1.0.0
Server running on http://127.0.0.1:51751
Press Ctrl+C to stop
```

Test health endpoint:
```cmd
curl http://127.0.0.1:51751/health
```

### macOS

```bash
cd release/agent/installers

# Give execute permission
chmod +x mlsphere-agent-macos-x64

# Run agent
./mlsphere-agent-macos-x64
```

### Linux

```bash
cd release/agent/installers

# Give execute permission
chmod +x mlsphere-agent-linux-x64

# Run agent
./mlsphere-agent-linux-x64
```

---

## Creating Installer Packages

### Windows Installer (.msi or .exe with UI)

**Using Inno Setup**:

1. Install Inno Setup: https://jrsoftware.org/isinfo.php

2. Create `installer-win.iss`:
```ini
[Setup]
AppName=MLSphere Agent
AppVersion=1.0.0
DefaultDirName={pf}\MLSphere Agent
DefaultGroupName=MLSphere
OutputDir=release\agent\installers
OutputBaseFilename=mlsphere-agent-setup-win-x64

[Files]
Source: "release\agent\installers\mlsphere-agent-win-x64.exe"; DestDir: "{app}"
Source: "release\agent\README.md"; DestDir: "{app}"

[Icons]
Name: "{group}\MLSphere Agent"; Filename: "{app}\mlsphere-agent-win-x64.exe"
Name: "{group}\Uninstall"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\mlsphere-agent-win-x64.exe"; Description: "Start MLSphere Agent"; Flags: nowait postinstall skipifsilent

[Registry]
; Register protocol handler mlsphere-agent://
Root: HKCR; Subkey: "mlsphere-agent"; ValueType: string; ValueData: "URL:MLSphere Agent Protocol"
Root: HKCR; Subkey: "mlsphere-agent"; ValueType: string; ValueName: "URL Protocol"; ValueData: ""
Root: HKCR; Subkey: "mlsphere-agent\shell\open\command"; ValueType: string; ValueData: """{app}\mlsphere-agent-win-x64.exe"" ""%1"""
```

3. Compile:
```cmd
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer-win.iss
```

### macOS DMG Installer

**Using create-dmg**:

1. Install create-dmg:
```bash
npm install -g create-dmg
```

2. Create app bundle:
```bash
mkdir -p "MLSphere Agent.app/Contents/MacOS"
mkdir -p "MLSphere Agent.app/Contents/Resources"

cp release/agent/installers/mlsphere-agent-macos-x64 "MLSphere Agent.app/Contents/MacOS/mlsphere-agent"
chmod +x "MLSphere Agent.app/Contents/MacOS/mlsphere-agent"
```

3. Create `Info.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>MLSphere Agent</string>
    <key>CFBundleIdentifier</key>
    <string>com.mlsphere.agent</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundleExecutable</key>
    <string>mlsphere-agent</string>
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLName</key>
            <string>MLSphere Agent Protocol</string>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>mlsphere-agent</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
```

4. Create DMG:
```bash
create-dmg "MLSphere Agent.app" release/agent/installers/
```

### Linux .deb Package

**Using dpkg-deb**:

1. Create package structure:
```bash
mkdir -p mlsphere-agent-deb/DEBIAN
mkdir -p mlsphere-agent-deb/usr/local/bin
mkdir -p mlsphere-agent-deb/usr/share/applications
```

2. Create control file `mlsphere-agent-deb/DEBIAN/control`:
```
Package: mlsphere-agent
Version: 1.0.0
Section: utils
Priority: optional
Architecture: amd64
Maintainer: MLSphere <support@mlsphere.app>
Description: MLSphere Desktop Agent
 Executes ML pipelines locally on your hardware.
 Provides HTTP API for browser-based control plane.
```

3. Copy executable:
```bash
cp release/agent/installers/mlsphere-agent-linux-x64 mlsphere-agent-deb/usr/local/bin/mlsphere-agent
chmod +x mlsphere-agent-deb/usr/local/bin/mlsphere-agent
```

4. Create desktop entry `mlsphere-agent-deb/usr/share/applications/mlsphere-agent.desktop`:
```ini
[Desktop Entry]
Type=Application
Name=MLSphere Agent
Exec=/usr/local/bin/mlsphere-agent
Icon=mlsphere-agent
Comment=Execute ML pipelines locally
Categories=Development;
```

5. Build package:
```bash
dpkg-deb --build mlsphere-agent-deb
mv mlsphere-agent-deb.deb release/agent/installers/mlsphere-agent_1.0.0_amd64.deb
```

### Linux AppImage

**Using appimagetool**:

1. Download appimagetool:
```bash
wget https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage
chmod +x appimagetool-x86_64.AppImage
```

2. Create AppDir:
```bash
mkdir -p MLSphereAgent.AppDir/usr/bin
cp release/agent/installers/mlsphere-agent-linux-x64 MLSphereAgent.AppDir/usr/bin/mlsphere-agent
chmod +x MLSphereAgent.AppDir/usr/bin/mlsphere-agent
```

3. Create AppRun:
```bash
cat > MLSphereAgent.AppDir/AppRun << 'EOF'
#!/bin/bash
SELF=$(readlink -f "$0")
HERE=${SELF%/*}
exec "$HERE/usr/bin/mlsphere-agent" "$@"
EOF
chmod +x MLSphereAgent.AppDir/AppRun
```

4. Build AppImage:
```bash
./appimagetool-x86_64.AppImage MLSphereAgent.AppDir
mv MLSphere_Agent-x86_64.AppImage release/agent/installers/
```

---

## Code Signing

### Windows (Authenticode)

```cmd
signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com release\agent\installers\mlsphere-agent-win-x64.exe
```

### macOS (Apple Developer ID)

```bash
codesign --force --deep --sign "Developer ID Application: Your Name (TEAM_ID)" "MLSphere Agent.app"

# Notarize for Gatekeeper
xcrun notarytool submit "MLSphere Agent.dmg" --keychain-profile "notary-profile" --wait

# Staple notarization
xcrun stapler staple "MLSphere Agent.dmg"
```

### Linux (GPG Signing)

```bash
gpg --armor --detach-sign release/agent/installers/mlsphere-agent-linux-x64
```

---

## Distribution

### Option 1: Direct Download (Serve from Public Folder)

1. Copy to public folder:
```bash
cp release/agent/installers/* public/downloads/
```

2. Update download URLs in `src/App.vue`:
```javascript
downloadDesktopAgentFromUI() {
  const platform = this.detectPlatform();
  const urls = {
    windows: '/downloads/mlsphere-agent-win-x64.exe',
    macos: navigator.userAgent.includes('ARM') 
      ? '/downloads/mlsphere-agent-macos-arm64'
      : '/downloads/mlsphere-agent-macos-x64',
    linux: '/downloads/mlsphere-agent-linux-x64'
  };
  window.location.href = urls[platform];
}
```

### Option 2: CDN Hosting

Upload to:
- **AWS S3**: `s3://mlsphere-releases/agent/v1.0.0/`
- **CloudFlare R2**: `https://releases.mlsphere.app/agent/v1.0.0/`
- **GitHub Releases**: Attach to release tag

Update URLs:
```javascript
const CDN_BASE = 'https://releases.mlsphere.app/agent/v1.0.0';
const urls = {
  windows: `${CDN_BASE}/mlsphere-agent-win-x64.exe`,
  macos: `${CDN_BASE}/mlsphere-agent-macos-${arch}`,
  linux: `${CDN_BASE}/mlsphere-agent-linux-x64`
};
```

### Option 3: Package Managers

- **Windows**: Chocolatey, winget
- **macOS**: Homebrew
- **Linux**: apt, yum, snap, flatpak

---

## Auto-Update System (Future)

Implement auto-update checking in agent:

```javascript
// desktop-agent/server.js
const CURRENT_VERSION = '1.0.0';
const UPDATE_CHECK_URL = 'https://api.mlsphere.app/agent/version';

async function checkForUpdates() {
  try {
    const response = await fetch(UPDATE_CHECK_URL);
    const { latestVersion, downloadUrl } = await response.json();
    
    if (latestVersion > CURRENT_VERSION) {
      console.log(`Update available: ${latestVersion}`);
      // Notify browser UI to prompt user
    }
  } catch (error) {
    console.error('Update check failed:', error);
  }
}

// Check every 24 hours
setInterval(checkForUpdates, 24 * 60 * 60 * 1000);
```

---

## Troubleshooting

### Build Fails: "pkg not found"

```bash
npm install -g pkg
# Or use npx
npx pkg desktop-agent/server.js --targets node16-win-x64 --output release/agent/installers/mlsphere-agent-win.exe
```

### Build Fails: "Permission denied"

**Linux/macOS**:
```bash
chmod +x scripts/package-agent.sh
```

### Executable Won't Run: "Permission denied"

**macOS/Linux**:
```bash
chmod +x mlsphere-agent-*
```

### macOS: "Cannot be opened because it is from an unidentified developer"

**Temporary fix** (development):
```bash
xattr -cr "MLSphere Agent.app"
```

**Permanent fix**: Code sign with Apple Developer ID

### Windows: "Windows protected your PC" SmartScreen warning

**Solution**: Sign executable with Authenticode certificate from trusted CA

---

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/package-agent.yml`:

```yaml
name: Package Agent

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 16
      
      - name: Install pkg
        run: npm install -g pkg
      
      - name: Package Agent
        run: |
          if [ "$RUNNER_OS" == "Windows" ]; then
            powershell -File scripts/package-agent.ps1 -SkipInstall
          else
            bash scripts/package-agent.sh
          fi
        shell: bash
      
      - name: Upload Artifacts
        uses: actions/upload-artifact@v3
        with:
          name: agent-${{ matrix.os }}
          path: release/agent/installers/*
```

---

## Checklist

Before releasing:

- [ ] All platforms build successfully
- [ ] Executables tested on target OSes
- [ ] Health endpoint responds correctly
- [ ] Job creation and execution works
- [ ] File sync works for linked projects
- [ ] README documentation complete
- [ ] Version numbers updated
- [ ] Code signed (if applicable)
- [ ] Virus scan passed (VirusTotal)
- [ ] Sample projects tested end-to-end
- [ ] Update browser download URLs

---

## Version Management

Update version in:
1. `desktop-agent/package.json`
2. `desktop-agent/server.js` (AGENT_VERSION constant)
3. `scripts/package-agent.ps1` (version output)
4. `release/agent/README.md`

Semantic versioning:
- **Major**: Breaking API changes
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes

---

## Support

For packaging issues:
- GitHub Issues: [Repository URL]
- Email: support@mlsphere.app
- Documentation: https://docs.mlsphere.app
