# MLSphere Desktop Agent - Release Installer

**Release Date:** March 6, 2026  
**Version:** 1.0.0

## Installation Files

This release includes installers for multiple platforms:

### Windows
- **File:** `windows/mlsphere-agent-win-x64.exe`
- **Platform:** Windows (64-bit)
- **Installation:** Double-click to run installer

### Linux
- **File:** `linux/mlsphere-agent-linux-x64`
- **Platform:** Linux (64-bit)
- **Installation:** 
  ```bash
  chmod +x mlsphere-agent-linux-x64
  ./mlsphere-agent-linux-x64
  ```

### macOS
- **Files:** 
  - `macos/mlsphere-agent-macos-x64` (Intel)
  - `macos/mlsphere-agent-macos-arm64` (Apple Silicon)
- **Platform:** macOS (Intel and Apple Silicon)
- **Installation:**
  ```bash
  chmod +x mlsphere-agent-macos-*
  ./mlsphere-agent-macos-<architecture>
  ```

## Features

- Local file system operations
- Project folder management
- Python code execution
- Port discovery and health monitoring
- Cross-platform support

## System Requirements

- **Windows:** Windows 10 or later (64-bit)
- **Linux:** Ubuntu 18.04+ or equivalent (64-bit)
- **macOS:** macOS 10.15 (Catalina) or later

## Support

For issues or questions, please refer to the main project documentation.
