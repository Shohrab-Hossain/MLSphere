<template>
  <div v-if="visible" class="help-modal" @click.self="onClose">
    <div class="help-content">
      <h2>🎯 How to Use ML Block Builder</h2>
      
      <div class="help-section">
        <h3>1. Add Blocks</h3>
        <p>Drag blocks from the library or click to add them to the canvas</p>
      </div>
      
      <div class="help-section">
        <h3>2. Edit Code</h3>
        <p>Click "Edit Code" on any block to customize the Python code</p>
      </div>
      
      <div class="help-section">
        <h3>3. Build Pipeline</h3>
        <p>Arrange blocks in logical order: Data → Preprocessing → Model → Training → Evaluation</p>
      </div>
      
      <div class="help-section">
        <h3>4. Run & Analyze</h3>
        <p>Click "Run Pipeline" to execute. Watch real-time training metrics and charts</p>
      </div>
      
      <div class="help-section">
        <h3>5. Export</h3>
        <p>Save your pipeline as JSON for later use or sharing</p>
      </div>
      
      <button @click="onClose" class="close-help-btn">Ok</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HelpModal',
  props: {
    visible: {
      type: Boolean,
      default: false
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
  max-width: 600px;
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
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
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
