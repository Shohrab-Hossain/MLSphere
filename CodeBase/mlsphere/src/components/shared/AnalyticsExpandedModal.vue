<template>
  <div v-if="visible" class="analytics-expanded-modal" @click.self="onClose">
    <div class="analytics-expanded-content">
      <div class="analytics-expanded-header">
        <h3>Training Analytics - Detailed View</h3>
        <div class="analytics-expanded-actions">
          <button class="analytics-expanded-btn" @click="onOpenSidebar">Open Sidebar</button>
          <button class="analytics-expanded-btn close" @click="onClose">Close</button>
        </div>
      </div>
      <div class="analytics-expanded-body">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AnalyticsExpandedModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'open-sidebar'],
  methods: {
    onClose() {
      this.$emit('close');
    },
    onOpenSidebar() {
      this.$emit('open-sidebar');
    }
  }
};
</script>

<style scoped>
.analytics-expanded-modal {
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

.analytics-expanded-content {
  background: #1e1e1e;
  border-radius: 8px;
  width: 90%;
  height: 90%;
  display: flex;
  flex-direction: column;
  color: #e0e0e0;
}

.analytics-expanded-header {
  padding: 20px;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.analytics-expanded-header h3 {
  margin: 0;
  font-size: 18px;
}

.analytics-expanded-actions {
  display: flex;
  gap: 12px;
}

.analytics-expanded-btn {
  background: #2196f3;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.analytics-expanded-btn:hover {
  background: #1976d2;
}

.analytics-expanded-btn.close {
  background: #616161;
}

.analytics-expanded-btn.close:hover {
  background: #505050;
}

.analytics-expanded-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}
</style>
