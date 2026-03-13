# MLSphere Desktop Agent

## What is the Desktop Agent?

The MLSphere Desktop Agent is a lightweight background service that enables your browser-based ML pipeline builder to execute Python code and train machine learning models on your local machine or GPU.

## Key Features

- **Local Execution**: Run ML training jobs on your own hardware (CPU/GPU)
- **File Management**: Sync project files between browser and local filesystem
- **Job Queue**: Manage multiple training jobs with status tracking
- **Artifact Storage**: Save trained models, logs, and outputs locally
- **Privacy**: Your data and models never leave your machine

## How It Works

```
Browser (MLSphere Web App)
    ↓ HTTP API
Desktop Agent (localhost:51751)
    ↓ executes
Python Scripts → ML Training → Outputs
```

## System Requirements

- **Operating System**: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **Node.js**: v16+ (bundled in installer)
- **Python**: 3.8+ with pip
- **RAM**: 4GB minimum, 8GB+ recommended
- **GPU**: Optional (CUDA 11.8+ for GPU acceleration)

## Installation

### Windows
1. Download `mlsphere-agent-setup.exe`
2. Run the installer
3. Follow the setup wizard
4. Agent starts automatically after installation

### macOS
1. Download `mlsphere-agent-setup.dmg`
2. Open the DMG file
3. Drag MLSphere Agent to Applications
4. Open from Applications (Right-click → Open first time)

### Linux
```bash
# Debian/Ubuntu
sudo dpkg -i mlsphere-agent-setup.deb

# Or use the AppImage
chmod +x mlsphere-agent-v1.0.0.AppImage
./mlsphere-agent-v1.0.0.AppImage
```

## First-Time Setup

1. **Install Python dependencies** (if not already installed):
   ```bash
   pip install numpy pandas scikit-learn matplotlib
   ```

2. **GPU users** (optional):
   ```bash
   pip install torch torchvision
   # or
   pip install tensorflow
   ```

3. **Open MLSphere web app** in your browser

4. **Verify connection**: You should see "Agent: online" in the header

## Usage

### Starting the Agent

**Windows**: The agent runs as a Windows service (auto-starts on boot)

**macOS/Linux**: 
- Start: `mlsphere-agent start`
- Stop: `mlsphere-agent stop`
- Status: `mlsphere-agent status`

### Configuration

Configuration file location:
- **Windows**: `%APPDATA%\mlsphere\agent-config.json`
- **macOS**: `~/Library/Application Support/mlsphere/agent-config.json`
- **Linux**: `~/.config/mlsphere/agent-config.json`

Default configuration:
```json
{
  "port": 51751,
  "host": "127.0.0.1",
  "jobsDir": "./mlsphere-jobs",
  "projectsDir": "./mlsphere-projects",
  "pythonExecutable": "python3",
  "logLevel": "info"
}
```

## Troubleshooting

### Agent won't connect

1. Check if agent is running:
   - Windows: Open Task Manager → Search "mlsphere"
   - macOS/Linux: `ps aux | grep mlsphere`

2. Check port availability:
   ```bash
   netstat -an | grep 51751
   ```

3. Restart the agent from browser "Start/Restart" button

### Python jobs fail

1. Verify Python installation:
   ```bash
   python --version
   # Should be 3.8+
   ```

2. Check package installations:
   ```bash
   pip list | grep -E "numpy|pandas|scikit-learn"
   ```

3. View agent logs:
   - Windows: `%APPDATA%\mlsphere\logs\agent.log`
   - macOS: `~/Library/Logs/mlsphere/agent.log`
   - Linux: `~/.local/share/mlsphere/agent.log`

### GPU not detected

1. Check CUDA installation:
   ```bash
   nvidia-smi
   ```

2. Verify PyTorch GPU support:
   ```python
   import torch
   print(torch.cuda.is_available())
   ```

## Security

- **Localhost only**: Agent only accepts connections from 127.0.0.1
- **No external access**: No incoming internet connections
- **Sandboxed execution**: Jobs run in isolated directories
- **File permissions**: Agent respects OS file permissions

## Uninstallation

**Windows**: 
- Settings → Apps → MLSphere Agent → Uninstall

**macOS**: 
- Delete from Applications folder
- Remove config: `rm -rf ~/Library/Application\ Support/mlsphere`

**Linux**:
```bash
sudo dpkg -r mlsphere-agent  # Debian/Ubuntu
# or simply delete the AppImage
```

## Support

- Documentation: https://mlsphere.dev/docs
- Issues: https://github.com/your-org/mlsphere/issues
- Discord: https://discord.gg/mlsphere

## License

MIT License - See LICENSE file for details

## Version

Current Version: 1.0.0
Release Date: March 2026
