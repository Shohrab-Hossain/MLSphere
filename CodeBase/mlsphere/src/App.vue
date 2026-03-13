<template>
  <div id="app" :class="'view-' + currentView">
    <!-- Global Navbar - Always visible; hides on homepage until scroll -->
    <BaseNavbar
      :desktopAgentState="desktopAgentState"
      :desktopAgentLabel="desktopAgentLabel"
      :desktopAgentHostPort="desktopAgentHostPort"
      :currentView="currentView"
      :projectName="currentProject.name || ''"
      :isPipelineRunning="isPipelineRunning"
      :currentProjectType="currentProject.type || ''"
      @open-server-modal="showAgentInstructionsModal = true"
      @navigate="handleNavbarNavigate"
      @run-pipeline="runPipeline"
      @save-project="persistCurrentWorkflow"
      @clear-canvas="clearCanvas"
      @open-catalog="openCatalogEditor"
      @reimport-files="reimportUploadedFiles"
      @go-home="goToDashboard"
    />
    
    <div class="app-container" :class="{ 'sidebars-hidden': !showLeftSidebar && !showRightSidebar }">
      <router-view
        @restart-agent="startOrRestartDesktopAgentFromUI"
        @download-agent="downloadDesktopAgentFromUI"
        @agent-installed="markDesktopAgentInstalled"
        @refresh-agent-status="refreshDesktopAgentStatus"
        @port-changed="handlePortChange"
        @project-selected="handleProjectSelected"
        @add-block="addBlockToCanvas"
        @clear-canvas="clearCanvas"
        @export-pipeline="exportPipeline"
        @edit-block="openCodeEditor"
        @block-selected="onBlockSelected"
        @pipeline-started="onPipelineStarted"
        @block-started="onBlockStarted"
        @block-executed="onBlockExecuted"
        @pipeline-completed="onPipelineCompleted"
        @pipeline-failed="onPipelineFailed"
        @update:showLeftSidebar="showLeftSidebar = $event"
        @update:showRightSidebar="showRightSidebar = $event"
        @save-block-code="saveBlockCodeFromWorkspace"
        :current-project="currentProject"
        :project-key="getTrainingProjectKey()"
        :show-left-sidebar="showLeftSidebar"
        :show-right-sidebar="showRightSidebar"
        :show-analytics-expanded="showAnalyticsExpanded"
      />
    </div>

    <code-editor
      v-if="showEditor"
      :visible="showEditor"
      :block="selectedBlock"
      @close="showEditor = false"
      @save="saveBlockCode"
    />
    
    <div v-if="showAgentInstructionsModal" class="help-modal" @click.self="showAgentInstructionsModal = false">
      <div class="help-content agent-instructions-content">
        <h2>🖥 Desktop Agent Setup (Development Mode)</h2>
        
        <div class="help-section">
          <h3>📂 Agent Location</h3>
          <p>The agent is already in your codebase at: <code>local-server/CodeBase/Local Server/server.js</code></p>
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
          <p>2. Run: <code>node "local-server/CodeBase/Local Server/server.js"</code></p>
          <p>3. Keep it running in the background</p>
          <p>4. Refresh this browser</p>
        </div>
        
        <div class="help-section">
          <h3>🔌 Connection Info</h3>
          <p>The agent should connect automatically to: <strong>{{ desktopAgentState !== 'online' ? 'N/A' : desktopAgentHostPort }}</strong></p>
        </div>
        
        <button @click="showAgentInstructionsModal = false" class="close-help-btn">Got it!</button>
      </div>
    </div>

    <div v-if="showHelpModal" class="help-modal" @click.self="showHelpModal = false">
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
        
        <button @click="showHelpModal = false" class="close-help-btn">Ok</button>
      </div>
    </div>

    <div v-if="showHomeModal" class="home-modal" @click.self="cancelGoHome">
      <div class="home-content">
        <h2>Return to Dashboard?</h2>
        <p>{{ homeModalMode === 'unsaved' ? 'Workspace has unsaved changes. Save before leaving.' : 'No unsaved changes detected. Return to dashboard?' }}</p>
        <div class="home-actions">
          <button v-if="homeModalMode === 'confirm'" class="home-action-btn ghost" @click="goHomeDirectly">Yes, go home</button>
          <button v-if="homeModalMode === 'unsaved'" class="home-action-btn primary" @click="saveAndGoHome">Yes, save & go</button>
          <button class="home-action-btn secondary" @click="cancelGoHome">No, stay</button>
        </div>
      </div>
    </div>

    <div v-if="showCatalogEditor" class="catalog-modal" @click.self="closeCatalogEditor">
      <div class="catalog-content">
        <div class="catalog-header">
          <h2>Catalog Mapping</h2>
          <button class="catalog-close-btn" @click="closeCatalogEditor">✕</button>
        </div>
        <p class="catalog-subtitle">Map package names to block names and sections for this project.</p>

        <div class="catalog-unmapped" v-if="availablePackages.length > 0">
          <h3>Unmapped Packages</h3>
          <p>These packages are loaded from your folder but are not blocks yet.</p>
          <div class="catalog-unmapped-list">
            <div v-for="packageName in availablePackages" :key="`unmapped-${packageName}`" class="catalog-unmapped-item">
              <span>{{ packageName }}</span>
              <button class="catalog-row-btn" @click="addPackageToMapping(packageName)">Add as Block</button>
            </div>
          </div>
        </div>

        <div class="catalog-mode-switch">
          <button
            class="catalog-mode-btn"
            :class="{ active: catalogEditorMode === 'visual' }"
            @click="switchCatalogMode('visual')"
          >
            Visual
          </button>
          <button
            class="catalog-mode-btn"
            :class="{ active: catalogEditorMode === 'json' }"
            @click="switchCatalogMode('json')"
          >
            JSON
          </button>
        </div>

        <div v-if="catalogEditorMode === 'visual'" class="catalog-body">
          <p v-if="catalogDraft.length === 1 && !catalogDraft[0].package" class="catalog-empty-hint">
            Start by selecting an unmapped package below or type package name directly in the first row.
          </p>
          <div class="catalog-grid-header">
            <span>Package</span>
            <span>Block Name</span>
            <span>Section</span>
            <span></span>
          </div>
          <div v-for="(entry, index) in catalogDraft" :key="`entry-${index}`" class="catalog-grid-row">
            <input v-model.trim="entry.package" class="catalog-input" placeholder="package.path" @input="onCatalogRowChange" />
            <input v-model.trim="entry.blockName" class="catalog-input" placeholder="Block Name" @input="onCatalogRowChange" />
            <select v-model="entry.section" class="catalog-input" @change="onCatalogRowChange">
              <option v-for="section in catalogSections" :key="section" :value="section">{{ section }}</option>
            </select>
            <button class="catalog-row-btn" @click="removeCatalogRow(index)">Remove</button>
          </div>
          <button class="catalog-add-btn" @click="addCatalogRow">+ Add Mapping</button>
        </div>

        <div v-else class="catalog-body">
          <textarea v-model="catalogJsonValue" class="catalog-json" spellcheck="false"></textarea>
        </div>

        <div class="catalog-actions">
          <button class="catalog-action-btn secondary" @click="closeCatalogEditor">No, cancel</button>
          <button class="catalog-action-btn primary" @click="saveCatalogChanges">Yes, save</button>
        </div>
      </div>
    </div>
    
    <div v-if="showClearConfirmModal" class="home-modal" @click.self="cancelClearCanvas">
      <div class="home-content">
        <h2>Clear Canvas?</h2>
        <p>Are you sure you want to clear all blocks from the canvas? This action cannot be undone.</p>
        <div class="home-actions">
          <button class="home-action-btn ghost" @click="confirmClearCanvas">Yes, clear all</button>
          <button class="home-action-btn secondary" @click="cancelClearCanvas">No, cancel</button>
        </div>
      </div>
    </div>

    <div v-if="showAnalyticsExpanded" class="analytics-expanded-modal" @click.self="toggleAnalyticsExpanded">
      <div class="analytics-expanded-content">
        <div class="analytics-expanded-header">
          <h3>Training Analytics - Detailed View</h3>
          <div class="analytics-expanded-actions">
            <button class="analytics-expanded-btn" @click="openRightSidebar">Open Sidebar</button>
            <button class="analytics-expanded-btn close" @click="toggleAnalyticsExpanded">Close</button>
          </div>
        </div>
        <div class="analytics-expanded-body">
          <training-panel
            ref="trainingPanelExpanded"
            :project-key="getTrainingProjectKey()"
          />
        </div>
      </div>
    </div>
    
    <BaseNotificationModal />
  </div>
