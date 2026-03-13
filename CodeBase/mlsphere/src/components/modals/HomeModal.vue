<template>
  <div v-if="visible" class="home-modal" @click.self="onCancel">
    <div class="home-content">
      <h2>Return to Dashboard?</h2>
      <p>{{ message }}</p>
      <div class="home-actions">
        <button v-if="mode === 'confirm'" class="home-action-btn ghost" @click="onConfirm">Yes, go home</button>
        <button v-if="mode === 'unsaved'" class="home-action-btn primary" @click="onConfirm">Yes, save & go</button>
        <button class="home-action-btn secondary" @click="onCancel">No, stay</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HomeModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    mode: {
      type: String,
      default: 'confirm',
      validator: (value) => ['confirm', 'unsaved'].includes(value)
    }
  },
  computed: {
    message() {
      return this.mode === 'unsaved'
        ? 'Workspace has unsaved changes. Save before leaving.'
        : 'No unsaved changes detected. Return to dashboard?';
    }
  },
  emits: ['confirm', 'cancel'],
  methods: {
    onConfirm() {
      this.$emit('confirm');
    },
    onCancel() {
      this.$emit('cancel');
    }
  }
};
</script>

<style scoped>
.home-modal {
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

.home-content {
  background: #1e1e1e;
  border-radius: 8px;
  padding: 32px;
  max-width: 400px;
  color: #e0e0e0;
}

.home-content h2 {
  margin: 0 0 16px 0;
  font-size: 20px;
}

.home-content p {
  margin: 0 0 24px 0;
  font-size: 14px;
  line-height: 1.5;
}

.home-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.home-action-btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.home-action-btn.ghost {
  background: transparent;
  color: #64b5f6;
  border: 1px solid #64b5f6;
}

.home-action-btn.ghost:hover {
  background: rgba(100, 181, 246, 0.1);
}

.home-action-btn.primary {
  background: #2196f3;
  color: white;
}

.home-action-btn.primary:hover {
  background: #1976d2;
}

.home-action-btn.secondary {
  background: #616161;
  color: white;
}

.home-action-btn.secondary:hover {
  background: #505050;
}
</style>
