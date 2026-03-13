<template>
  <div v-if="show" class="server-management-modal" @click.self="close">
    <div class="server-management-modal-content">
      <div class="modal-header">
        <div class="header-content">
          <h2>🖥️ MLSphere Server</h2>
          <p class="header-subtitle">Manage your local development server</p>
        </div>
        <button class="modal-close-btn" @click="close" title="Close">✕</button>
      </div>
      <div class="status-hero">
        <div class="status-card" :class="desktopAgentState">
          <div class="status-indicator">
            <span class="status-dot"></span>
            <span class="status-label">{{ desktopAgentLabel }}</span>
          </div>
          <div class="status-details">
            <div class="status-detail-item">
              <span class="detail-label">Host</span>
              <span class="detail-value">{{ desktopAgentHostPort.split(':')[0] || '127.0.0.1' }}</span>
            </div>
            <div class="status-detail-item">
              <span class="detail-label">Port</span>
              <span class="detail-value">{{ desktopAgentState !== 'online' ? 'N/A' : (desktopAgentHostPort.split(':')[1] || '51751') }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-tabs">
        <button class="tab-btn" :class="{ active: activeTab === 'available-ports' }" @click="activeTab = 'available-ports'">
          <span class="tab-icon">◉</span>
          <span class="tab-text">Available Ports</span>
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'custom-port' }" @click="activeTab = 'custom-port'">
          <span class="tab-icon">⚙</span>
          <span class="tab-text">Custom Port</span>
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'troubleshoot' }" @click="activeTab = 'troubleshoot'">
          <span class="tab-icon">🛠️</span>
          <span class="tab-text">Troubleshoot</span>
        </button>
      </div>
      <div class="server-management-content">
        <div v-if="activeTab === 'available-ports'">
          <div class="content-header">
            <div>
              <h3>◉ Available Ports</h3>
              <p class="content-description">Detected MLSphere Servers on your machine</p>
            </div>
            <button class="rescan-btn" @click="rescanAvailablePorts" :disabled="availablePortsLoading || connectingPort !== null">
              <span v-if="availablePortsLoading">⟳ Scanning...</span>
              <span v-else>⟳ Rescan</span>
            </button>
          </div>
          <div class="available-ports-list">
            <div v-if="availablePortsLoading && availableServerPorts.length === 0" class="available-port-empty">
              <span class="empty-icon">⏳</span>
              <span>Scanning ports...</span>
            </div>
            <div v-else-if="!availablePortsLoading && availableServerPorts.length === 0" class="available-port-empty">
              <span class="empty-icon">⚠️</span>
              <span>No port is serving MLSphere Server. Try Custom Port or Troubleshoot.</span>
            </div>
            <div v-else v-for="server in availableServerPorts" :key="server.port" class="available-port-item">
              <div class="port-item-left">
                <span class="port-icon">🌐</span>
                <div class="port-info">
                  <div class="port-number-row">
                    <span class="port-label">Port</span>
                    <span class="port-number-value">{{ server.port }}</span>
                  </div>
                  <span class="port-status" v-if="effectiveConnectedPort === server.port">
                    <span class="port-status-dot"></span>
                    Connected
                  </span>
                </div>
              </div>
              <button v-if="effectiveConnectedPort !== server.port" class="port-connect-btn" @click="connectToDetectedPort(server.port)" :disabled="connectingPort !== null">
                <span v-if="connectingPort === server.port">Connecting...</span>
                <span v-else>Connect</span>
              </button>
            </div>
          </div>
          <div v-if="availablePortsError" class="port-feedback error">
            <span class="feedback-icon">❌</span>
            <span>{{ availablePortsError }}</span>
          </div>
          <div v-if="availablePortsSuccess" class="port-feedback success">
            <span class="feedback-icon">✅</span>
            <span>{{ availablePortsSuccess }}</span>
          </div>
        </div>
        <div v-if="activeTab === 'custom-port'">
          <div class="content-header">
            <div>
              <h3>⚙ Custom Port</h3>
              <p class="content-description">Connect to a server on a specific port</p>
            </div>
          </div>
          <div class="custom-port-card">
            <label class="input-label">Port Number</label>
            <div class="port-input-group">
              <input type="number" v-model.number="customPortValue" placeholder="Enter port (1024-65535)" class="port-input" min="1024" max="65535" @keyup.enter="connectToCustomPort" />
              <button @click="connectToCustomPort" class="port-connect-btn primary" :disabled="customPortConnecting || !customPortValue || customPortValue < 1024 || customPortValue > 65535 || customPortValue === effectiveConnectedPort">
                <span v-if="customPortConnecting">⏳ Connecting...</span>
                <span v-else-if="customPortValue === effectiveConnectedPort">Connected</span>
                <span v-else>Connect</span>
              </button>
            </div>
            <p class="input-hint">ℹ️ Valid range: 1024-65535</p>
            <div v-if="customPortError" class="port-feedback error">
              <span class="feedback-icon">❌</span>
              <span>{{ customPortError }}</span>
            </div>
            <div v-if="customPortSuccess" class="port-feedback success">
              <span class="feedback-icon">✅</span>
              <span>{{ customPortSuccess }}</span>
            </div>
          </div>
          <div class="info-card">
            <div class="info-card-header">
              <span class="info-icon">ℹ️</span>
              <strong>When to use custom ports</strong>
            </div>
            <ul class="info-list">
              <li>Default port (51751) is already in use</li>
              <li>Running multiple server instances</li>
              <li>Corporate firewall requires specific ports</li>
            </ul>
          </div>
        </div>
        <div v-if="activeTab === 'troubleshoot'">
          <div class="content-header">
            <div>
              <h3>🛠️ Troubleshooting</h3>
              <p class="content-description">Common issues and solutions</p>
            </div>
          </div>
          <div class="server-actions">
            <button @click="checkServerStatus" class="hero-action-btn" :disabled="checkingStatus" :title="checkingStatus ? 'Checking server status...' : 'Check if server is running'">
              <span v-if="checkingStatus">⏳ Checking...</span>
              <span v-else>🔍 Check Status</span>
            </button>
            <button v-if="desktopAgentState === 'online'" @click="restartServer" class="hero-action-btn warning" :disabled="desktopAgentRestarting" :title="desktopAgentRestarting ? 'Restarting...' : 'Restart server'">
              <span v-if="!desktopAgentRestarting">🔄 Restart</span>
              <span v-else>⏳ Restarting...</span>
            </button>
            <div v-if="troubleshootFeedbackMessage" class="port-feedback" :class="troubleshootFeedbackType">
              <span class="feedback-icon">{{ troubleshootFeedbackIcon }}</span>
              <span>{{ troubleshootFeedbackMessage }}</span>
            </div>
          </div>
          <div class="instruction-card">
            <div class="instruction-header">
              <span class="instruction-icon">🧾</span>
              <strong>Starting server with custom port</strong>
            </div>
            <div class="code-examples">
              <div class="code-example">
                <span class="code-platform">Windows</span>
                <code>mlsphere-agent-win-x64.exe --port 54000</code>
              </div>
              <div class="code-example">
                <span class="code-platform">macOS/Linux</span>
                <code>./mlsphere-agent --port 54000</code>
              </div>
              <div class="code-example">
                <span class="code-platform">Node.js</span>
                <code>node server.js --port 54000</code>
              </div>
            </div>
          </div>
          <div class="troubleshooting-grid">
            <div class="troubleshooting-card">
              <div class="trouble-icon">❌</div>
              <strong>Server shows offline</strong>
              <p>Make sure you've downloaded and started the server. Check if another application is using the port.</p>
            </div>
            <div class="troubleshooting-card">
              <div class="trouble-icon">⚠️</div>
              <strong>Port already in use</strong>
              <p>Start server with custom port using <code>--port</code> flag, then connect to that port above.</p>
            </div>
            <div class="troubleshooting-card">
              <div class="trouble-icon">🔍</div>
              <strong>Can't find correct port</strong>
              <p>Browser smartly scans active ports on your machine. For ports outside the default range, use custom port input.</p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-action-btn" @click="close">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { mapState, mapGetters } from 'vuex';
