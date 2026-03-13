# Local Server

Node.js HTTP server that runs on the user's machine. Handles job execution, port management, and provides a REST API for the desktop agent.

<br>

## 🚀 Quick Start

### Running the Server

**Development mode:**
```bash
npm run local-server:start
```

**Manual startup:**
```bash
cd "local-server/CodeBase/Local Server"
node server.js
```

Starts on `127.0.0.1:51751` by default. If port 51751 is already in use, automatically starts on the next available port (51752, 51753, etc.).

<br>

## 📋 Server Features

- Runs on localhost with automatic port fallback
- Handles job execution and logging
- Provides HTTP REST API endpoints
- Auto-detects next available port if default is occupied
- Supports multiple concurrent connections

<br>

## 📦 Releasing the Installer

### Build Multi-Platform Release

Create Windows, macOS, and Linux executable packages in one command:

**Using npm from root:**
```bash
npm run release:local-server
```

**Or directly run the build scripts:**

Windows:
```bash
.\local-server\CodeBase\"Release Script"\package-agent.ps1
```

Linux/macOS:
```bash
./local-server/CodeBase/Release\ Script/package-agent.sh
```

<br>

### What Gets Created

Each release produces a timestamped folder: `Installer_YYYY-MM-DD_HHMMSS/`

```
Installer_2026-03-06_103301/
├── windows/
│   └── mlsphere-agent-win-x64.exe
├── macos/
│   ├── mlsphere-agent-macos-x64
│   └── mlsphere-agent-macos-arm64
├── linux/
│   └── mlsphere-agent-linux-x64
├── VERSION.txt
└── README.md
```

<br>

### Release Options

- **`npm run release:local-server`** - Full build with dependency check
- **`npm run release:local-server:skip-install`** - Skip pkg dependency validation
- **`npm run release:local-server:sh`** - Use Bash script variant (Unix systems)

<br>

### Release Location

All releases are stored in: `local-server/Released Installer/`

View latest release:
```bash
cd "local-server/Released Installer/"
ls -t | head -1
```

<br>

## 📁 Folder Structure

```
local-server/
├── CodeBase/
│   ├── Local Server/
│   │   ├── server.js              Main HTTP server
│   │   └── package.json           Dependencies
│   └── Release Script/
│       ├── package-agent.ps1      PowerShell build script
│       └── package-agent.sh       Bash build script
├── Released Installer/            All release artifacts
└── README.md                      This file
```

<br>

## 🔧 Release Process

### Step-by-step

1. **Ensure dependencies are installed:**
   ```bash
   npm install
   ```

2. **Run the release command:**
   ```bash
   npm run release:local-server
   ```

3. **Verify the output:**
   - Check `local-server/Released Installer/Installer_[timestamp]/`
   - Confirm all three platforms are present (windows, macos, linux)

4. **Distribute binaries:**
   - Copy platform-specific versions to users
   - Windows users get `.exe` file
   - macOS users get the appropriate architecture (x64 or arm64)
   - Linux users get the executable binary

<br>

## 📋 Version Management

Each release folder contains:
- **VERSION.txt** - Version number, build date, platform list
- **windows/, macos/, linux/** - Platform-specific executables

## �️ Maintenance

**Clean old releases:**
```bash
# Keep only last 5 releases
cd "local-server/Released Installer/"
ls -t | tail -n +6 | xargs rm -rf
```

<br>

**Archive releases:**
```bash
# Create compressed archive
tar -czf agent-releases-backup.tar.gz "local-server/Released Installer/"
```

<br>

## 💡 Technical Stack

- **Runtime:** Node.js 16+
- **Packaging:** pkg (cross-platform executable creator)
- **Platforms:** Windows, macOS (x64 & arm64), Linux (x64)
- **Execution:** Python job runner on user's machine

<br>

---

**Last Updated:** March 6, 2026
