<template>
  <div class="toast-container">
    <transition-group name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="toast.type"
        @click="removeToast(toast.id)"
      >
        <span class="toast-icon">{{ toast.icon }}</span>
        <span class="toast-message">{{ toast.message }}</span>
      </div>
    </transition-group>
  </div>
</template>

<script>
export default {
  name: 'BaseNotificationModal',
  computed: {
    toasts() {
      return this.$store.state.ui.toasts;
    }
  },
  mounted() {
    window.addEventListener('mlsphere-notify', this.handleGlobalNotifyEvent);
  },
  beforeUnmount() {
    window.removeEventListener('mlsphere-notify', this.handleGlobalNotifyEvent);
  },
  methods: {
    removeToast(id) {
      this.$store.commit('ui/removeToast', id);
    },
    handleGlobalNotifyEvent(event) {
      const detail = event?.detail || {};
      const message = detail.message || '';
      if (!message) {
        return;
      }

      this.$store.dispatch('ui/showToast', {
        message,
        type: detail.type || 'info',
        duration: typeof detail.duration === 'number' ? detail.duration : 3000
      });
    }
  }
};
</script>