import { discoverAvailableServerPorts, verifyServerPort } from '../../services/agent/desktopAgentClient';
export default {
  name: 'ServerManagementModal',
  props: {
    show: Boolean,
    close: Function
  },
  computed: {
    ...mapState('agent', {
      desktopAgentState: 'state',
      desktopAgentRestarting: 'restarting',
      desktopAgentHostPort: 'hostPort',
      desktopAgentInstalled: 'installed'
    }),
    ...mapGetters('agent', {
      desktopAgentLabel: 'label',
      desktopAgentTooltip: 'tooltip',
      desktopAgentActionLabel: 'actionLabel',
      desktopAgentActionTitle: 'actionTitle'
    }),
    effectiveConnectedPort() {
      if (this.lastConnectedPort !== null) {
        return this.lastConnectedPort;
      }
      if (this.desktopAgentState !== 'online') {
        return null;
      }
      const parsed = parseInt((this.desktopAgentHostPort || '').split(':')[1], 10);
      return Number.isInteger(parsed) ? parsed : null;
    },
    troubleshootFeedbackIcon() {
      if (this.troubleshootFeedbackType === 'success') return '✅';
      if (this.troubleshootFeedbackType === 'error') return '❌';
      return 'ℹ️';
    }
  },
  data() {
    return {
      activeTab: 'available-ports',
      availableServerPorts: [],
      availablePortsLoading: false,
      availablePortsError: '',
      availablePortsSuccess: '',
      connectingPort: null,
      lastConnectedPort: null,
      customPortConnecting: false,
      customPortVerified: null,
      customPortValue: null,
      customPortError: '',
      customPortSuccess: '',
      troubleshootFeedbackMessage: '',
      troubleshootFeedbackType: 'info',
      troubleshootFeedbackTimer: null,
      checkingStatus: false,
      pendingStatusCheck: false,
      pendingRestartAction: false
    };
  },
  methods: {
    async rescanAvailablePorts() {
      if (this.availablePortsLoading || this.connectingPort !== null) return;
      this.availablePortsLoading = true;
      this.availablePortsError = '';
      this.availablePortsSuccess = '';
      try {
        const currentPort = parseInt(this.desktopAgentHostPort.split(':')[1], 10);
        const customPorts = [];
        if (this.customPortValue) customPorts.push(this.customPortValue);
        if (currentPort) customPorts.push(currentPort);
        const result = await discoverAvailableServerPorts(customPorts);
        this.availableServerPorts = result.mlsphereServers.sort((a, b) => a.port - b.port);
        if (this.availableServerPorts.length > 0) {
          this.availablePortsSuccess = `Found ${this.availableServerPorts.length} MLSphere Server port${this.availableServerPorts.length > 1 ? 's' : ''}.`;
          setTimeout(() => { this.availablePortsSuccess = ''; }, 3000);
        } else {
          this.availablePortsSuccess = '';
          this.availablePortsError = 'No port is serving MLSphere Server.';
          setTimeout(() => { this.availablePortsError = ''; }, 3000);
        }
      } catch (error) {
        this.availableServerPorts = [];
        this.availablePortsError = error?.message || 'Unable to rescan available ports.';
        setTimeout(() => { this.availablePortsError = ''; }, 3000);
      } finally {
        this.availablePortsLoading = false;
      }
    },
    async connectToDetectedPort(port) {
      if (!port || this.connectingPort !== null) return;
      this.connectingPort = port;
      this.availablePortsError = '';
      this.availablePortsSuccess = `Checking MLSphere Server on port ${port}...`;
      try {
        const verified = await verifyServerPort(port);
        if (!verified) throw new Error(`Port ${port} is not serving MLSphere.`);
        this.lastConnectedPort = port;
        this.availablePortsSuccess = `Connected to MLSphere on port ${port}.`;
        setTimeout(() => { this.lastConnectedPort = null; }, 1000);
      } catch (error) {
        this.availablePortsError = error?.message || `Failed to connect to port ${port}.`;
        this.availablePortsSuccess = '';
        this.lastConnectedPort = null;
      } finally {
        this.connectingPort = null;
      }
    },
    async connectToCustomPort() {
      if (!this.customPortValue || this.customPortValue < 1024 || this.customPortValue > 65535) {
        this.customPortError = 'Please enter a valid port number (1024-65535)';
        this.customPortSuccess = '';
        setTimeout(() => { this.customPortError = ''; }, 3000);
        return;
      }
      if (this.customPortConnecting) return;
      this.customPortConnecting = true;
      this.customPortError = '';
      this.customPortSuccess = `Checking MLSphere Server on port ${this.customPortValue}...`;
      try {
        const verified = await verifyServerPort(this.customPortValue);
        if (!verified) throw new Error(`Port ${this.customPortValue} is not serving MLSphere.`);
        this.customPortVerified = this.customPortValue;
        this.lastConnectedPort = this.customPortValue;
        this.customPortSuccess = `Connected to MLSphere on port ${this.customPortValue}.`;
        this.availablePortsSuccess = this.customPortSuccess;
        this.availablePortsError = '';
        setTimeout(() => { this.lastConnectedPort = null; }, 1000);
        setTimeout(() => { this.customPortSuccess = ''; }, 3000);
      } catch (error) {
        this.customPortError = error?.message || 'Unable to connect to this custom port.';
        this.customPortSuccess = '';
        this.lastConnectedPort = null;
        setTimeout(() => { this.customPortError = ''; }, 3000);
      } finally {
        this.customPortConnecting = false;
      }
    },
    setTroubleshootFeedback(type, message, duration = 3500) {
      if (this.troubleshootFeedbackTimer) {
        clearTimeout(this.troubleshootFeedbackTimer);
        this.troubleshootFeedbackTimer = null;
      }
      this.troubleshootFeedbackType = type;
      this.troubleshootFeedbackMessage = message;
      if (duration > 0) {
        this.troubleshootFeedbackTimer = setTimeout(() => {
          this.troubleshootFeedbackMessage = '';
          this.troubleshootFeedbackTimer = null;
        }, duration);
      }
    },
    checkServerStatus() {
      this.checkingStatus = true;
      this.pendingStatusCheck = true;
      this.setTroubleshootFeedback('info', 'Checking server status...', 0);
      setTimeout(() => {
        if (this.pendingStatusCheck) {
          this.pendingStatusCheck = false;
          this.checkingStatus = false;
          this.setTroubleshootFeedback('error', 'Status check timed out. Please try again.', 4500);
        }
      }, 5000);
    },
    restartServer() {
      this.pendingRestartAction = true;
      this.setTroubleshootFeedback('info', 'Sending restart request...', 0);
    }
  }
};
</script>
<style scoped>
.server-management-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 16px;
  backdrop-filter: blur(8px);
}
.server-management-modal-content {
  max-width: 100%;
  border-radius: 12px;
  background: #fff;
  padding: 2rem;
}
</style>
