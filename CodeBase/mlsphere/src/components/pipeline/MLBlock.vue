<template>
  <div 
    class="ml-block"
    :class="`status-${block.status}`"
    @click="$emit('select', block)"
  >
    <div class="block-glow"></div>
    
    <div class="block-header">
      <div class="header-gradient"></div>
      <div class="header-content">
        <span class="block-icon">{{ block.icon }}</span>
        <div class="header-text">
          <span class="block-title">{{ block.name }}</span>
          <span class="block-meta-row">
            <span class="block-category">{{ block.category }}</span>
            <span v-if="block.packages && block.packages.length" class="package-badge">
              📦 {{ block.packages.length }}
            </span>
          </span>
        </div>
        <button class="delete-btn" @click.stop="$emit('delete')" title="Delete block">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>
    
    <div class="block-body">
      <div class="block-io" v-if="(block.inputs && block.inputs.length > 0) || (block.outputs && block.outputs.length > 0)">
        <div class="io-section" v-if="block.inputs && block.inputs.length > 0">
          <div class="io-header">Inputs</div>
          <div class="io-ports">
            <div v-for="input in block.inputs" :key="input" class="io-port input">
              <span class="port-dot"></span>
              <span class="port-label">{{ input }}</span>
            </div>
          </div>
        </div>
        
        <div class="io-section" v-if="block.outputs && block.outputs.length > 0">
          <div class="io-header">Outputs</div>
          <div class="io-ports">
            <div v-for="output in block.outputs" :key="output" class="io-port output">
              <span class="port-label">{{ output }}</span>
              <span class="port-dot"></span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="block-actions">
        <button @click.stop="$emit('edit', block)" class="edit-btn">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M12.854 2.854a.5.5 0 00-.708 0L11 4l1 1 1.146-1.146a.5.5 0 000-.708l-.292-.292zM10 5L3 12v1h1l7-7-1-1z" fill="currentColor"/>
          </svg>
          <span>Edit Code</span>
        </button>
        <button @click.stop="$emit('run', block)" class="run-btn">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M5 3l8 5-8 5V3z" fill="currentColor"/>
          </svg>
          <span>Run</span>
        </button>
      </div>
    </div>
    
    <div v-if="block.status" class="block-status" :class="block.status">
      <span class="status-indicator"></span>
      {{ getStatusText(block.status) }}
    </div>

    <div v-if="block.output" class="block-output">
      <div class="output-header">
        <span class="output-label">Output</span>
        <button @click.stop="$emit('clear-output', block)" class="output-clear-btn" title="Clear output">✕</button>
      </div>
      <pre class="output-content">{{ block.output }}</pre>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MLBlock',
  props: {
    block: {
      type: Object,
      required: true
    }
  },
  methods: {
    getStatusText(status) {
      const statusMap = {
        running: 'Running...',
        success: 'Completed',
        error: 'Failed',
        idle: 'Ready'
      };
      return statusMap[status] || '';
    },
  }
};
</script>

<style scoped>
.ml-block {
  background: linear-gradient(160deg, color-mix(in srgb, var(--bg-elevated) 92%, white), var(--bg-elevated));
  backdrop-filter: blur(8px);
  border: 1px solid var(--border-color);
  border-radius: 18px;
  min-width: 260px;
  max-width: 280px;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.1);
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  margin: 10px;
  position: relative;
  overflow: hidden;
}

.ml-block.status-running {
  border-color: #FFC107;
  border-width: 2px;
  box-shadow: 0 0 20px rgba(255, 193, 7, 0.4), 0 10px 26px rgba(15, 23, 42, 0.1);
}

.ml-block.status-success {
  border-color: #4CAF50;
  background: linear-gradient(160deg, rgba(76, 175, 80, 0.08), var(--bg-elevated));
}

.ml-block.status-error {
  border-color: #F44336;
  background: linear-gradient(160deg, rgba(244, 67, 54, 0.08), var(--bg-elevated));
}

.ml-block::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 100%);
  pointer-events: none;
  border-radius: 18px;
}

.ml-block::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--border-strong) 65%, transparent);
  pointer-events: none;
  opacity: 0.55;
}

.ml-block:hover {
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.18);
  transform: translateY(-5px);
  border-color: var(--border-strong);
}

.block-glow {
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--text-muted) 26%, transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: -1;
}

.ml-block:hover .block-glow {
  opacity: 1;
}

.block-header {
  position: relative;
  overflow: hidden;
  border-radius: 18px 18px 0 0;
  padding: 0;
}

.header-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #333333;
  opacity: 0.9;
}

