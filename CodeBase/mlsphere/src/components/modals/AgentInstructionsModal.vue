<template>
  <div v-if="visible" class="help-modal" @click.self="onClose">
    <div class="help-content agent-instructions-content">
      <h2>🖥 Desktop Agent Setup (Development Mode)</h2>
      
      <div class="help-section">
        <h3>📂 Agent Location</h3>
        <p>The agent is already in your codebase at: <code>desktop-agent/server.js</code></p>
      </div>
      
      <div class="help-section">
        <h3>✨ Option 1: Auto-Start (Recommended)</h3>
        <p>Open a terminal in your project root and run:</p>
        <div class="code-block">npm run serve</div>
        <p>This automatically starts both the agent and web app.</p>
      </div>
      
      <div class="help-section">
        <h3>🔧 Option 2: Manual Start</h3>
        <p>1. Open a terminal in your project root</p>
        <p>2. Run: <code>node desktop-agent/server.js</code></p>
        <p>3. Keep it running in the background</p>
        <p>4. Refresh this browser</p>
      </div>
      
      <div class="help-section">
        <h3>🔌 Connection Info</h3>
        <p>The agent should connect automatically to: <strong>{{ connectionInfo }}</strong></p>
      </div>
      
      <button @click="onClose" class="close-help-btn">Got it!</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AgentInstructionsModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    desktopAgentState: {
      type: String,
      default: 'offline'
    },
    desktopAgentHostPort: {
      type: String,
      default: 'N/A'
    }
  },
  computed: {
    connectionInfo() {
      return this.desktopAgentState !== 'online' ? 'N/A' : this.desktopAgentHostPort;
    }
  },
  emits: ['close'],
  methods: {
    onClose() {
      this.$emit('close');
    }
  }
};
</script>

<style scoped>
.help-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.help-content {
  background: #1e1e1e;
  border-radius: 8px;
  padding: 32px;
  max-width: 700px;
  max-height: 80vh;
  overflow-y: auto;
  color: #e0e0e0;
}

.help-content h2 {
  margin: 0 0 24px 0;
  font-size: 24px;
}

.help-section {
  margin-bottom: 20px;
}

.help-section h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #64b5f6;
}

.help-section p {
  margin: 0 0 8px 0;
  font-size: 14px;
  line-height: 1.5;
}

.help-section code {
  background: #2d2d2d;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}

.code-block {
  background: #2d2d2d;
  padding: 12px;
  border-radius: 4px;
  margin: 8px 0;
  font-family: 'Courier New', monospace;
  overflow-x: auto;
}

.close-help-btn {
  background: #2196f3;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 20px;
}

.close-help-btn:hover {
  background: #1976d2;
}
</style>
