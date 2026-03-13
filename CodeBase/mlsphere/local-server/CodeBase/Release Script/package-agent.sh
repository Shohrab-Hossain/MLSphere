#!/bin/bash

# MLSphere Agent - Build Script for All Platforms
# This script packages the desktop agent for Windows, macOS, and Linux

set -e

echo "======================================"
echo "MLSphere Agent Packaging Script"
echo "======================================"
echo ""

# Check if pkg is installed
if ! command -v pkg &> /dev/null
then
    echo "📦 Installing pkg (Node.js binary packager)..."
    npm install -g pkg
fi

# Create output directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODEBASE_DIR="$(dirname "$SCRIPT_DIR")"
LOCAL_SERVER_ROOT="$(dirname "$CODEBASE_DIR")"
AGENT_DIR="$CODEBASE_DIR/Local Server"
RELEASED_INSTALLER_ROOT="$LOCAL_SERVER_ROOT/Released Installer"

# Create timestamped release folder
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
RELEASE_DIR="$RELEASED_INSTALLER_ROOT/Installer_[$TIMESTAMP]"
WINDOWS_DIR="$RELEASE_DIR/windows"
MACOS_DIR="$RELEASE_DIR/macos"
LINUX_DIR="$RELEASE_DIR/linux"
mkdir -p "$WINDOWS_DIR" "$MACOS_DIR" "$LINUX_DIR"

echo "📁 Output directory: $RELEASE_DIR"
echo "⏰ Timestamp: $TIMESTAMP"
echo ""

# Package for Windows
echo "🪟 Packaging for Windows..."
pkg "$AGENT_DIR/server.js" \
  --targets node16-win-x64 \
    --output "$WINDOWS_DIR/mlsphere-agent-win-x64.exe" \
  --compress GZip

if [ $? -eq 0 ]; then
    echo "✅ Windows build complete: mlsphere-agent-win-x64.exe"
else
    echo "❌ Windows build failed"
    exit 1
fi

echo ""

# Package for macOS (Intel)
echo "🍎 Packaging for macOS (Intel)..."
pkg "$AGENT_DIR/server.js" \
  --targets node16-macos-x64 \
    --output "$MACOS_DIR/mlsphere-agent-macos-x64" \
  --compress GZip

if [ $? -eq 0 ]; then
    chmod +x "$MACOS_DIR/mlsphere-agent-macos-x64"
    echo "✅ macOS (Intel) build complete: mlsphere-agent-macos-x64"
else
    echo "❌ macOS build failed"
    exit 1
fi

echo ""

# Package for macOS (Apple Silicon)
echo "🍎 Packaging for macOS (Apple Silicon)..."
pkg "$AGENT_DIR/server.js" \
  --targets node16-macos-arm64 \
    --output "$MACOS_DIR/mlsphere-agent-macos-arm64" \
  --compress GZip

if [ $? -eq 0 ]; then
    chmod +x "$MACOS_DIR/mlsphere-agent-macos-arm64"
    echo "✅ macOS (Apple Silicon) build complete: mlsphere-agent-macos-arm64"
else
    echo "❌ macOS ARM build failed"
    exit 1
fi

echo ""

# Package for Linux
echo "🐧 Packaging for Linux (x64)..."
pkg "$AGENT_DIR/server.js" \
  --targets node16-linux-x64 \
    --output "$LINUX_DIR/mlsphere-agent-linux-x64" \
  --compress GZip

if [ $? -eq 0 ]; then
    chmod +x "$LINUX_DIR/mlsphere-agent-linux-x64"
    echo "✅ Linux build complete: mlsphere-agent-linux-x64"
else
    echo "❌ Linux build failed"
    exit 1
fi

echo ""

# Copy README and config
echo "📄 Copying documentation..."
cp "$SCRIPT_DIR/README.md" "$RELEASE_DIR/README.md"

# Create version file
echo "1.0.0" > "$RELEASE_DIR/VERSION.txt"

# Calculate file sizes
echo ""
echo "======================================"
echo "Build Summary"
echo "======================================"
echo ""

for file in "$RELEASE_DIR"/*/*agent*; do
    if [ -f "$file" ]; then
        size=$(du -h "$file" | cut -f1)
        relative_path="${file#${RELEASE_DIR}/}"
        echo "  $relative_path: $size"
    fi
done

echo ""
echo "✅ All builds complete!"
echo "📦 Installers available at: $RELEASE_DIR"
echo ""
echo "Next steps:"
echo "1. Test each installer on target platforms"
echo "2. Sign executables (Windows/macOS)"
echo "3. Create installers with protocol handler registration"
echo "4. Upload to CDN or release page"
echo ""