.header-content {
  position: relative;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 1;
}

.block-icon {
  font-size: 24px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
    font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif;
    line-height: 1;
}

.header-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.block-title {
  font-size: 15px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.3px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.block-category {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.block-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.package-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  padding: 2px 7px;
  letter-spacing: 0.2px;
}

.delete-btn {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.delete-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.08);
}

.block-body {
  padding: 16px 16px 14px;
}

.block-io {
  margin-bottom: 16px;
  background: color-mix(in srgb, var(--bg-secondary) 88%, transparent);
  border-radius: 12px;
  padding: 11px;
  border: 1px solid var(--border-color);
}

.io-section {
  margin-bottom: 12px;
}

.io-section:last-child {
  margin-bottom: 0;
}

.io-header {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.io-ports {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.io-port {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.io-port.input {
  justify-content: flex-start;
}

.io-port.output {
  justify-content: flex-end;
}

.port-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 8px color-mix(in srgb, currentColor 55%, transparent), inset 0 0 4px rgba(255,255,255,0.35);
  transition: all 0.2s ease;
}

.io-port:hover .port-dot {
  transform: scale(1.3);
  box-shadow: 0 0 12px color-mix(in srgb, currentColor 65%, transparent), inset 0 0 6px rgba(255,255,255,0.65);
}

.port-label {
  font-weight: 500;
  letter-spacing: 0.3px;
}

.block-actions {
  display: flex;
  gap: 8px;
}

.edit-btn, .run-btn {
  flex: 1;
  padding: 10px 12px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  letter-spacing: 0.3px;
}

.edit-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.edit-btn:hover {
  background: color-mix(in srgb, var(--bg-secondary) 72%, var(--border-color));
  border-color: var(--border-strong);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.14);
}

.run-btn {
  background: #3d3d3d;
  color: white;
  border: none;
  position: relative;
  overflow: hidden;
}

.run-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  transition: left 0.5s ease;
}

.run-btn:hover::before {
  left: 100%;
}

.run-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.28);
  background: #4a4a4a;
}

.block-status {
  padding: 10px 16px;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  border-top: 1px solid var(--border-color);
  backdrop-filter: blur(10px);
  border-radius: 0 0 18px 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.block-status.running {
  background: rgba(255, 193, 7, 0.12);
  color: #FFC107;
  border-color: rgba(255, 193, 7, 0.3);
  border-top: 2px solid #FFC107;
}

.block-status.running .status-indicator {
  background: #FFC107;
  animation: pulse 1.5s ease-in-out infinite;
  box-shadow: 0 0 12px rgba(255, 193, 7, 0.6);
}

.block-status.success {
  background: rgba(76, 175, 80, 0.12);
  color: #4CAF50;
  border-color: rgba(76, 175, 80, 0.3);
  border-top: 2px solid #4CAF50;
}

.block-status.success .status-indicator {
  background: #4CAF50;
  box-shadow: 0 0 12px rgba(76, 175, 80, 0.6);
}

.block-status.error {
  background: rgba(244, 67, 54, 0.12);
  color: #F44336;
  border-color: rgba(244, 67, 54, 0.3);
  border-top: 2px solid #F44336;
}

.block-status.error .status-indicator {
  background: #F44336;
  box-shadow: 0 0 12px rgba(244, 67, 54, 0.6);
}

.block-status.idle {
  background: color-mix(in srgb, var(--bg-secondary) 88%, var(--border-color));
  color: var(--text-secondary);
  border-color: var(--border-color);
}

.block-status.idle .status-indicator {
  background: var(--text-muted);
  box-shadow: none;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.2);
  }
}

/* Real-time output panel */
.block-output {
  border-top: 1px solid rgba(255,255,255,0.06);
  background: #0d1117;
  border-radius: 0 0 18px 18px;
  overflow: hidden;
}

.output-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: rgba(255,255,255,0.04);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.output-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255,255,255,0.4);
}

.output-clear-btn {
  background: none;
  border: none;
  color: rgba(255,255,255,0.3);
  cursor: pointer;
  font-size: 11px;
  padding: 0 2px;
  line-height: 1;
  transition: color 0.2s;
}

.output-clear-btn:hover {
  color: rgba(255,255,255,0.7);
}

.output-content {
  margin: 0;
  padding: 10px 12px;
  font-size: 11px;
  font-family: 'Consolas', 'Courier New', monospace;
  color: #a5f3a5;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 180px;
  overflow-y: auto;
  line-height: 1.5;
}

.status-error .output-content {
  color: #fca5a5;
}
</style>
