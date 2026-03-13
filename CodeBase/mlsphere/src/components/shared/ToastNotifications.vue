<template>
  <div class="toast-container">
    <transition-group name="toast">
      <div 
        v-for="toast in toasts" 
        :key="toast.id" 
        class="toast" 
        :class="toast.type"
        @click="onRemoveToast(toast.id)"
      >
        <span class="toast-icon">{{ toast.icon }}</span>
        <span class="toast-message">{{ toast.message }}</span>
      </div>
    </transition-group>
  </div>
</template>

<script>
export default {
  name: 'ToastNotifications',
  props: {
    toasts: {
      type: Array,
      default: () => []
    }
  },
  emits: ['remove-toast'],
  methods: {
    onRemoveToast(id) {
      this.$emit('remove-toast', id);
    }
  }
};
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 2000;
  pointer-events: none;
}

.toast {
  background: #2d2d2d;
  color: #e0e0e0;
  padding: 12px 16px;
  border-radius: 4px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  pointer-events: auto;
  transition: all 0.3s ease;
}

.toast:hover {
  background: #3d3d3d;
}

.toast-icon {
  font-size: 16px;
}

.toast-message {
  font-size: 14px;
}

.toast.success {
  border-left: 3px solid #4caf50;
}

.toast.error {
  border-left: 3px solid #f44336;
}

.toast.warning {
  border-left: 3px solid #ff9800;
}

.toast.info {
  border-left: 3px solid #2196f3;
}

.toast-enter-active, .toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
