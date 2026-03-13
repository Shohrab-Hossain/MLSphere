<template>
  <div class="dashboard code-editor-view-wrapper">
    <code-editor-workspace
      :blocks="blocks"
      :project-type="projectType"
      :project-files="projectFiles"
      :block-catalog="blockCatalog"
      :project-id="projectId"
      :workspace-reload-token="workspaceReloadToken"
      @save-block-code="handleSaveBlockCode"
      @tree-files-changed="handleTreeFilesChanged"
    />
  </div>
</template>

<script>
import { mapState, mapMutations } from 'vuex';
import CodeEditorWorkspace from '../components/editor/CodeEditorWorkspace.vue';

export default {
  name: 'CodeEditorView',
  components: {
    CodeEditorWorkspace
  },
  data() {
    return {
      workspaceReloadToken: 0
    };
  },
  computed: {
    ...mapState({
      currentProject: 'currentProject'
    }),
    blocks() {
      return (this.currentProject.blocks || []).filter(b => b && b.id);
    },
    projectType() {
      return this.currentProject.type;
    },
    projectFiles() {
      return this.currentProject.pythonFiles || [];
    },
    blockCatalog() {
      return this.currentProject.config?.blockCatalog || [];
    },
    projectId() {
      return this.currentProject.id;
    }
  },
  methods: {
    ...mapMutations(['updateCurrentProjectFiles']),
    handleSaveBlockCode(payload) {
      this.$emit('save-block-code', payload);
    },
    handleTreeFilesChanged(files) {
      // Persist updated pythonFiles back to the Vuex store / project
      this.$emit('update-project-files', files);
      if (this.updateCurrentProjectFiles) {
        this.updateCurrentProjectFiles(files);
      }
    },
    reloadWorkspace() {
      this.workspaceReloadToken++;
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
.code-editor-view-wrapper {
  width: 100%;
  height: 100%;
}
</style>
