<template>
  <section class="agent-setup-section">
    <div class="agent-setup-header">
      <h2>🚀 MLSphere Server Setup</h2>
      <p class="subtitle">
        <template v-if="desktopAgentState === 'offline'">
          <span class="status-text offline">🔴 Not connected to MLSphere Server.</span>
        </template>
        <template v-else-if="desktopAgentState === 'checking'">
          <span class="status-text checking">🔄 Checking server status...</span>
        </template>
        <template v-else-if="desktopAgentState === 'online'">
          <span class="status-text online">✅ Connected to MLSphere Server</span>
        </template>
        <span v-if="desktopAgentState !== 'checking'" class="checking-hint">{{ lastCheckHint }}</span>
      </p>
    </div>

    <div class="server-info-card">
      <h3>🧠 What is the MLSphere Server?</h3>
      <p>The MLSphere Server runs on your computer to:</p>
      <ul>
        <li>⚡ Execute ML training directly on your machine (CPU/GPU)</li>
        <li>📁 Manage project files and datasets locally</li>
        <li>🔒 Provide secure access to your file system</li>
        <li>🔐 Keep all data private on your device</li>
      </ul>
      <p><strong>Why needed?</strong> This browser app needs MLSphere Server access to run Python ML code, read/write files, and leverage your hardware for training.</p>
    </div>

    <!-- Download Instructions -->
    <div class="agent-download-card">
      <div class="agent-section-step">
        <h3 class="agent-section-subtitle">Step 1: Download MLSphere Server for Your Platform</h3>
        <p class="agent-section-text">Select your operating system to download the desktop agent:</p>
        
        <div class="platform-downloads">
          <button @click="$emit('download-installer', 'mlsphere-agent-win-x64.exe')" class="platform-card windows-card">
            <div class="platform-icon-circle">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M0 3h10v10H0V3zm11 0h13v10H11V3zM0 14h10v10H0v-10zm11 0h13v10H11v-10z"/>
              </svg>
            </div>
            <div class="platform-details">
              <div class="platform-name">Windows</div>
              <div class="platform-size">33 MB</div>
            </div>
          </button>
          
          <button @click="$emit('download-installer', 'mlsphere-agent-macos-x64')" class="platform-card macos-card">
            <div class="platform-icon-circle">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.3-3.16-2.53-.87-1.36-1.78-3.53-1.88-5.15-.1-1.62.44-3.02 1.16-4.03C6.29 7.33 7.65 6.8 9.04 6.8c1.42 0 2.23.77 3.34.77 1.22 0 1.97-.76 3.3-.76 1.42 0 2.87.56 3.83 1.86-.77.53-1.55 1.29-1.66 2.3-.1.97.57 1.21 1.25 1.57-.58 1.36-1.5 2.46-2.59 3.19zM12 6.3c-.76-1.27-2.12-2.3-3.47-2.3-2.13 0-3.9 1.77-3.9 3.9 0 2.13 1.77 3.9 3.9 3.9 1.35 0 2.71-1.03 3.47-2.3z"/>
              </svg>
            </div>
            <div class="platform-details">
              <div class="platform-name">macOS Intel</div>
              <div class="platform-size">46 MB</div>
            </div>
          </button>
          
          <button @click="$emit('download-installer', 'mlsphere-agent-macos-arm64')" class="platform-card macos-card">
            <div class="platform-icon-circle">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.3-3.16-2.53-.87-1.36-1.78-3.53-1.88-5.15-.1-1.62.44-3.02 1.16-4.03C6.29 7.33 7.65 6.8 9.04 6.8c1.42 0 2.23.77 3.34.77 1.22 0 1.97-.76 3.3-.76 1.42 0 2.87.56 3.83 1.86-.77.53-1.55 1.29-1.66 2.3-.1.97.57 1.21 1.25 1.57-.58 1.36-1.5 2.46-2.59 3.19zM12 6.3c-.76-1.27-2.12-2.3-3.47-2.3-2.13 0-3.9 1.77-3.9 3.9 0 2.13 1.77 3.9 3.9 3.9 1.35 0 2.71-1.03 3.47-2.3z"/>
              </svg>
            </div>
            <div class="platform-details">
              <div class="platform-name">macOS ARM64</div>
              <div class="platform-size">40 MB</div>
            </div>
          </button>
          
          <button @click="$emit('download-installer', 'mlsphere-agent-linux-x64')" class="platform-card linux-card">
            <div class="platform-icon-circle">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15h-2v-6h2v6zm4 0h-2v-6h2v6zm4 0h-2v-6h2v6z"/>
              </svg>
            </div>
            <div class="platform-details">
              <div class="platform-name">Linux</div>
              <div class="platform-size">40 MB</div>
            </div>
          </button>
        </div>
      </div>

      <div class="agent-section-step">
        <h3 class="agent-section-subtitle">Step 2: Install & Run MLSphere Server</h3>
        <p class="agent-section-text">After downloading, install and start the MLSphere Server:</p>
        
        <div class="install-instructions" id="install-tabs">
          <div class="install-tabs-nav">
            <button class="install-tab-btn" :class="{ active: activeInstallTab === 'windows' }" @click="activeInstallTab = 'windows'">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M0 3h10v10H0V3zm11 0h13v10H11V3zM0 14h10v10H0v-10zm11 0h13v10H11v-10z"/>
              </svg>
              Windows
            </button>
            <button class="install-tab-btn" :class="{ active: activeInstallTab === 'macos' }" @click="activeInstallTab = 'macos'">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.3-3.16-2.53-.87-1.36-1.78-3.53-1.88-5.15-.1-1.62.44-3.02 1.16-4.03C6.29 7.33 7.65 6.8 9.04 6.8c1.42 0 2.23.77 3.34.77 1.22 0 1.97-.76 3.3-.76 1.42 0 2.87.56 3.83 1.86-.77.53-1.55 1.29-1.66 2.3-.1.97.57 1.21 1.25 1.57-.58 1.36-1.5 2.46-2.59 3.19zM12 6.3c-.76-1.27-2.12-2.3-3.47-2.3-2.13 0-3.9 1.77-3.9 3.9 0 2.13 1.77 3.9 3.9 3.9 1.35 0 2.71-1.03 3.47-2.3z"/>
              </svg>
              macOS
            </button>
            <button class="install-tab-btn" :class="{ active: activeInstallTab === 'linux' }" @click="activeInstallTab = 'linux'">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15h-2v-6h2v6zm4 0h-2v-6h2v6zm4 0h-2v-6h2v6z"/>
              </svg>
              Linux
            </button>
          </div>
          
          <div class="install-tabs-content">
            <div v-if="activeInstallTab === 'windows'" class="install-content">
              <p>1. Run the <code>.exe</code> file you downloaded</p>
              <p>2. Follow the installation prompts</p>
              <p>3. The agent will start automatically</p>
              <p>4. Check the system tray for the MLSphere Agent icon</p>
            </div>

            <div v-if="activeInstallTab === 'macos'" class="install-content">
              <p>1. Open Terminal in the download folder</p>
              <p>2. Run: <code>chmod +x mlsphere-agent-macos-*</code></p>
              <p>3. Run: <code>./mlsphere-agent-macos-*</code></p>
              <p>4. You'll see "Server running on http://127.0.0.1:51751"</p>
            </div>

            <div v-if="activeInstallTab === 'linux'" class="install-content">
              <p>1. Open Terminal in the download folder</p>
              <p>2. Run: <code>chmod +x mlsphere-agent-linux-*</code></p>
              <p>3. Run: <code>./mlsphere-agent-linux-*</code></p>
              <p>4. You'll see "Server running on http://127.0.0.1:51751"</p>
            </div>
          </div>
        </div>
      </div>

      <div class="agent-section-step">
        <h3 class="agent-section-subtitle">Step 3: Verify Connection</h3>
        <p class="agent-section-text">After starting the MLSphere Server, go to the <strong>Manage Server</strong> section (top right) to verify the connection and manage your server.</p>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'AgentSetup',
  props: {
    desktopAgentState: {
      type: String,
      default: 'checking'
    },
    lastCheckHint: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      activeInstallTab: 'windows'
    };
  },
  emits: ['download-installer']
};
</script>

<style scoped>
/* Agent setup styles will be inherited from dashboard.css */
</style>
