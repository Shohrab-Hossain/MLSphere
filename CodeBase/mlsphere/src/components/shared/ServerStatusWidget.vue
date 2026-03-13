<template>
  <div class="server-status-widget" @click="showInfo = !showInfo">
    <span class="status-dot" :class="desktopAgentState"></span>
    <span class="agent-label">Server: <span class="agent-status-text" :class="desktopAgentState">{{ desktopAgentLabel }}</span></span>
    <div v-if="showInfo" class="server-info-dropdown">
      <div class="server-info-row">
        <span class="info-label">Status:</span>
        <span class="info-value" :class="desktopAgentState">{{ desktopAgentLabel }}</span>
      </div>
      <div class="server-info-row">
        <span class="info-label">Host:</span>
        <span class="info-value" :class="desktopAgentState">{{ desktopAgentHostPort.split(':')[0] || '127.0.0.1' }}</span>
      </div>
      <div class="server-info-row">
        <span class="info-label">Port:</span>
        <span class="info-value" :class="desktopAgentState">{{ desktopAgentState !== 'online' ? 'N/A' : (desktopAgentHostPort.split(':')[1] || '51751') }}</span>
      </div>
      <div class="server-info-row">
        <button @click.stop="showServerManagementModal = true" class="server-manage-btn" title="Open server management">
          Manage Server
        </button>
      </div>
    </div>
    <ServerManagementModal
      :show="showServerManagementModal"
      :close="closeServerManagementModal"
      :desktopAgentState="desktopAgentState"
      :desktopAgentLabel="desktopAgentLabel"
      :desktopAgentHostPort="desktopAgentHostPort"
    />
  </div>
</template>
<script>
import ServerManagementModal from '../modals/ServerManagementModal.vue';
export default {
  name: 'ServerStatusWidget',
  components: { ServerManagementModal },
  props: {
    desktopAgentState: {
      type: String,
      default: 'offline'
    },
    desktopAgentLabel: {
      type: String,
      default: 'Offline'
    },
    desktopAgentHostPort: {
      type: String,
      default: '127.0.0.1:51751'
    }
  },
  data() {
    return {
      showInfo: false,
      showServerManagementModal: false
    };
  },
  methods: {
    closeServerManagementModal() {
      this.showServerManagementModal = false;
    }
  }
};
</script>
<style scoped>
.server-status-widget {
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
}
.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 8px;
  background: #ccc;
}
.status-dot.online {
  background: #4caf50;
}
.status-dot.offline {
  background: #f44336;
}
.status-dot.checking {
  background: #ff9800;
}
.agent-label {
  font-weight: 500;
}
.server-info-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  padding: 1rem;
  z-index: 100;
  min-width: 220px;
}
.server-info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.server-manage-btn {
  background: #4a90e2;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-weight: 600;
}
.server-manage-btn:hover {
  background: #357ab8;
}
</style>
