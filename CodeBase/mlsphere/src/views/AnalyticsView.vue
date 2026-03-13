<template>
  <div class="dashboard analytics-full-page">
    <div class="analytics-full-header">
      <h2>📊 Training Analytics</h2>
      <button @click="goToPipeline" class="analytics-close-btn" title="Return to Pipeline">⬅ Back to Pipeline</button>
    </div>
    <div class="analytics-full-body">
      <training-panel
        ref="trainingPanelFullPage"
        :project-key="projectKey"
      />
    </div>
  </div>
</template>

<script>
import { defineAsyncComponent } from 'vue';
import { mapState } from 'vuex';

const TrainingPanel = defineAsyncComponent(() => import('@/blocks/AnalyticsBlock/components/TrainingPanel.vue'));

export default {
  name: 'AnalyticsView',
  components: {
    TrainingPanel
  },
  computed: {
    ...mapState({
      currentProject: 'currentProject'
    }),
    projectKey() {
      return `mlblock_analytics_${this.currentProject.id || 'default'}`;
    }
  },
  methods: {
    goToPipeline() {
      this.$router.push({ name: 'pipeline' });
    }
  }
};
</script>

<style scoped>
 .dashboard {
  min-height: 100vh;
  width: 100%;
  display: block;
  background: linear-gradient(135deg, #1a1a1a 0%, #252525 100%);
  color: #e0e0e0;
  overflow-y: visible;
  padding-top: 70px;
  padding-bottom: 2rem;
}
.analytics-full-page {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.analytics-full-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: #2a2a2a;
  border-bottom: 1px solid #3a3a3a;
}

.analytics-full-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #e0e0e0;
}

.analytics-close-btn {
  padding: 0.5rem 1rem;
  background: #3a7bc8;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.analytics-close-btn:hover {
  background: #2d5fa1;
}

.analytics-full-body {
  flex: 1;
  overflow: auto;
  padding: 1rem;
}
</style>