</template>

<script>
import { defineAsyncComponent } from 'vue';
import CodeEditor from './components/editor/CodeEditor.vue';
import BaseNotificationModal from './components/base/BaseNotificationModal.vue';
import BaseNavbar from './components/base/BaseNavbar.vue';

const TrainingPanel = defineAsyncComponent(() => import('@/blocks/AnalyticsBlock/components/TrainingPanel.vue'));
import { loadProjectFiles } from './services/project/projectFileStore';
import { desktopAgentHealth, discoverServerPort, getDesktopAgentBaseUrl, getDesktopAgentDownloadUrl, getDesktopAgentLaunchUrl, getProjectFolderLink, linkProjectFolder, restartDesktopAgent, syncProjectFiles, clearCachedPort } from './services/agent/desktopAgentClient';
import { CATALOG_SECTIONS, getSectionIcon, normalizeBlockName, normalizePackageName } from './services/catalog/catalogMapping';
import { PIPELINE_STATUS_TEXT } from './services/constants/appUi';

export default {
  name: 'App',
  components: {
    CodeEditor,
    BaseNotificationModal,
    TrainingPanel,
    BaseNavbar
  },
  data() {
    return {
      showEditor: false,
      selectedBlock: null,
      catalogEditorMode: 'visual',
      catalogDraft: [],
      catalogJsonValue: '',
      availablePackages: [],
      catalogSections: [...CATALOG_SECTIONS],
      workspaceReloadToken: 0,
      desktopAgentCheckingDelayTimer: null,
      desktopAgentPollTimer: null
    };
  },
  computed: {
    currentView() {
      return this.$route?.name || 'home';
    },
    currentProject: {
      get() {
        return this.$store.getters.currentProject;
      },
      set(project) {
        this.$store.commit('setCurrentProject', project);
      }
    },
    // UI state from store
    showHelpModal: {
      get() { return this.$store.state.ui.showHelpModal; },
      set(value) { this.$store.commit('ui/setShowHelpModal', value); }
    },
    showHomeModal: {
      get() { return this.$store.state.ui.showHomeModal; },
      set(value) { this.$store.commit('ui/setShowHomeModal', value); }
    },
    homeModalMode: {
      get() { return this.$store.state.ui.homeModalMode; },
      set(value) { this.$store.commit('ui/setHomeModalMode', value); }
    },
    showCatalogEditor: {
      get() { return this.$store.state.ui.showCatalogEditor; },
      set(value) { this.$store.commit('ui/setShowCatalogEditor', value); }
    },
    showLeftSidebar: {
      get() { return this.$store.state.ui.showLeftSidebar; },
      set(value) { this.$store.commit('ui/setShowLeftSidebar', value); }
    },
    showRightSidebar: {
      get() { return this.$store.state.ui.showRightSidebar; },
      set(value) { this.$store.commit('ui/setShowRightSidebar', value); }
    },
    showClearConfirmModal: {
      get() { return this.$store.state.ui.showClearConfirmModal; },
      set(value) { this.$store.commit('ui/setShowClearConfirmModal', value); }
    },
    showAnalyticsExpanded: {
      get() { return this.$store.state.ui.showAnalyticsExpanded; },
      set(value) { this.$store.commit('ui/setShowAnalyticsExpanded', value); }
    },
    showAgentInstructionsModal: {
      get() { return this.$store.state.ui.showAgentInstructionsModal; },
      set(value) { this.$store.commit('ui/setShowAgentInstructionsModal', value); }
    },
    // Agent state from store
    desktopAgentState() {
      return this.$store.state.agent.state;
    },
    desktopAgentPort() {
      return this.$store.state.agent.port;
    },
    desktopAgentHost() {
      return this.$store.state.agent.host;
    },
    desktopAgentRestarting() {
      return this.$store.state.agent.restarting;
    },
    desktopAgentDownloadUrl() {
      return this.$store.state.agent.downloadUrl;
    },
    desktopAgentInstalled() {
      return this.$store.state.agent.installed;
    },
    desktopAgentLabel() {
      return this.$store.getters['agent/label'];
    },
    desktopAgentHostPort() {
      return this.$store.getters['agent/hostPort'];
    },
    desktopAgentTooltip() {
      return this.$store.getters['agent/tooltip'];
    },
    desktopAgentActionLabel() {
      return this.$store.getters['agent/actionLabel'];
    },
    desktopAgentActionTitle() {
      return this.$store.getters['agent/actionTitle'];
    },
    // Sync state from store
    localSyncState() {
      return this.$store.state.sync.state;
    },
    localSyncPath() {
      return this.$store.state.sync.path;
    },
    localSyncLabel() {
      return this.$store.getters['sync/label'];
    },
    localSyncTooltip() {
      return this.$store.getters['sync/tooltip'];
    },
    isPipelineRunning() {
      return this.getCanvasRef()?.isRunning || false;
    },
    pipelineStatus() {
      return this.getCanvasRef()?.pipelineStatus || 'idle';
    }
  },
  watch: {
    'currentProject.id': {
      immediate: true,
      handler() {
        this.refreshLocalSyncStatus();
      }
    }
  },
  mounted() {
    document.documentElement.classList.add('dark-theme');
    this.$store.dispatch('agent/initialize');
    this.updateDesktopAgentConnectionInfo();
    this.refreshDesktopAgentStatus();
    this.desktopAgentPollTimer = setInterval(() => {
      this.refreshDesktopAgentStatus();
    }, 5000);
  },
  beforeUnmount() {
    if (this.desktopAgentPollTimer) {
      clearInterval(this.desktopAgentPollTimer);
      this.desktopAgentPollTimer = null;
    }
    if (this.desktopAgentCheckingDelayTimer) {
      clearTimeout(this.desktopAgentCheckingDelayTimer);
      this.desktopAgentCheckingDelayTimer = null;
    }
  },
  methods: {
    getPipelineViewRef() {
      return this.$refs.pipelineView || null;
    },

    getCanvasRef() {
      return this.getPipelineViewRef()?.getCanvasRef?.() || null;
    },

    updateDesktopAgentConnectionInfo() {
      try {
        const baseUrl = getDesktopAgentBaseUrl();
        const parsed = new URL(baseUrl);
        this.$store.commit('agent/setHost', parsed.hostname || '127.0.0.1');
        this.$store.commit('agent/setPort', String(parsed.port || '51751'));
      } catch (error) {
        this.$store.commit('agent/setHost', '127.0.0.1');
        this.$store.commit('agent/setPort', '51751');
      }
    },

    async refreshDesktopAgentStatus(forceDiscovery = false) {
      this.updateDesktopAgentConnectionInfo();
      const previousState = this.desktopAgentState;

      if (this.desktopAgentCheckingDelayTimer) {
        clearTimeout(this.desktopAgentCheckingDelayTimer);
        this.desktopAgentCheckingDelayTimer = null;
      }

      this.desktopAgentCheckingDelayTimer = setTimeout(() => {
        if (this.desktopAgentState === previousState) {
          this.$store.commit('agent/setState', 'checking');
        }
      }, 1200);
      
      try {
        let health = null;
        
        // If forcing discovery or currently offline, do port discovery
        if (forceDiscovery || previousState === 'offline') {
          const discovered = await discoverServerPort();
          if (discovered) {
            this.$store.commit('agent/setPort', String(discovered.port));
            health = discovered.data;
          }
        } else {
          // Try current port first
          try {
            health = await desktopAgentHealth();
          } catch (e) {
            // Current port failed, try discovery
            const discovered = await discoverServerPort();
            if (discovered) {
              this.$store.commit('agent/setPort', String(discovered.port));
              health = discovered.data;
            }
          }
        }
        
        if (this.desktopAgentCheckingDelayTimer) {
          clearTimeout(this.desktopAgentCheckingDelayTimer);
          this.desktopAgentCheckingDelayTimer = null;
        }

        if (health) {
          this.$store.commit('agent/setFailedChecks', 0);
          this.$store.commit('agent/setState', 'online');
          if (health?.host) {
            this.$store.commit('agent/setHost', String(health.host));
          }
          if (health?.port !== undefined && health?.port !== null) {
            this.$store.commit('agent/setPort', String(health.port));
          }
        } else {
          this.$store.commit('agent/incrementFailedChecks');
          const failedChecks = this.$store.state.agent.failedChecks;
          if (previousState !== 'online' || failedChecks >= 2) {
            this.$store.commit('agent/setState', 'offline');
          } else {
            this.$store.commit('agent/setState', 'online');
          }
        }
      } catch (error) {
        if (this.desktopAgentCheckingDelayTimer) {
          clearTimeout(this.desktopAgentCheckingDelayTimer);
          this.desktopAgentCheckingDelayTimer = null;
        }
        this.$store.commit('agent/incrementFailedChecks');
        const failedChecks = this.$store.state.agent.failedChecks;
        if (previousState !== 'online' || failedChecks >= 2) {
          this.$store.commit('agent/setState', 'offline');
        } else {
          this.$store.commit('agent/setState', 'online');
        }
      }
    },

    async restartDesktopAgentFromUI() {
      if (this.desktopAgentRestarting) {
        return;
      }

      this.$store.commit('agent/setRestarting', true);
      try {
        await restartDesktopAgent();
      } catch (error) {
        this.showToast(error.message || 'Unable to restart desktop agent', 'error', 6000);
      }

      setTimeout(() => {
        this.refreshDesktopAgentStatus();
      }, 1500);
      setTimeout(() => {
        this.refreshDesktopAgentStatus();
      }, 3500);

      this.$store.commit('agent/setRestarting', false);
    },

    downloadDesktopAgentFromUI() {
      const url = this.desktopAgentDownloadUrl || getDesktopAgentDownloadUrl();
      
      // Development mode: show instructions since agent is already in codebase
      if (!url || url.includes('github.com/your-org')) {
        this.showAgentInstallInstructions();
        return;
      }

      // Production mode: download from configured URL
      window.open(url, '_blank', 'noopener,noreferrer');
      this.showToast('Desktop agent download started. Install it, then click "I Installed Agent".', 'info', 5000);
    },

    showAgentInstallInstructions() {
      this.showAgentInstructionsModal = true;
      this.showToast('Agent is in local-server/ folder. Run "npm run serve" to auto-start.', 'info', 6000);
    },

    markDesktopAgentInstalled() {
      this.$store.commit('agent/setInstalled', true);
      this.$store.dispatch('ui/showToast', { message: 'Agent marked as installed. Click Start to reconnect.', type: 'success', duration: 4000 });
    },

    async startDesktopAgentFromUI() {
      if (this.desktopAgentRestarting) {
        return;
      }

      this.$store.commit('agent/setRestarting', true);

      const launchUrl = getDesktopAgentLaunchUrl();
      try {
        window.location.assign(launchUrl);
      } catch (error) {
        this.showToast('Unable to launch desktop agent protocol. Install the agent first.', 'error', 6000);
      }

      setTimeout(() => {
        this.refreshDesktopAgentStatus();
      }, 1200);
      setTimeout(() => {
        this.refreshDesktopAgentStatus();
      }, 2800);
      setTimeout(() => {
        this.refreshDesktopAgentStatus();
        this.$store.commit('agent/setRestarting', false);
        if (this.desktopAgentState !== 'online') {
          this.$store.dispatch('ui/showToast', { message: 'Agent is still offline. Open the installed agent once, then click Start again.', type: 'error', duration: 6000 });
        }
      }, 5000);
    },

    async startOrRestartDesktopAgentFromUI() {
      if (this.desktopAgentState === 'online') {
        await this.restartDesktopAgentFromUI();
        return;
      }

      await this.startDesktopAgentFromUI();
    },

    handlePortChange(port) {
      this.$store.commit('agent/setPort', String(port));
      // Clear cached port so it uses the new one
      clearCachedPort();
      // Immediately check the new port
      this.refreshDesktopAgentStatus();
    },

    async refreshLocalSyncStatus() {
      const projectId = String(this.currentProject?.id || '');
      if (!projectId) {
        this.$store.commit('sync/setState', 'unlinked');
        this.$store.commit('sync/setPath', '');
        return;
      }

      this.$store.commit('sync/setState', 'checking');
      try {
        const response = await getProjectFolderLink(projectId);
        if (response?.linked && response?.localRootPath) {
          this.$store.commit('sync/setState', 'linked');
          this.$store.commit('sync/setPath', String(response.localRootPath));
          return;
        }

        this.$store.commit('sync/setState', 'unlinked');
        this.$store.commit('sync/setPath', '');
      } catch (error) {
        this.$store.commit('sync/setState', 'error');
        this.$store.commit('sync/setPath', '');
      }
    },

    async handleProjectSelected(project) {
      const hydratedProject = await this.ensureProjectFilesHydrated(project);

      this.currentProject = hydratedProject;
      await this.$router.push({ name: 'pipeline' });

      this.seedImportedFilesForProject(hydratedProject);
      this.workspaceReloadToken += 1;
      
      // Load blocks into canvas if they exist
      this.$nextTick(() => {
        const canvas = this.getCanvasRef();
        if (canvas) {
          canvas.clearAll();
        }
        if (canvas && hydratedProject.blocks && hydratedProject.blocks.length > 0) {
          hydratedProject.blocks
            .filter(block => block && block.id)
            .forEach(block => {
              canvas.addBlock(block);
            });
        }
      });
    },

    async ensureProjectFilesHydrated(project) {
      if (!project || project.type !== 'python-import') {
        return project;
      }

      const currentFiles = Array.isArray(project.pythonFiles) ? project.pythonFiles : [];
      const hasAnyContent = currentFiles.some(file => typeof file?.content === 'string' && file.content.length > 0);
      if (hasAnyContent) {
        return project;
      }

      try {
        const hydratedFiles = await loadProjectFiles(project.id);
        if (Array.isArray(hydratedFiles) && hydratedFiles.length > 0) {
          return {
            ...project,
            pythonFiles: hydratedFiles
          };
        }
      } catch (error) {
        console.warn('Unable to hydrate project files from IndexedDB:', error);
      }

      return project;
    },

    goToDashboard() {
      const navigationState = this.getHomeNavigationState();

      if (navigationState === 'empty') {
        this.navigateToDashboard();
        return;
      }

      this.homeModalMode = navigationState === 'unsaved' ? 'unsaved' : 'confirm';
      this.showHomeModal = true;
    },

    cancelGoHome() {
      this.showHomeModal = false;
    },

    goHomeDirectly() {
      this.showHomeModal = false;
      this.navigateToDashboard();
    },

    saveAndGoHome() {
      this.persistCurrentWorkflow();
      this.showHomeModal = false;
      this.navigateToDashboard();
    },

    getHomeNavigationState() {
      const hasWorkspaceData = this.hasWorkspaceDataToStore();
      if (!hasWorkspaceData) {
        return 'empty';
      }

      return this.hasUnsavedWorkspaceChanges() ? 'unsaved' : 'confirm';
    },

    hasWorkspaceDataToStore() {
      const blocks = this.getCurrentBlocksSnapshot();
      const hasBlocks = blocks.length > 0;
      const hasCatalog = Array.isArray(this.currentProject?.config?.blockCatalog)
        && this.currentProject.config.blockCatalog.length > 0;
      const hasLocalPackages = Array.isArray(this.currentProject?.config?.localPackages)
        && this.currentProject.config.localPackages.length > 0;
      const hasRealProjectName = !!this.currentProject?.name && this.currentProject.name !== 'New Project';

      return hasBlocks || hasCatalog || hasLocalPackages || hasRealProjectName;
    },

    hasUnsavedWorkspaceChanges() {
      const currentBlocks = this.getCurrentBlocksSnapshot();
      const savedBlocks = Array.isArray(this.currentProject?.blocks)
        ? this.currentProject.blocks
        : [];

      return JSON.stringify(currentBlocks) !== JSON.stringify(savedBlocks);
    },

    persistCurrentWorkflow() {
      const canvas = this.getCanvasRef();
      const currentBlocks = canvas && Array.isArray(canvas.blocks)
        ? JSON.parse(JSON.stringify(canvas.blocks))
        : [];

      const now = new Date();
      const normalizedName = this.currentProject && this.currentProject.name && this.currentProject.name !== 'New Project'
        ? this.currentProject.name
        : `Workflow ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      const projectId = this.currentProject && this.currentProject.id ? this.currentProject.id : Date.now();
      const projectToSave = {
        ...this.currentProject,
        id: projectId,
        name: normalizedName,
        lastModified: now,
        blocks: currentBlocks
      };

      const projects = JSON.parse(localStorage.getItem('ml_projects') || '[]');
      const existingIndex = projects.findIndex(project => project.id === projectToSave.id);
      const safeProjectToSave = this.makeStorageSafeProject(projectToSave);

      if (existingIndex >= 0) {
        projects[existingIndex] = safeProjectToSave;
      } else {
        projects.push(safeProjectToSave);
      }

      try {
        localStorage.setItem('ml_projects', JSON.stringify(projects));
      } catch (error) {
        const isQuotaError = error && (error.name === 'QuotaExceededError' || error.code === 22);
        if (!isQuotaError) {
          throw error;
        }

        const minimalSafeProject = this.makeStorageSafeProject(projectToSave, { minimal: true });
        if (existingIndex >= 0) {
          projects[existingIndex] = minimalSafeProject;
        } else {
          projects.push(minimalSafeProject);
        }
        localStorage.setItem('ml_projects', JSON.stringify(projects));
      }

      this.currentProject = projectToSave;
      this.exportCatalogJson(projectToSave);
    },

    exportCatalogJson(project) {
      const blocks = Array.isArray(project.blocks) ? project.blocks : [];
      const catalog = Array.isArray(project.config?.blockCatalog) ? project.config.blockCatalog : [];

      const blockDetails = blocks.map(block => ({
        id: block.id || '',
        name: block.name || '',
        section: block.category || '',
        icon: block.icon || '',
        inputs: block.inputs || [],
        outputs: block.outputs || [],
        packages: block.packages || [],
        package: block.config?.package || (block.packages && block.packages[0]) || ''
      }));

      const payload = {
        project: project.name || 'Untitled',
        savedAt: new Date().toISOString(),
        type: project.type || 'template',
        catalog: catalog.map(entry => ({
          package: entry.package || '',
          blockName: entry.blockName || '',
          section: entry.section || ''
        })),
        blocks: blockDetails
      };

      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const safeName = (project.name || 'project').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeName}_catalog.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },

    navigateToDashboard() {
      this.$store.commit('resetCurrentProject');
      this.$router.push({ name: 'home' });

      const canvas = this.getCanvasRef();
      if (canvas) {
        canvas.clearAll();
      }
    },

    openCatalogEditor() {
      const catalog = this.getCatalogFromCurrentProject();
      this.catalogDraft = catalog.length > 0
        ? catalog
        : [{ package: '', blockName: '', section: 'Uncategorized' }];
      this.catalogEditorMode = 'visual';
      this.catalogJsonValue = JSON.stringify(this.catalogDraft, null, 2);
      this.refreshAvailablePackages();
      this.showCatalogEditor = true;
    },

    closeCatalogEditor() {
      this.showCatalogEditor = false;
      this.catalogEditorMode = 'visual';
      this.catalogDraft = [];
      this.catalogJsonValue = '';
      this.availablePackages = [];
    },

    getCurrentBlocksSnapshot() {
      const canvas = this.getCanvasRef();
      if (canvas && Array.isArray(canvas.blocks)) {
        return JSON.parse(JSON.stringify(canvas.blocks));
      }

      return Array.isArray(this.currentProject.blocks)
        ? JSON.parse(JSON.stringify(this.currentProject.blocks))
        : [];
    },

    normalizePackageName(value) {
      return normalizePackageName(value);
    },

    normalizeBlockName(value, packageName) {
      return normalizeBlockName(value, packageName);
    },

    getCatalogFromCurrentProject() {
      const configuredCatalog = this.currentProject?.config?.blockCatalog;
      if (Array.isArray(configuredCatalog) && configuredCatalog.length > 0) {
        return configuredCatalog.map((entry) => {
          const packageName = this.normalizePackageName(entry.package);
          return {
            package: packageName,
            blockName: this.normalizeBlockName(entry.blockName, packageName),
            section: this.catalogSections.includes(entry.section) ? entry.section : 'Uncategorized'
          };
        }).filter(entry => entry.package);
      }

      const blocks = this.getCurrentBlocksSnapshot();
      return blocks.map((block) => {
        const packageFromBlock = Array.isArray(block.packages) && block.packages.length
          ? String(block.packages[0])
          : (block.config && block.config.package ? String(block.config.package) : '');
        const packageName = this.normalizePackageName(packageFromBlock);
        return {
          package: packageName,
          blockName: this.normalizeBlockName(block.name, packageName),
          section: this.catalogSections.includes(block.category) ? block.category : 'Uncategorized'
        };
      }).filter(entry => entry.package);
    },

    refreshAvailablePackages() {
      const allPackages = Array.isArray(this.currentProject?.config?.localPackages)
        ? this.currentProject.config.localPackages
        : [];
      const mappedPackageSet = new Set(this.catalogDraft.map(entry => String(entry.package || '').trim()).filter(Boolean));
      this.availablePackages = allPackages.filter(packageName => !mappedPackageSet.has(packageName));
    },

    syncCatalogJson() {
      this.catalogJsonValue = JSON.stringify(this.catalogDraft, null, 2);
    },

    onCatalogRowChange() {
      this.syncCatalogJson();
      this.refreshAvailablePackages();
    },

    switchCatalogMode(mode) {
      if (mode === this.catalogEditorMode) {
        return;
      }

      if (mode === 'json') {
        this.syncCatalogJson();
      } else {
        try {
          const parsed = JSON.parse(this.catalogJsonValue);
          const entries = Array.isArray(parsed) ? parsed : Array.isArray(parsed.blocks) ? parsed.blocks : [];
          this.catalogDraft = entries.map((entry) => {
            const packageName = this.normalizePackageName(entry.package);
            return {
              package: packageName,
              blockName: this.normalizeBlockName(entry.blockName, packageName),
              section: this.catalogSections.includes(entry.section) ? entry.section : 'Uncategorized'
            };
          }).filter(entry => entry.package);

          if (this.catalogDraft.length === 0) {
            this.catalogDraft = [{ package: '', blockName: '', section: 'Uncategorized' }];
          }

          this.refreshAvailablePackages();
        } catch (error) {
          alert(`Invalid catalog JSON: ${error.message}`);
          return;
        }
      }

      this.catalogEditorMode = mode;
    },

    addCatalogRow() {
      // Don't add a new empty row if one already exists
      const hasEmptyRow = this.catalogDraft.some(entry => !String(entry.package || '').trim());
      if (hasEmptyRow) {
        return;
      }
      
      this.catalogDraft.push({
        package: '',
        blockName: '',
        section: 'Uncategorized'
      });
      this.syncCatalogJson();
    },

    addPackageToMapping(packageName) {
      const normalized = String(packageName || '').trim();
      if (!normalized) {
        return;
      }

      const exists = this.catalogDraft.some(entry => String(entry.package || '').trim() === normalized);
      if (exists) {
        return;
      }

      const blockName = this.normalizeBlockName('', normalized);
      const newEntry = {
        package: normalized,
        blockName,
        section: 'Uncategorized'
      };

      // Check if there's an empty row that we can fill
      const emptyRowIndex = this.catalogDraft.findIndex(entry => !String(entry.package || '').trim());
      
      if (emptyRowIndex !== -1) {
        // Fill the existing empty row instead of adding a new one
        this.catalogDraft[emptyRowIndex] = newEntry;
      } else {
        // No empty row, add a new one
        this.catalogDraft.push(newEntry);
      }
      
      this.syncCatalogJson();
      this.refreshAvailablePackages();
    },

    removeCatalogRow(index) {
      this.catalogDraft.splice(index, 1);
      this.syncCatalogJson();
      this.refreshAvailablePackages();
    },

    getSectionIcon(section) {
      return getSectionIcon(section);
    },

    makeStorageSafeProject(project, options = {}) {
      const minimal = Boolean(options.minimal);
      const safeProject = { ...(project || {}) };

      const sourceFiles = Array.isArray(project?.pythonFiles) ? project.pythonFiles : [];
      safeProject.pythonFiles = minimal
        ? []
        : sourceFiles.map(file => ({
          name: file?.name || '',
          path: file?.path || '',
          relativePath: file?.relativePath || file?.path || '',
          size: Number(file?.size || 0),
          type: file?.type || ''
        }));

      return safeProject;
    },

    saveProjectToStorage(project) {
      const projects = JSON.parse(localStorage.getItem('ml_projects') || '[]');
      const existingIndex = projects.findIndex(item => item.id === project.id);
      const safeProject = this.makeStorageSafeProject(project);

      if (existingIndex >= 0) {
        projects[existingIndex] = safeProject;
      } else {
        projects.push(safeProject);
      }

      try {
        localStorage.setItem('ml_projects', JSON.stringify(projects));
      } catch (error) {
        const isQuotaError = error && (error.name === 'QuotaExceededError' || error.code === 22);
        if (!isQuotaError) {
          throw error;
        }

        const minimalSafeProject = this.makeStorageSafeProject(project, { minimal: true });
        if (existingIndex >= 0) {
          projects[existingIndex] = minimalSafeProject;
        } else {
          projects.push(minimalSafeProject);
        }
        localStorage.setItem('ml_projects', JSON.stringify(projects));
      }
    },

    buildImportedWorkspaceData(project) {
      if (!project || project.type !== 'python-import') {
        return { fileEntries: [], mappedBlockIds: new Set() };
      }

      const projectFiles = Array.isArray(project.pythonFiles) ? project.pythonFiles : [];
      const blocks = Array.isArray(project.blocks) ? project.blocks.filter(block => block && block.id) : [];

      const blockIdByPackage = new Map();
      blocks.forEach(block => {
        const packageName = Array.isArray(block.packages) && block.packages.length
          ? String(block.packages[0])
          : (block.config && block.config.package ? String(block.config.package) : '');

        if (packageName) {
          blockIdByPackage.set(packageName, block.id);
        }
      });

      if (blockIdByPackage.size === 0) {
        return { fileEntries: [], mappedBlockIds: new Set() };
      }

      const fileEntries = [];
      const mappedBlockIds = new Set();

      projectFiles.forEach(file => {
        const normalizedPath = String(file?.relativePath || file?.path || '').replace(/\\/g, '/');
        const parts = normalizedPath.split('/').filter(Boolean);

        if (parts.length < 3) {
          return;
        }

        const packageName = parts[1];
        const blockId = blockIdByPackage.get(packageName);
        if (!blockId) {
          return;
        }

        mappedBlockIds.add(blockId);

        const nestedParts = parts.slice(2);
        if (nestedParts.length === 0) {
          return;
        }

        const fileName = nestedParts[nestedParts.length - 1];
        const folderParts = nestedParts.slice(0, -1);

        fileEntries.push({
          blockId,
          folderParts,
          fileName,
          filePath: nestedParts.join('/') // Path relative to project root
          // Note: code content is NOT copied - files remain on disk
        });
      });

      return { fileEntries, mappedBlockIds };
    },

    seedImportedFilesForProject(project, options = {}) {
      if (!project || project.type !== 'python-import') {
        return;
      }

      const force = Boolean(options.force);
      const { fileEntries, mappedBlockIds } = this.buildImportedWorkspaceData(project);

      if (mappedBlockIds.size === 0) {
        return;
      }

      let existingModules = [];
      let existingFolders = [];

      try {
        existingModules = JSON.parse(localStorage.getItem('mlsphere-modules') || '[]');
        existingFolders = JSON.parse(localStorage.getItem('mlsphere-folders') || '[]');
      } catch (error) {
        existingModules = [];
        existingFolders = [];
      }

      let workingModules = Array.isArray(existingModules) ? [...existingModules] : [];
      let workingFolders = Array.isArray(existingFolders) ? [...existingFolders] : [];

      if (force) {
        workingModules = workingModules.filter(module => !mappedBlockIds.has(module?.blockId));
        workingFolders = workingFolders.filter(folder => !mappedBlockIds.has(folder?.blockId));
      }

      const ensureFolder = (blockId, folderParts) => {
        let parentId = null;

        folderParts.forEach(folderName => {
          let existing = workingFolders.find(folder =>
            folder &&
            folder.blockId === blockId &&
            folder.parent === parentId &&
            folder.name === folderName
          );

          if (!existing) {
            existing = {
              id: `folder_import_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
              name: folderName,
              blockId,
              parent: parentId,
              children: []
            };
            workingFolders.push(existing);
          }

          if (parentId) {
            const parentFolder = workingFolders.find(folder => folder && folder.id === parentId);
            if (parentFolder) {
              if (!Array.isArray(parentFolder.children)) {
                parentFolder.children = [];
              }
              if (!parentFolder.children.includes(existing.id)) {
                parentFolder.children.push(existing.id);
              }
            }
          }

          parentId = existing.id;
        });

        return parentId;
      };

      fileEntries.forEach(entry => {
        const folderId = ensureFolder(entry.blockId, entry.folderParts || []);

        const existingModule = workingModules.find(module =>
          module &&
          module.blockId === entry.blockId &&
          (module.folder || null) === (folderId || null) &&
          module.name === entry.fileName
        );

        if (!existingModule) {
          // Store module metadata WITHOUT code - files remain on disk
          workingModules.push({
            id: `module_import_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
            name: entry.fileName,
            type: 'module',
            blockId: entry.blockId,
            folder: folderId,
            filePath: entry.filePath  // Store file path for on-demand loading from disk
            // Note: code content is NOT stored here
          });
        }
      });

      // Safe localStorage write with error handling
      this.safeLocalStorageWrite('mlsphere-modules', workingModules);
      this.safeLocalStorageWrite('mlsphere-folders', workingFolders);
    },

    safeLocalStorageWrite(key, data) {
      try {
        const json = JSON.stringify(data);
        localStorage.setItem(key, json);
      } catch (error) {
        if (error.name === 'QuotaExceededError') {
          console.warn(`localStorage quota exceeded for key "${key}", clearing old data...`);
          // Clear old project data and try again
          try {
            const projects = JSON.parse(localStorage.getItem('ml_projects') || '[]');
            localStorage.clear();
            localStorage.setItem('ml_projects', JSON.stringify(projects));
            localStorage.setItem(key, JSON.stringify(data));
          } catch (retryError) {
            console.error(`Failed to save ${key} even after clearing cache:`, retryError);
          }
        } else {
          console.error(`Error writing to localStorage for key "${key}":`, error);
        }
      }
    },

    async reimportUploadedFiles() {
      if (this.currentProject?.type !== 'python-import') {
        return;
      }

      const hydratedProject = await this.ensureProjectFilesHydrated(this.currentProject);
      this.currentProject = hydratedProject;

      this.seedImportedFilesForProject(hydratedProject, { force: true });
      this.workspaceReloadToken += 1;
      alert('Uploaded files have been re-imported into mapped blocks.');
    },

    async saveCatalogChanges() {
      if (this.currentProject?.type === 'python-import') {
        this.currentProject = await this.ensureProjectFilesHydrated(this.currentProject);
      }

      let entries = this.catalogDraft;
      if (this.catalogEditorMode === 'json') {
        try {
          const parsed = JSON.parse(this.catalogJsonValue);
          entries = Array.isArray(parsed) ? parsed : Array.isArray(parsed.blocks) ? parsed.blocks : [];
        } catch (error) {
          alert(`Invalid catalog JSON: ${error.message}`);
          return;
        }
      }

      const sanitized = entries
        .map((entry) => {
          const packageName = this.normalizePackageName(entry.package);
          return {
            package: packageName,
            blockName: this.normalizeBlockName(entry.blockName, packageName),
            section: this.catalogSections.includes(entry.section) ? entry.section : 'Uncategorized'
          };
        })
        .filter(entry => entry.package);

      const blocks = this.getCurrentBlocksSnapshot();
      const blockByPackage = new Map();
      blocks.forEach(block => {
        const packageName = Array.isArray(block.packages) && block.packages.length
          ? String(block.packages[0])
          : (block.config && block.config.package ? String(block.config.package) : '');
        if (packageName) {
          blockByPackage.set(packageName, block);
        }
      });

      const mappedBlocks = sanitized.map((entry, index) => {
        const existing = blockByPackage.get(entry.package);
        if (existing) {
          return {
            ...existing,
            id: existing.id || `mapped-${Date.now()}-${index}`,
            name: entry.blockName,
            category: entry.section,
            icon: this.getSectionIcon(entry.section),
            inputs: existing.inputs || [],
            outputs: existing.outputs || [],
            packages: [entry.package],
            config: {
              ...(existing.config || {}),
              package: entry.package
            }
          };
        }

        return {
          id: `mapped-${Date.now()}-${index}`,
          type: 'PythonPackageBlock',
          name: entry.blockName,
          icon: this.getSectionIcon(entry.section),
          category: entry.section,
          config: {
            package: entry.package,
            source: 'catalog-mapping'
          },
          inputs: [],
          outputs: [],
          packages: [entry.package],
          code: '',
          status: 'idle'
        };
      }).filter(block => block && block.id && block.name);

      const canvas = this.getCanvasRef();
      if (canvas) {
        canvas.blocks = mappedBlocks;
      }

      const updatedProject = {
        ...this.currentProject,
        lastModified: new Date(),
        blocks: mappedBlocks,
        config: {
          ...(this.currentProject.config || {}),
          blockCatalog: sanitized,
          catalogStatus: sanitized.some(entry => entry.section !== 'Uncategorized') ? 'mapped' : 'uncategorized',
          unmappedPackages: this.availablePackages,
          localPackages: Array.isArray(this.currentProject?.config?.localPackages)
            ? this.currentProject.config.localPackages
            : sanitized.map(entry => entry.package),
          openCatalogOnLoad: false
        }
      };

      this.currentProject = updatedProject;
      this.saveProjectToStorage(updatedProject);
      this.seedImportedFilesForProject(updatedProject);
      this.workspaceReloadToken += 1;
      
      // Update canvas blocks with proper Vue reactivity
      this.$nextTick(() => {
        const canvas = this.getCanvasRef();
        if (canvas) {
          canvas.clearAll();
          mappedBlocks
            .filter(block => block && block.id)
            .forEach(block => {
              canvas.addBlock(block);
            });
        }
      });
      
      this.closeCatalogEditor();
    },

    addBlockToCanvas(block) {
      const canvas = this.getCanvasRef();
      if (canvas) {
        canvas.addBlock(block);
      }
    },
    
    openCodeEditor(block) {
      this.selectedBlock = block;
      this.showEditor = true;
    },
    
    saveBlockCode(payload) {
      if (this.selectedBlock) {
        if (typeof payload === 'string') {
          this.selectedBlock.code = payload;
        } else {
          this.selectedBlock.code = payload.code;
          this.selectedBlock.packages = Array.isArray(payload.packages) ? payload.packages : [];
        }

        // Also update the block in currentProject.blocks to ensure persistence
        if (this.currentProject && Array.isArray(this.currentProject.blocks)) {
          const projectBlockIndex = this.currentProject.blocks.findIndex(b => b && b.id === this.selectedBlock.id);
          if (projectBlockIndex >= 0) {
            this.currentProject.blocks[projectBlockIndex].code = this.selectedBlock.code;
            this.currentProject.blocks[projectBlockIndex].packages = this.selectedBlock.packages;
          }
        }

        // Persist the changes to localStorage immediately
        this.persistCurrentWorkflow();

        // Auto-sync code to local linked folder (best-effort, silent)
        this.syncBlockCodeToLocalFolder(this.selectedBlock);
      }
    },

    async syncBlockCodeToLocalFolder(block) {
      const projectId = String(this.currentProject?.id || '');
      if (!projectId || !block) return;
      try {
        const link = await getProjectFolderLink(projectId);
        if (!link?.linked) return;
        const safeBlockName = (block.name || 'block')
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '') || 'block';
        await syncProjectFiles(projectId, [
          { path: `pipeline_blocks/${safeBlockName}.py`, content: block.code || '' }
        ]);
      } catch (e) {
        // Silent — sync is best-effort
      }
    },
    
    onBlockSelected(block) {
      this.selectedBlock = block;
    },
    
    onPipelineStarted(data) {
      this.$store.commit('ui/setShowLeftSidebar', false);
      this.$store.commit('ui/setShowRightSidebar', true);
      this.dispatchTrainingPanels('startPipeline', data.totalBlocks);
    },
    
    onBlockStarted(block) {
      this.dispatchTrainingPanels('blockStarted', block);
    },
    
    onBlockExecuted(result) {
      this.dispatchTrainingPanels('blockExecuted', result);
    },
    
    onPipelineCompleted(data) {
      this.dispatchTrainingPanels('pipelineCompleted', data);
      this.syncCanvasBlocksToProject();
    },
    
    onPipelineFailed(result) {
      this.dispatchTrainingPanels('pipelineFailed', result);
      this.syncCanvasBlocksToProject();
    },

    getTrainingPanels() {
      const panels = [];
      const sidebarPanel = this.getPipelineViewRef()?.getSidebarTrainingPanel?.() || null;
      const expandedPanel = this.$refs.trainingPanelExpanded;

      if (sidebarPanel) {
        panels.push(sidebarPanel);
      }
      if (expandedPanel && expandedPanel !== sidebarPanel) {
        panels.push(expandedPanel);
      }

      return panels;
    },

    dispatchTrainingPanels(methodName, ...args) {
      this.getTrainingPanels().forEach(panel => {
        if (typeof panel?.[methodName] === 'function') {
          panel[methodName](...args);
        }
      });
    },

    syncCanvasBlocksToProject() {
      const canvas = this.getCanvasRef();
      const blocksSnapshot = this.getCurrentBlocksSnapshot();
      const runningState = {
        isRunning: canvas?.isRunning || false,
        pipelineStatus: canvas?.pipelineStatus || 'idle'
      };
      this.currentProject = {
        ...this.currentProject,
        blocks: blocksSnapshot,
        pipelineRunState: runningState
      };
    },

    restoreCanvasBlocksFromProject() {
      const canvas = this.getCanvasRef();
      if (!canvas) {
        return;
      }

      const savedBlocks = Array.isArray(this.currentProject?.blocks)
        ? JSON.parse(JSON.stringify(this.currentProject.blocks))
        : [];

      canvas.blocks = savedBlocks;

      const maxBlockIndex = savedBlocks.reduce((maxValue, block) => {
        const instanceId = String(block?.instanceId || '');
        const parsed = Number(instanceId.replace('block_', ''));
        if (Number.isFinite(parsed)) {
          return Math.max(maxValue, parsed);
        }
        return maxValue;
      }, -1);

      canvas.blockIdCounter = maxBlockIndex + 1;

      // Restore pipeline running state
      if (this.currentProject?.pipelineRunState) {
        canvas.isRunning = this.currentProject.pipelineRunState.isRunning || false;
        canvas.pipelineStatus = this.currentProject.pipelineRunState.pipelineStatus || 'idle';
      }
    },

    getTrainingProjectKey() {
      if (this.currentProject?.id !== null && this.currentProject?.id !== undefined) {
        return String(this.currentProject.id);
      }
      return String(this.currentProject?.name || 'default-project');
    },

    normalizeSyncPath(pathValue) {
      return String(pathValue || '').replace(/\\/g, '/').split('/').filter(Boolean).join('/');
    },

    getBlockPackageNameForSync(block) {
      const catalog = Array.isArray(this.currentProject?.config?.blockCatalog)
        ? this.currentProject.config.blockCatalog
        : [];
      const entry = catalog.find(item => String(item?.blockName || '').trim() === String(block?.name || '').trim());
      if (entry?.package) {
        return String(entry.package).trim();
      }
      if (Array.isArray(block?.packages) && block.packages.length > 0) {
        return String(block.packages[0]);
      }
      if (block?.config?.package) {
        return String(block.config.package);
      }
      return String(block?.name || 'block')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '') || 'block';
    },

    async ensureProjectLinkedForRun() {
      const projectId = String(this.currentProject?.id || '');
      if (!projectId) {
        throw new Error('Missing project id');
      }

      try {
        const existing = await getProjectFolderLink(projectId);
        if (existing?.linked && existing?.localRootPath) {
          this.$store.commit('sync/setState', 'linked');
          this.$store.commit('sync/setPath', String(existing.localRootPath));
          return existing.localRootPath;
        }
      } catch (error) {
        // continue to prompt
      }

      const requireEmpty = this.currentProject?.type !== 'python-import';
      const promptMessage = requireEmpty
        ? `Select an EMPTY local folder path for "${this.currentProject?.name || 'Project'}" before running pipeline:`
        : `Select local folder path for "${this.currentProject?.name || 'Project'}" before running pipeline:`;

      const selectedPath = window.prompt(promptMessage, '');
      if (!selectedPath || !selectedPath.trim()) {
        throw new Error('Local folder path is required to run pipeline');
      }

      await linkProjectFolder(projectId, selectedPath.trim(), { requireEmpty });
      this.$store.commit('sync/setState', 'linked');
      this.$store.commit('sync/setPath', selectedPath.trim());
      return selectedPath.trim();
    },

    buildPreRunSyncFiles() {
      const files = [];
      const blocks = Array.isArray(this.currentProject?.blocks) ? this.currentProject.blocks : [];

      let initMap = {};
      try {
        initMap = JSON.parse(localStorage.getItem('mlsphere-init-code-map') || '{}');
      } catch (error) {
        initMap = {};
      }

      blocks.forEach((block, index) => {
        if (!block || !block.id) {
          return;
        }

        const packageName = this.getBlockPackageNameForSync(block);
        const packageRoot = packageName.replace(/\./g, '/');
        const initPath = this.normalizeSyncPath(`${packageRoot}/__init__.py`);
        files.push({
          path: initPath,
          content: typeof initMap?.[block.id] === 'string' ? initMap[block.id] : ''
        });

        const blockCode = typeof block.code === 'string' ? block.code : (block.defaultCode || '');
        const safeBlockName = String(block.name || `block_${index + 1}`)
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '') || `block_${index + 1}`;

        files.push({
          path: this.normalizeSyncPath(`pipeline_blocks/${safeBlockName}.py`),
          content: String(blockCode || '')
        });
      });

      return files.filter(file => file.path);
    },

    async syncProjectToLocalBeforeRun() {
      await this.ensureProjectLinkedForRun();

      const projectId = String(this.currentProject?.id || '');
      if (!projectId) {
        return;
      }

      const files = this.buildPreRunSyncFiles();
      if (files.length > 0) {
        await syncProjectFiles(projectId, files);
      }
    },
    
    clearCanvas() {
      if (this.getCanvasRef()) {
        this.showClearConfirmModal = true;
      }
    },
    
    confirmClearCanvas() {
      const canvas = this.getCanvasRef();
      if (canvas) {
        canvas.clearAll();
      }
      this.showClearConfirmModal = false;
    },
    
    cancelClearCanvas() {
      this.showClearConfirmModal = false;
    },
    
    async runPipeline() {
      const canvas = this.getCanvasRef();
      if (canvas) {
        this.$store.commit('ui/setShowLeftSidebar', false);
        this.$store.commit('ui/setShowRightSidebar', true);

        try {
          await this.syncProjectToLocalBeforeRun();
        } catch (error) {
          this.$store.dispatch('ui/showToast', { message: error.message || 'Local sync setup failed', type: 'error', duration: 5000 });
          return;
        }

        canvas.runPipeline();
      }
    },
    
    validatePipeline() {
      const canvas = this.getCanvasRef();
      if (canvas) {
        canvas.validatePipeline();
      }
    },
    
    getStatusText() {
      return PIPELINE_STATUS_TEXT[this.pipelineStatus] || '';
    },
    
    showToast(message, type = 'info', duration = 3000) {
      this.$store.dispatch('ui/showToast', { message, type, duration });
    },
    
    removeToast(id) {
      this.$store.commit('ui/removeToast', id);
    },
    
    exportPipeline() {
      const canvas = this.getCanvasRef();
      if (canvas) {
        canvas.exportPipeline();
      }
    },
    
    openLeftSidebar() {
      this.showLeftSidebar = true;
    },

    closeLeftSidebar() {
      this.showLeftSidebar = false;
    },

    openRightSidebar() {
      this.showRightSidebar = true;
    },

    closeRightSidebar() {
      this.showRightSidebar = false;
    },

    toggleAnalyticsExpanded() {
      this.showAnalyticsExpanded = !this.showAnalyticsExpanded;
      if (this.showAnalyticsExpanded) {
        this.showRightSidebar = false;
      }
    },
    
    showHelp() {
      this.showHelpModal = true;
    },

    saveBlockCodeFromWorkspace(payload) {
      const canvas = this.getCanvasRef();
      if (canvas && canvas.blocks) {
        const block = canvas.blocks.find(b => b.id === payload.blockId);
        if (block) {
          block.code = payload.code;
        }
      }
    },

    toggleView() {
      if (this.currentView === 'pipeline') {
        this.syncCanvasBlocksToProject();
      }

      const nextRouteName = this.currentView === 'pipeline' ? 'code-editor' : 'pipeline';
      this.$router.push({ name: nextRouteName });

      if (nextRouteName === 'pipeline') {
        this.$store.commit('ui/setShowLeftSidebar', true);
        this.$store.commit('ui/setShowRightSidebar', true);
        this.$store.commit('ui/setShowAnalyticsExpanded', false);
        this.$nextTick(() => {
          this.dispatchTrainingPanels('restoreLatestSnapshot');
        });
      }
    },

    openAnalyticsView() {
      if (this.currentView === 'pipeline') {
        this.syncCanvasBlocksToProject();
      }
      this.$router.push({ name: 'analytics' });
      this.$nextTick(() => {
        if (this.$refs.trainingPanelFullPage) {
          this.$refs.trainingPanelFullPage.restoreLatestSnapshot();
        }
      });
    },

    goAnalyticsToPipeline() {
      this.$router.push({ name: 'pipeline' });
      this.$store.commit('ui/setShowLeftSidebar', true);
      this.$store.commit('ui/setShowRightSidebar', true);
      this.$store.commit('ui/setShowAnalyticsExpanded', false);
      this.$nextTick(() => {
        this.dispatchTrainingPanels('restoreLatestSnapshot');
      });
    },

    handleNavbarNavigate(viewName) {
      if (viewName === this.currentView) return;

      if (this.currentView === 'pipeline') {
        this.syncCanvasBlocksToProject();
      }

      if (viewName === 'analytics') {
        this.openAnalyticsView();
      } else if (viewName === 'pipeline') {
        this.$router.push({ name: 'pipeline' });
        this.$store.commit('ui/setShowLeftSidebar', true);
        this.$store.commit('ui/setShowRightSidebar', true);
        this.$store.commit('ui/setShowAnalyticsExpanded', false);
        this.$nextTick(() => {
          this.dispatchTrainingPanels('restoreLatestSnapshot');
        });
      } else if (viewName === 'code-editor') {
        this.$router.push({ name: 'code-editor' });
      }
    },

    async openServerManagementModalFromNavbar() {
      if (this.$route?.name !== 'home') {
        await this.$router.push({ name: 'home' });
      }

      this.$nextTick(() => {
        window.dispatchEvent(new CustomEvent('mlsphere-open-server-modal'));
      });
    }
  }
};
</script>

<style src="./assets/styles/app-shell.css"></style>
