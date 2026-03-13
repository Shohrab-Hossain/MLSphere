<template>
  <div class="dashboard pipeline-view">
    <!-- Left Sidebar: Block Library -->
    <div v-show="showLeftSidebar" class="sidebar-shell left-sidebar-shell">
      <div class="sidebar-shell-header">
        <button class="sidebar-close-btn" @click="closeLeftSidebar" title="Close block library">✕</button>
      </div>
      <block-library
        :current-project="currentProject"
        @add-block="$emit('add-block', $event)"
        @clear-all="$emit('clear-canvas')"
        @export-pipeline="$emit('export-pipeline')"
      />
    </div>

    <!-- Center: Pipeline Canvas -->
    <pipeline-canvas
      ref="canvas"
      :current-project="currentProject"
      @edit-block="$emit('edit-block', $event)"
      @block-selected="$emit('block-selected', $event)"
      @pipeline-started="$emit('pipeline-started', $event)"
      @block-started="$emit('block-started', $event)"
      @block-executed="$emit('block-executed', $event)"
      @pipeline-completed="$emit('pipeline-completed', $event)"
      @pipeline-failed="$emit('pipeline-failed', $event)"
    />

    <!-- Right Sidebar: Training Analytics -->
    <div v-show="showRightSidebar" class="sidebar-shell right-sidebar-shell">
      <div class="sidebar-shell-header">
        <button class="sidebar-close-btn" @click="closeRightSidebar" title="Close training analytics">✕</button>
      </div>
      <training-panel
        ref="trainingPanelSidebar"
        :project-key="projectKey"
      />
    </div>

    <!-- Floating Toggles -->
    <button
      v-if="!showLeftSidebar"
      class="floating-sidebar-toggle left"
      @click="openLeftSidebar"
      title="Open block library"
    >
      🧩
    </button>

    <button
      v-if="!showRightSidebar && !showAnalyticsExpanded"
      class="floating-sidebar-toggle right"
      @click="openRightSidebar"
      title="Open training analytics"
    >
      📊
    </button>
  </div>
</template>

<script>
import { defineAsyncComponent } from 'vue';
import BlockLibrary from '../components/pipeline/BlockLibrary.vue';
import PipelineCanvas from '../components/pipeline/PipelineCanvas.vue';

const TrainingPanel = defineAsyncComponent(() => import('@/blocks/AnalyticsBlock/components/TrainingPanel.vue'));

export default {
  name: 'PipelineView',
  components: {
    BlockLibrary,
    PipelineCanvas,
    TrainingPanel
  },
  props: {
    currentProject: {
      type: Object,
      required: true
    },
    projectKey: {
      type: String,
      required: true
    },
    showLeftSidebar: {
      type: Boolean,
      default: true
    },
    showRightSidebar: {
      type: Boolean,
      default: false
    },
    showAnalyticsExpanded: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'add-block',
    'clear-canvas',
    'export-pipeline',
    'edit-block',
    'block-selected',
    'pipeline-started',
    'block-started',
    'block-executed',
    'pipeline-completed',
    'pipeline-failed',
    'update:showLeftSidebar',
    'update:showRightSidebar'
  ],
  methods: {
    getCanvasRef() {
      return this.$refs.canvas || null;
    },
    getSidebarTrainingPanel() {
      return this.$refs.trainingPanelSidebar || null;
    },
    clearAll() {
      this.$refs.canvas?.clearAll();
    },
    addBlock(block) {
      this.$refs.canvas?.addBlock(block);
    },
    runPipeline() {
      this.$refs.canvas?.runPipeline();
    },
    validatePipeline() {
      this.$refs.canvas?.validatePipeline();
    },
    exportPipeline() {
      this.$refs.canvas?.exportPipeline();
    },
    openLeftSidebar() {
      this.$emit('update:showLeftSidebar', true);
    },
    closeLeftSidebar() {
      this.$emit('update:showLeftSidebar', false);
    },
    openRightSidebar() {
      this.$emit('update:showRightSidebar', true);
    },
    closeRightSidebar() {
      this.$emit('update:showRightSidebar', false);
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
.pipeline-view {
  display: flex;
  flex: 1;
  overflow: hidden;
  width: 100%;
  align-items: stretch;
  position: relative;
}
.right-sidebar-shell {
  border-left: 1px solid #404040;
}
</style>
