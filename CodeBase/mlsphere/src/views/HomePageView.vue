<template>
  <div class="dashboard">
    <!-- Hero Section -->
    <hero-section 
      @scroll-to-templates="scrollToTemplates"
      @scroll-to-guide="scrollToGuide"
    />
    <div class="dashboard-content">
      <!-- Project Templates -->
      <project-templates :templates="projectTemplates" @select-template="selectTemplate" />
      <!-- Load From Local -->
      <load-from-local @load-from-python-project="loadFromPythonProject" />
      <!-- Recent Projects -->
      <recent-projects :projects="recentProjects" @load-project="loadProject" @delete-project="deleteProject" />
      <!-- Agent Setup -->
      <agent-setup :desktopAgentState="desktopAgentState" :lastCheckHint="lastCheckHint" @download-installer="downloadInstallerFile" />
      <!-- Quick Start Guide -->
      <quick-start-guide />
    </div>
    <BaseFooter />

    <!-- Manage Server Modal -->
    <ServerManagementModal :show="showServerManagementModal" :close="closeServerManagementModal" />

    <!-- Delete Project Confirmation Modal -->
    <div v-if="showDeleteModal" class="delete-modal-overlay" @click.self="cancelDelete">
      <div class="delete-modal-dialog">
        <div class="delete-modal-header">
          <span class="delete-modal-icon">🗑️</span>
          <h3 class="delete-modal-title">Delete Project</h3>
        </div>
        <div class="delete-modal-body">
          <p>Are you sure you want to delete <strong>{{ projectToDelete?.name }}</strong>?</p>
          <p class="delete-modal-warning">This will permanently remove the project and all its files. This action cannot be undone.</p>
        </div>
        <div class="delete-modal-footer">
          <button class="delete-modal-cancel" @click="cancelDelete">Cancel</button>
          <button class="delete-modal-confirm" @click="confirmDelete">Delete Project</button>
        </div>
      </div>
    </div>

    <!-- Upload Confirmation Modal -->
    <div v-if="showUploadModal" class="upload-modal-overlay" @click.self="cancelUploadConfirm">
      <div class="upload-modal-dialog">
        <div class="upload-modal-header">
          <div class="upload-modal-title-row">
            <span class="upload-modal-icon">📂</span>
            <h3 class="upload-modal-title">Import Python Project</h3>
          </div>
          <button class="upload-modal-close" @click="cancelUploadConfirm">✕</button>
        </div>

        <div class="upload-modal-body">
          <!-- Summary -->
          <div class="upload-summary">
            <div class="upload-summary-item">
              <span class="upload-summary-label">Folder</span>
              <span class="upload-summary-value">{{ uploadModalFolderName }}</span>
            </div>
            <div class="upload-summary-item">
              <span class="upload-summary-label">Files</span>
              <span class="upload-summary-value">{{ uploadModalFileCount }} files ({{ uploadModalLocalPackages.length }} packages detected)</span>
            </div>
          </div>

          <!-- Catalog Status -->
          <div class="upload-catalog-section">
            <div class="upload-catalog-label">Block Catalog</div>

            <!-- Auto-detected -->
            <div v-if="uploadModalCatalogStatus === 'auto'" class="upload-catalog-status upload-catalog-ok">
              <span class="upload-status-icon">✓</span>
              <span>catalog.json found — {{ uploadModalCatalog.length }} package{{ uploadModalCatalog.length === 1 ? '' : 's' }} mapped</span>
            </div>

            <!-- Manually selected and valid -->
            <div v-else-if="uploadModalCatalogStatus === 'manual' && !uploadModalCatalogError" class="upload-catalog-status upload-catalog-ok">
              <span class="upload-status-icon">✓</span>
              <span>Catalog selected — {{ uploadModalCatalog.length }} package{{ uploadModalCatalog.length === 1 ? '' : 's' }} mapped</span>
            </div>

            <!-- Hard error (invalid file/JSON) — blocks showing ok status -->
            <div v-if="uploadModalCatalogError" class="upload-catalog-error">
              {{ uploadModalCatalogError }}
            </div>

            <!-- Soft warning: catalog loaded but some packages couldn't be located -->
            <div v-if="uploadModalCatalogWarning.length > 0" class="upload-catalog-warning">
              <span class="upload-warning-icon">⚠</span>
              <span>
                {{ uploadModalCatalogWarning.length }} package{{ uploadModalCatalogWarning.length === 1 ? '' : 's' }} in the catalog could not be located in the upload
                (<strong>{{ uploadModalCatalogWarning.join(', ') }}</strong>).
                You can still import and remap the catalog afterward.
              </span>
            </div>

            <!-- None / Manual hard error — show select option -->
            <div v-if="uploadModalCatalogStatus === 'none' || (uploadModalCatalogStatus === 'manual' && uploadModalCatalogError)" class="upload-catalog-none">
              <p class="upload-catalog-hint">No catalog.json detected in the upload. You can select one manually or import without block mapping.</p>
              <label class="upload-select-catalog-btn">
                <input
                  type="file"
                  accept=".json"
                  class="upload-hidden-input"
                  @change="selectManualCatalogFile"
                />
                Select catalog JSON
              </label>
              <p v-if="uploadModalManualError" class="upload-catalog-error">{{ uploadModalManualError }}</p>
            </div>

            <!-- Packages list -->
            <div v-if="uploadModalLocalPackages.length > 0" class="upload-packages-list">
              <span
                v-for="pkg in uploadModalLocalPackages"
                :key="pkg"
                :class="['upload-package-tag', isCatalogMapped(pkg) ? 'tag-mapped' : 'tag-unmapped']"
              >{{ pkg }}</span>
            </div>
          </div>
        </div>

        <div class="upload-modal-footer">
          <button class="upload-btn-cancel" @click="cancelUploadConfirm" :disabled="uploadModalProcessing">Cancel</button>
          <button class="upload-btn-import" @click="confirmUploadImport" :disabled="uploadModalProcessing">
            <span v-if="uploadModalProcessing">Importing…</span>
            <span v-else>Import Project</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Folder Link Modal -->
    <div v-if="showFolderModal" class="folder-modal-overlay" @click.self="cancelFolderSelection">
      <div class="folder-modal-dialog">
        <div class="folder-modal-header">
          <h3>{{ folderModalTitle }}</h3>
          <button class="folder-modal-close" @click="cancelFolderSelection">✕</button>
        </div>
        <div class="folder-modal-body">
          <p class="folder-modal-hint">
            {{ folderModalRequireEmpty
              ? 'Enter the path to an empty or new folder. Project files will sync there instantly as you code.'
              : 'Enter the path to your existing project folder to keep files in sync.' }}
          </p>
          <input
            ref="folderPathInput"
            v-model="folderPathInput"
            class="folder-path-input"
            :placeholder="'e.g. ' + (isDevelopment ? 'C:\\Users\\You\\Projects\\MyML' : '/home/you/projects/myml')"
            @keyup.enter="confirmFolderSelection"
            spellcheck="false"
            autocomplete="off"
          />
          <p v-if="folderModalError" class="folder-modal-error">{{ folderModalError }}</p>
          <p class="folder-modal-note">Requires the desktop agent to be running. You can skip and link later.</p>
        </div>
        <div class="folder-modal-actions">
          <button class="folder-btn-skip" @click="cancelFolderSelection">Skip for now</button>
          <button class="folder-btn-confirm" @click="confirmFolderSelection">Link &amp; Sync</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import HeroSection from '../components/homepage/HeroSection.vue';
import ProjectTemplates from '../components/homepage/ProjectTemplates.vue';
import LoadFromLocal from '../components/homepage/LoadFromLocal.vue';
import RecentProjects from '../components/homepage/RecentProjects.vue';
import AgentSetup from '../components/homepage/AgentSetup.vue';
import QuickStartGuide from '../components/homepage/QuickStartGuide.vue';
import BaseFooter from '../components/base/BaseFooter.vue';
import ServerManagementModal from '../components/modals/ServerManagementModal.vue';
import { deleteProjectFiles, saveProjectFiles } from '../services/project/projectFileStore';
import { discoverAvailableServerPorts, getProjectFolderLink, linkProjectFolder, syncProjectFiles, verifyServerPort } from '../services/agent/desktopAgentClient';
import { CATALOG_SECTIONS } from '../services/catalog/catalogMapping';
import { createTemplateBlocks, PROJECT_TEMPLATES } from '../services/project/projectTemplates';
import { loadAllTemplateMetadata, loadFullTemplate } from '../services/project/templateLoader';

export default {
  name: 'HomePageView',
  components: {
    HeroSection,
    ProjectTemplates,
    LoadFromLocal,
    RecentProjects,
    AgentSetup,
    QuickStartGuide,
    BaseFooter,
    ServerManagementModal
  },
  // ...existing code...
  data() {
    return {
      showAgentDetails: false,
      selectedPort: 51751,
      showServerManagementModal: false,
      activeModalTab: 'available-ports',
      availableServerPorts: [],
      availablePortsLoading: false,
      availablePortsError: '',
      availablePortsSuccess: '',
      connectingPort: null,
      lastConnectedPort: null,
      customPortConnecting: false,
      customPortVerified: null,
      customPortValue: null,
      customPortError: '',
      customPortSuccess: '',
      troubleshootFeedbackMessage: '',
      troubleshootFeedbackType: 'info',
      troubleshootFeedbackTimer: null,
      pendingStatusCheck: false,
      pendingRestartAction: false,
      checkingStatus: false,
      isDevelopment: process.env.NODE_ENV !== 'production',
      projectTemplates: [...PROJECT_TEMPLATES],
      recentProjects: [],
      showDeleteModal: false,
      projectToDelete: null,
      showCatalogEditor: false,
      catalogEditorMode: 'visual',
      catalogEditorAction: 'open',
      catalogEditorMessage: '',
      catalogDraft: [],
      jsonEditorValue: '',
      pendingProject: null,
      showFolderModal: false,
      folderModalProject: null,
      folderModalRequireEmpty: false,
      folderModalTitle: 'Select Project Folder',
      folderPathInput: '',
      folderModalError: '',
      folderModalResolve: null,
      folderModalReject: null,
      catalogSections: [...CATALOG_SECTIONS],
      // Upload confirmation modal
      showUploadModal: false,
      uploadModalFolderName: '',
      uploadModalFileCount: 0,
      uploadModalPythonFiles: [],
      uploadModalRawFiles: [],
      uploadModalLocalPackages: [],
      uploadModalCatalog: [],
      uploadModalCatalogStatus: 'none',   // 'none' | 'auto' | 'manual'
      uploadModalCatalogError: '',
      uploadModalCatalogWarning: [],
      uploadModalManualError: '',
      uploadModalProcessing: false
    };
  },
  mounted() {
    this.loadRecentProjects();
    this.loadTemplatesFromAssets();
    // Sync selectedPort with actual port from parent
    const currentPort = parseInt(this.desktopAgentHostPort.split(':')[1]) || 51751;
    this.selectedPort = currentPort;
    // Add click outside listener
    document.addEventListener('click', this.handleClickOutside);
    window.addEventListener('mlsphere-open-server-modal', this.openServerManagementModalFromNavbar);
  },
  beforeUnmount() {
    // Remove click outside listener
    document.removeEventListener('click', this.handleClickOutside);
    window.removeEventListener('mlsphere-open-server-modal', this.openServerManagementModalFromNavbar);
    if (this.troubleshootFeedbackTimer) {
      clearTimeout(this.troubleshootFeedbackTimer);
      this.troubleshootFeedbackTimer = null;
    }
  },
  computed: {
    ...mapState('agent', {
      desktopAgentState: 'state',
      desktopAgentRestarting: 'restarting',
      desktopAgentDownloadUrl: 'downloadUrl',
      desktopAgentInstalled: 'installed'
    }),
    ...mapGetters('agent', {
      desktopAgentLabel: 'label',
      desktopAgentHostPort: 'hostPort',
      desktopAgentTooltip: 'tooltip',
      desktopAgentActionLabel: 'actionLabel',
      desktopAgentActionTitle: 'actionTitle'
    }),
    effectiveConnectedPort() {
      // Use lastConnectedPort if recently set (pending prop update)
      if (this.lastConnectedPort !== null) {
        return this.lastConnectedPort;
      }
      // Otherwise use port from prop when online
      if (this.desktopAgentState !== 'online') {
        return null;
      }
      const parsed = parseInt((this.desktopAgentHostPort || '').split(':')[1], 10);
      return Number.isInteger(parsed) ? parsed : null;
    },
    currentConnectedPort() {
      if (this.desktopAgentState !== 'online') {
        return null;
      }
      const parsed = parseInt((this.desktopAgentHostPort || '').split(':')[1], 10);
      return Number.isInteger(parsed) ? parsed : null;
    },
    troubleshootFeedbackIcon() {
      if (this.troubleshootFeedbackType === 'success') return '✅';
      if (this.troubleshootFeedbackType === 'error') return '❌';
      return 'ℹ️';
    },
    lastCheckHint() {
      // Returns a hint about the last server check status
      return '';
    }
  },
  watch: {
    desktopAgentHostPort(newVal) {
      // Keep selectedPort in sync with actual port
      const currentPort = parseInt(newVal.split(':')[1]) || 51751;
      this.selectedPort = currentPort;
    },
    desktopAgentState(newVal) {
      // Resolve pending check status feedback on state update
      if (this.pendingStatusCheck) {
        if (newVal === 'online') {
          this.setTroubleshootFeedback('success', 'Server is online and reachable.', 3500);
          this.pendingStatusCheck = false;
          this.checkingStatus = false;
        } else if (newVal === 'offline') {
          this.setTroubleshootFeedback('error', 'Server is offline or not reachable.', 4000);
          this.pendingStatusCheck = false;
          this.checkingStatus = false;
        }
      }
    },
    desktopAgentRestarting(newVal, oldVal) {
      // Reset checking status when restart completes
      if (!newVal) {
        this.checkingStatus = false;
      }

      if (this.pendingRestartAction && !oldVal && newVal) {
        this.setTroubleshootFeedback('info', 'Restarting server...', 0);
      }

      if (this.pendingRestartAction && oldVal && !newVal) {
        if (this.desktopAgentState === 'online') {
          this.setTroubleshootFeedback('success', 'Server restart completed successfully.', 3500);
        } else {
          this.setTroubleshootFeedback('error', 'Server restart finished but server is still offline.', 4500);
        }
        this.pendingRestartAction = false;
      }
    },
    activeModalTab(newTab) {
      if (newTab === 'available-ports' && this.showServerManagementModal && this.availableServerPorts.length === 0 && !this.availablePortsLoading) {
        this.rescanAvailablePorts();
      }
    }
  },
  methods: {
    scrollToTemplates() {
      const element = document.querySelector('[data-section="templates"]');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    scrollToGuide() {
      const element = document.querySelector('[data-section="quickstart"]');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    downloadInstallerFile(filename) {
      // Create a simple download link approach
      const element = document.createElement('a');
      element.setAttribute('href', `/downloads/local-server/${filename}`);
      element.setAttribute('download', filename);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    },
    handleClickOutside(event) {
      // Check if click is outside the dropdown and widget
      const dropdown = this.$el.querySelector('.agent-details-dropdown');
      const widget = this.$el.querySelector('.agent-status-widget');
      if (dropdown && widget && 
          !dropdown.contains(event.target) && 
          !widget.contains(event.target)) {
        this.showAgentDetails = false;
      }
    },
    selectPort(port) {
      this.selectedPort = port;
      this.$emit('port-changed', port);
    },
    openServerManagementModalFromNavbar() {
      this.openServerManagementModal();
    },
    async openServerManagementModal() {
      this.showServerManagementModal = true;
      this.activeModalTab = 'available-ports';
      this.showAgentDetails = false; // Close dropdown
      this.customPortError = '';
      this.customPortSuccess = '';
      this.availablePortsError = '';
      this.availablePortsSuccess = '';
      this.customPortValue = null;
      await this.rescanAvailablePorts();
    },
    closeServerManagementModal() {
      this.showServerManagementModal = false;
      this.pendingStatusCheck = false;
      this.pendingRestartAction = false;
      if (this.troubleshootFeedbackTimer) {
        clearTimeout(this.troubleshootFeedbackTimer);
        this.troubleshootFeedbackTimer = null;
      }
      this.troubleshootFeedbackMessage = '';
    },
    setTroubleshootFeedback(type, message, duration = 3500) {
      if (this.troubleshootFeedbackTimer) {
        clearTimeout(this.troubleshootFeedbackTimer);
        this.troubleshootFeedbackTimer = null;
      }

      this.troubleshootFeedbackType = type;
      this.troubleshootFeedbackMessage = message;

      if (duration > 0) {
        this.troubleshootFeedbackTimer = setTimeout(() => {
          this.troubleshootFeedbackMessage = '';
          this.troubleshootFeedbackTimer = null;
        }, duration);
      }
    },
    checkServerStatus() {
      this.checkingStatus = true;
      this.pendingStatusCheck = true;
      this.setTroubleshootFeedback('info', 'Checking server status...', 0);
      this.$emit('refresh-agent-status');
      // Reset checking status after timeout to prevent stuck state
      setTimeout(() => {
        if (this.pendingStatusCheck) {
          this.pendingStatusCheck = false;
          this.checkingStatus = false;
          this.setTroubleshootFeedback('error', 'Status check timed out. Please try again.', 4500);
        }
      }, 5000);
    },
    restartServer() {
      this.pendingRestartAction = true;
      this.setTroubleshootFeedback('info', 'Sending restart request...', 0);
      this.$emit('restart-agent');
    },
    async rescanAvailablePorts() {
      if (this.availablePortsLoading || this.connectingPort !== null) {
        return;
      }

      this.availablePortsLoading = true;
      this.availablePortsError = '';
      this.availablePortsSuccess = '';

      try {
        const currentPort = parseInt(this.desktopAgentHostPort.split(':')[1], 10);
        const customPorts = [];
        if (this.customPortValue) {
          customPorts.push(this.customPortValue);
        }
        if (currentPort) {
          customPorts.push(currentPort);
        }
        const result = await discoverAvailableServerPorts(customPorts);
        
        this.availableServerPorts = result.mlsphereServers.sort((a, b) => a.port - b.port);
        
        if (this.availableServerPorts.length > 0) {
          this.availablePortsSuccess = `Found ${this.availableServerPorts.length} MLSphere Server port${this.availableServerPorts.length > 1 ? 's' : ''}.`;
          // Auto-clear success message after 3 seconds
          setTimeout(() => {
            this.availablePortsSuccess = '';
          }, 3000);
        } else {
          this.availablePortsSuccess = '';
          this.availablePortsError = 'No port is serving MLSphere Server.';
          // Auto-clear error message after 3 seconds
          setTimeout(() => {
            this.availablePortsError = '';
          }, 3000);
        }
      } catch (error) {
        this.availableServerPorts = [];
        this.availablePortsError = error?.message || 'Unable to rescan available ports.';
        // Auto-clear error message after 3 seconds
        setTimeout(() => {
          this.availablePortsError = '';
        }, 3000);
      } finally {
        this.availablePortsLoading = false;
      }
    },
    async connectToDetectedPort(port) {
      if (!port || this.connectingPort !== null) {
        return;
      }

      this.connectingPort = port;
      this.availablePortsError = '';
      this.availablePortsSuccess = `Checking MLSphere Server on port ${port}...`;

      try {
        const verified = await verifyServerPort(port);
        if (!verified) {
          throw new Error(`Port ${port} is not serving MLSphere.`);
        }

        this.selectedPort = port;
        this.lastConnectedPort = port;
        this.$emit('port-changed', port);
        this.availablePortsSuccess = `Connected to MLSphere on port ${port}.`;
        
        // Clear lastConnectedPort after a delay to sync with prop update
        setTimeout(() => {
          this.lastConnectedPort = null;
        }, 1000);
      } catch (error) {
        this.availablePortsError = error?.message || `Failed to connect to port ${port}.`;
        this.availablePortsSuccess = '';
        this.lastConnectedPort = null;
      } finally {
        this.connectingPort = null;
      }
    },
    async connectToCustomPort() {
      if (!this.customPortValue || this.customPortValue < 1024 || this.customPortValue > 65535) {
        this.customPortError = 'Please enter a valid port number (1024-65535)';
        this.customPortSuccess = '';
        setTimeout(() => {
          this.customPortError = '';
        }, 3000);
        return;
      }
      
      if (this.customPortConnecting) {
        return;
      }

      this.customPortConnecting = true;
      this.customPortError = '';
      this.customPortSuccess = `Checking MLSphere Server on port ${this.customPortValue}...`;

      try {
        const verified = await verifyServerPort(this.customPortValue);
        if (!verified) {
          throw new Error(`Port ${this.customPortValue} is not serving MLSphere.`);
        }

        this.selectedPort = this.customPortValue;
        this.customPortVerified = this.customPortValue;
        this.lastConnectedPort = this.customPortValue;
        this.$emit('port-changed', this.customPortValue);
        this.customPortSuccess = `Connected to MLSphere on port ${this.customPortValue}.`;
        this.availablePortsSuccess = this.customPortSuccess;
        this.availablePortsError = '';
        
        // Clear lastConnectedPort after a delay to sync with prop update
        setTimeout(() => {
          this.lastConnectedPort = null;
        }, 1000);
        
        setTimeout(() => {
          this.customPortSuccess = '';
        }, 3000);
      } catch (error) {
        this.customPortError = error?.message || 'Unable to connect to this custom port.';
        this.customPortSuccess = '';
        this.lastConnectedPort = null;
        setTimeout(() => {
          this.customPortError = '';
        }, 3000);
      } finally {
        this.customPortConnecting = false;
      }
    },
    openCustomPortModal() {
      this.showCustomPortModal = true;
      this.customPortError = '';
      this.customPortSuccess = '';
      this.customPortValue = null;
      this.$nextTick(() => {
        if (this.$refs.customPortInput) {
          this.$refs.customPortInput.focus();
        }
      });
    },
    closeCustomPortModal() {
      this.showCustomPortModal = false;
      this.customPortError = '';
      this.customPortSuccess = '';
    },
    async testAndConnectCustomPort() {
      if (!this.customPortValue || this.customPortValue < 1024 || this.customPortValue > 65535) {
        this.customPortError = 'Please enter a valid port number (1024-65535)';
        return;
      }
      
      if (this.customPortConnecting) {
        return;
      }

      this.customPortConnecting = true;
      this.customPortError = '';
      this.customPortSuccess = `Checking MLSphere Server on port ${this.customPortValue}...`;

      try {
        const verified = await verifyServerPort(this.customPortValue);
        if (!verified) {
          throw new Error(`Port ${this.customPortValue} is not serving MLSphere.`);
        }

        this.selectedPort = this.customPortValue;
        this.customPortVerified = this.customPortValue;
        this.lastConnectedPort = this.customPortValue;
        this.$emit('port-changed', this.customPortValue);
        this.customPortSuccess = `Connected to MLSphere on port ${this.customPortValue}.`;
        setTimeout(() => {
          this.lastConnectedPort = null;
        }, 1000);
        setTimeout(() => {
          this.closeCustomPortModal();
        }, 800);
      } catch (error) {
        this.customPortError = error?.message || 'Unable to connect to this custom port.';
        this.customPortSuccess = '';
        this.lastConnectedPort = null;
      } finally {
        this.customPortConnecting = false;
      }
    },
    async loadTemplatesFromAssets() {
      try {
        const templates = await loadAllTemplateMetadata();
        if (templates && templates.length > 0) {
          this.projectTemplates = templates;
        }
      } catch (error) {
        // Keep static PROJECT_TEMPLATES as fallback
        console.warn('[Dashboard] Could not load templates from assets, using defaults:', error.message);
      }
    },

    async selectTemplate(template) {
      // Load the full template (blocks with real source code) from the centralized folder
      let fullTemplate = null;
      try {
        if (template.id !== 'blank') {
          fullTemplate = await loadFullTemplate(template.id);
        }
      } catch (error) {
        console.warn('[Dashboard] Could not load template files, falling back to built-in code:', error.message);
      }

      // Use catalog from the loaded template file; fall back to getTemplateCatalog for legacy support
      const blockCatalog = (fullTemplate && Array.isArray(fullTemplate.catalog) && fullTemplate.catalog.length > 0)
        ? fullTemplate.catalog
        : this.getTemplateCatalog(template.id);

      // Build blocks: prefer loaded-from-assets code, fall back to projectTemplates.js code
      let blocks;
      if (fullTemplate && fullTemplate.blocks && fullTemplate.blocks.length > 0) {
        blocks = fullTemplate.blocks.map(b => ({
          ...b,
          id: this.generateBlockId(),
          output: '',
          status: 'idle',
        }));
      } else {
        blocks = this.getTemplateBlocks(template.id);
      }

      // Build pythonFiles from allFiles so the Files tab shows the file tree
      const pythonFiles = (fullTemplate && Array.isArray(fullTemplate.allFiles))
        ? fullTemplate.allFiles.map(f => {
            const pathStr = String(f.path || '');
            const name = pathStr.split('/').filter(Boolean).pop() || pathStr;
            return { name, path: pathStr, relativePath: pathStr, content: String(f.content || '') };
          })
        : [];

      const newProject = {
        id: Date.now(),
        name: `${template.name} Project`,
        type: template.type,
        template: template.id,
        icon: template.icon,
        description: template.description,
        features: template.features,
        createdAt: new Date(),
        lastModified: new Date(),
        blocks,
        pythonFiles,
        config: {
          ...this.getTemplateConfig(template.id),
          blockCatalog,
          catalogStatus: 'provided',
        }
      };

      try {
        await this.ensureProjectFolderLink(newProject, { requireEmpty: true });
        // Sync the real source files (src/*.py, requirements.txt, catalog.json) to disk
        await this.syncTemplateFilesToDisk(newProject, fullTemplate);
      } catch (error) {
        console.log('[Dashboard] Project creation aborted — folder not linked:', error.message);
        return;
      }

      if (pythonFiles.length > 0) {
        await saveProjectFiles(newProject.id, pythonFiles);
      }

      this.saveProjectToStorage(newProject);
      this.addToRecentProjects(newProject);
      this.$emit('project-selected', newProject);
    },

    getTemplateCatalog(templateId) {
      // Legacy fallback — per-template catalog.json is now preferred via templateLoader
      const legacyMap = {};
      const entries = Array.isArray(legacyMap[templateId]) ? legacyMap[templateId] : [];
      return entries.map(entry => ({
        package: String(entry.package || '').trim(),
        blockName: String(entry.blockName || '').trim(),
        section: String(entry.section || 'Uncategorized').trim() || 'Uncategorized'
      }));
    },

    generateBlockId() {
      return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    getTemplateBlocks(templateId) {
      return createTemplateBlocks(
        templateId,
        () => this.generateBlockId(),
        this.getTemplateCatalog(templateId)
      );
    },

    getTemplateConfig(templateId) {
      return {
        template: templateId,
        createdAt: new Date().toISOString(),
        version: '1.0'
      };
    },

    async loadFromPythonProject(event) {
      const fileList = Array.from(event.target.files || []);
      // Reset the input so re-selecting the same folder triggers change again
      if (event.target) event.target.value = '';
      if (fileList.length === 0) return;

      const pythonFiles = await Promise.all(fileList.map(async (file) => {
        const relativePath = file.webkitRelativePath || file.path || file.name;
        const content = await this.readUploadedFileContent(file);
        return { name: file.name, path: relativePath, relativePath, size: file.size, type: file.type, content };
      }));

      const folderName = (pythonFiles[0]?.path || '').split(/[/\\]/).filter(Boolean)[0] || 'Python Project';
      const localPackages = this.extractLocalPackagesFromFiles(pythonFiles);

      // Auto-detect catalog: look for catalog.json or ml-blocks.catalog.json anywhere in the upload
      const catalogFile = fileList.find(file => {
        const p = (file.webkitRelativePath || file.name || '').toLowerCase();
        return p.endsWith('catalog.json') || p.endsWith('ml-blocks.catalog.json');
      });

      let autoCatalog = [];
      let autoCatalogStatus = 'none';
      if (catalogFile) {
        try {
          const content = await catalogFile.text();
          autoCatalog = this.parseCatalogFromText(content);
          autoCatalogStatus = 'auto';
        } catch (e) {
          console.warn('[Dashboard] Could not parse auto-detected catalog:', e.message);
        }
      }

      // Stage into upload modal
      this.uploadModalFolderName = folderName;
      this.uploadModalFileCount = fileList.length;
      this.uploadModalPythonFiles = pythonFiles;
      this.uploadModalRawFiles = fileList;
      this.uploadModalLocalPackages = localPackages;
      this.uploadModalCatalog = autoCatalog;
      this.uploadModalCatalogStatus = autoCatalogStatus;
      this.uploadModalCatalogError = '';
      this.uploadModalManualError = '';
      this.uploadModalProcessing = false;
      this.showUploadModal = true;
    },

    cancelUploadConfirm() {
      this.showUploadModal = false;
      this.uploadModalPythonFiles = [];
      this.uploadModalRawFiles = [];
      this.uploadModalCatalog = [];
      this.uploadModalCatalogStatus = 'none';
      this.uploadModalCatalogError = '';
      this.uploadModalCatalogWarning = [];
      this.uploadModalManualError = '';
    },

    async selectManualCatalogFile(event) {
      const file = event.target.files?.[0];
      if (event.target) event.target.value = '';
      if (!file) return;

      // Validate: must be a .json file
      const name = (file.name || '').toLowerCase();
      if (!name.endsWith('.json')) {
        this.uploadModalManualError = `"${file.name}" is not a JSON file. Please select a .json catalog file.`;
        this.uploadModalCatalogStatus = 'manual';
        this.uploadModalCatalog = [];
        this.uploadModalCatalogError = '';
        return;
      }

      let parsed = [];
      try {
        const text = await file.text();
        parsed = this.parseCatalogFromText(text);
      } catch (e) {
        this.uploadModalManualError = `Failed to parse "${file.name}": ${e.message}`;
        this.uploadModalCatalogStatus = 'manual';
        this.uploadModalCatalog = [];
        this.uploadModalCatalogError = '';
        return;
      }

      if (parsed.length === 0) {
        this.uploadModalManualError = `"${file.name}" parsed but contained no valid package entries.`;
        this.uploadModalCatalogStatus = 'manual';
        this.uploadModalCatalog = [];
        return;
      }

      // Validate packages — failures become warnings, not hard errors
      const missing = this.validateCatalogPackages(parsed, this.uploadModalPythonFiles);
      this.uploadModalCatalog = parsed;
      this.uploadModalCatalogStatus = 'manual';
      this.uploadModalCatalogError = '';
      this.uploadModalCatalogWarning = missing;
      this.uploadModalManualError = '';
    },

    validateCatalogPackages(catalog, allFiles = []) {
      // Build a set of all known relative paths AND individual segment names
      // derived from every file path in the upload.
      // e.g. file "myproject/src/data/__init__.py" adds: "src", "src/data", "data"
      const knownPaths = new Set();
      allFiles.forEach(file => {
        const normalized = String(file.path || file.relativePath || '').replace(/\\/g, '/');
        const parts = normalized.split('/').filter(Boolean);
        // Skip parts[0] (the uploaded root folder name)
        for (let i = 1; i < parts.length; i++) {
          knownPaths.add(parts[i].toLowerCase());                      // single segment
          knownPaths.add(parts.slice(1, i + 1).join('/').toLowerCase()); // full sub-path
        }
      });

      // Return array of missing package names (empty = all matched)
      return catalog
        .map(e => e.package)
        .filter(pkg => {
          if (!pkg) return false;
          const pkgNorm = pkg.toLowerCase().replace(/\\/g, '/');
          if (knownPaths.has(pkgNorm)) return false;
          // Backward compat: also check last segment only
          const lastSeg = pkgNorm.split('/').pop();
          return !knownPaths.has(lastSeg);
        });
    },

    isCatalogMapped(pkg) {
      const detectedLower = pkg.toLowerCase().replace(/\\/g, '/');
      const detectedLast = detectedLower.split('/').pop();
      return this.uploadModalCatalog.some(e => {
        const catalogPkg = (e.package || '').toLowerCase().replace(/\\/g, '/');
        const catalogLast = catalogPkg.split('/').pop();
        return catalogPkg === detectedLower ||
          catalogLast === detectedLast ||
          catalogPkg.endsWith('/' + detectedLast) ||
          detectedLower.endsWith('/' + catalogLast);
      });
    },

    async confirmUploadImport() {
      const pythonFiles = this.uploadModalPythonFiles;
      const folderName = this.uploadModalFolderName;
      const localPackages = this.uploadModalLocalPackages;
      let blockCatalog = this.uploadModalCatalog;

      // Validate — missing packages become a stored warning, never a blocker
      if (blockCatalog.length > 0) {
        const missing = this.validateCatalogPackages(blockCatalog, pythonFiles);
        this.uploadModalCatalogWarning = missing;
      }

      const hasCatalog = blockCatalog.length > 0 && !this.uploadModalCatalogError;
      if (!hasCatalog) blockCatalog = [];

      const mappedPackageSet = new Set(blockCatalog.map(entry => entry.package));
      const unmappedPackages = localPackages.filter(pkg => !mappedPackageSet.has(pkg));

      const projectCatalogStatus = hasCatalog ? 'provided' : 'unmapped';

      const project = {
        id: Date.now(),
        name: folderName,
        icon: '🐍',
        description: `Import existing Python project with ${pythonFiles.length} files`,
        features: ['Python Files', hasCatalog ? 'Catalog Provided' : 'Manual Mapping', `${localPackages.length} Packages`],
        type: 'python-import',
        lastModified: new Date(),
        blocks: hasCatalog ? this.buildBlocksFromCatalog(blockCatalog) : [],
        pythonFiles,
        config: {
          importType: 'python-packages',
          createdAt: new Date().toISOString(),
          blockCatalog,
          catalogStatus: projectCatalogStatus,
          localPackages,
          unmappedPackages,
          openCatalogOnLoad: !hasCatalog
        }
      };

      this.uploadModalProcessing = true;
      this.showUploadModal = false;

      await saveProjectFiles(project.id, pythonFiles);
      this.saveProjectToStorage(project);
      this.addToRecentProjects(project);
      this.uploadModalProcessing = false;
      this.$emit('project-selected', project);
    },

    normalizeProjectFilePath(pathValue) {
      return String(pathValue || '').replace(/\\/g, '/').split('/').filter(Boolean).join('/');
    },

    toRelativeSyncPath(pathValue) {
      const normalized = this.normalizeProjectFilePath(pathValue);
      const parts = normalized.split('/').filter(Boolean);
      if (parts.length <= 1) {
        return normalized;
      }
      return parts.slice(1).join('/');
    },

    async ensureProjectFolderLink(project, options = {}) {
      const projectId = String(project?.id || '');
      if (!projectId) {
        throw new Error('Missing project id');
      }

      try {
        const existing = await getProjectFolderLink(projectId);
        if (existing?.linked && existing?.localRootPath) {
          return existing.localRootPath;
        }
      } catch (error) {
        // Ignore and continue with modal flow
      }

      const requireEmpty = Boolean(options.requireEmpty);
      // Modal handles linking internally with error display
      const selectedPath = await this.showFolderSelectionModal(project, requireEmpty);
      
      if (!selectedPath || !selectedPath.trim()) {
        throw new Error('No local folder selected');
      }

      return selectedPath.trim();
    },

    showFolderSelectionModal(project, requireEmpty = false) {
      return new Promise((resolve, reject) => {
        this.folderModalProject = project;
        this.folderModalRequireEmpty = requireEmpty;
        this.folderModalTitle = requireEmpty ? 'Create New Project Folder' : 'Select Existing Project Folder';
        this.folderPathInput = '';
        this.folderModalError = '';
        this.folderModalResolve = resolve;
        this.folderModalReject = reject;
        this.showFolderModal = true;
        
        // Focus input after modal renders
        this.$nextTick(() => {
          if (this.$refs.folderPathInput) {
            this.$refs.folderPathInput.focus();
          }
        });
      });
    },

    async confirmFolderSelection() {
      const path = this.folderPathInput.trim();
      if (!path) {
        this.folderModalError = 'Please enter or select a folder path.';
        return;
      }

      try {
        this.folderModalError = '';
        const projectId = String(this.folderModalProject?.id || '');
        
        // Link the folder via desktop agent
        if (projectId && path) {
          await linkProjectFolder(projectId, path, { requireEmpty: this.folderModalRequireEmpty });
          console.log('[Dashboard] Project folder linked:', projectId, path);
        }
        
        if (this.folderModalResolve) {
          this.folderModalResolve(path);
        }
        this.closeFolderModal();
      } catch (error) {
        console.error('[Dashboard] Error confirming folder:', error);
        this.folderModalError = error.message || 'Failed to save folder. Please try again.';
      }
    },

    cancelFolderSelection() {
      if (this.folderModalReject) {
        this.folderModalReject(new Error('Folder selection cancelled'));
      }
      this.closeFolderModal();
    },

    closeFolderModal() {
      this.showFolderModal = false;
      this.folderModalProject = null;
      this.folderModalRequireEmpty = false;
      this.folderPathInput = '';
      this.folderModalError = '';
      this.folderModalResolve = null;
      this.folderModalReject = null;
    },

    async syncImportedFilesToLinkedFolder(project) {
      const projectId = String(project?.id || '');
      if (!projectId) {
        return;
      }

      const files = Array.isArray(project?.pythonFiles)
        ? project.pythonFiles.map(file => ({
          path: this.toRelativeSyncPath(file?.relativePath || file?.path || ''),
          content: typeof file?.content === 'string' ? file.content : ''
        })).filter(file => file.path)
        : [];

      if (files.length === 0) {
        return;
      }

      await syncProjectFiles(projectId, files);
    },

    async syncTemplateFilesToDisk(project, fullTemplate = null) {
      const projectId = String(project?.id || '');
      if (!projectId) return;

      let files = [];

      if (fullTemplate && Array.isArray(fullTemplate.allFiles) && fullTemplate.allFiles.length > 0) {
        // Use the real source files from the centralized template folder
        files = fullTemplate.allFiles
          .filter(f => f && f.path)
          .map(f => ({ path: String(f.path), content: String(f.content || '') }));
      } else {
        // Fallback: write each block's code to src/<safe_name>.py
        const blocks = Array.isArray(project?.blocks) ? project.blocks : [];
        blocks.forEach((block, index) => {
          if (!block) return;
          const safeName = String(block.name || `block_${index + 1}`)
            .toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || `block_${index + 1}`;
          const code = typeof block.code === 'string' ? block.code : (block.defaultCode || '');
          files.push({ path: `src/${safeName}.py`, content: code });
        });
        files.push({ path: 'requirements.txt', content: '# Add your Python package dependencies here\n' });
      }

      // Also sync catalog.json (block ↔ package mapping)
      const catalog = project?.config?.blockCatalog;
      if (Array.isArray(catalog) && catalog.length > 0) {
        files.push({ path: 'catalog.json', content: JSON.stringify(catalog, null, 2) });
      }

      if (files.length > 0) {
        await syncProjectFiles(projectId, files);
        console.log(`[Dashboard] Synced ${files.length} template files to disk for project ${projectId}`);
      }
    },

    getBlockPackageNameForTemplate(block, project) {
      // Try to get package from catalog mapping
      const catalog = Array.isArray(project?.config?.blockCatalog) 
        ? project.config.blockCatalog 
        : [];
      
      const entry = catalog.find(e => String(e.blockName).trim() === String(block.name || '').trim());
      if (entry?.package) {
        return String(entry.package).trim();
      }

      // Fallback to block type or generic name
      const fallbackName = (block.type || block.name || 'custom_block')
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      
      return fallbackName || 'custom_block';
    },

    editProjectCatalog(project) {
      const existingCatalog = this.getCatalogFromProject(project);
      this.pendingProject = {
        ...project,
        config: {
          ...(project.config || {}),
          blockCatalog: existingCatalog
        }
      };
      this.catalogDraft = existingCatalog.map(entry => ({ ...entry }));
      this.catalogEditorMode = 'visual';
      this.catalogEditorAction = 'edit';
      this.catalogEditorMessage = `Editing catalog for ${project.name}. Save to update package-to-section mapping.`;
      this.jsonEditorValue = JSON.stringify(this.catalogDraft, null, 2);
      this.showCatalogEditor = true;
    },

    getCatalogFromProject(project) {
      const explicitCatalog = project && project.config && Array.isArray(project.config.blockCatalog)
        ? project.config.blockCatalog
        : [];

      if (explicitCatalog.length > 0) {
        return explicitCatalog.map(entry => ({
          package: String(entry.package || '').trim(),
          blockName: String(entry.blockName || this.packageToBlockName(entry.package)).trim(),
          section: this.catalogSections.includes(entry.section) ? entry.section : 'Uncategorized'
        })).filter(entry => entry.package);
      }

      const fallbackBlocks = Array.isArray(project?.blocks) ? project.blocks : [];
      return fallbackBlocks.map((block, index) => {
        const packageName = Array.isArray(block.packages) && block.packages.length
          ? String(block.packages[0])
          : `package_${index + 1}`;
        return {
          package: packageName,
          blockName: String(block.name || this.packageToBlockName(packageName)).trim(),
          section: this.catalogSections.includes(block.category) ? block.category : 'Uncategorized'
        };
      });
    },

    extractLocalPackagesFromFiles(files) {
      const packagePaths = new Set();

      // Primary: detect Python packages by finding __init__.py files.
      // File path "project/src/data/__init__.py" → package path "src/data"
      files.forEach(file => {
        const normalized = String(file.path || file.relativePath || '').replace(/\\/g, '/');
        if (!normalized.toLowerCase().endsWith('/__init__.py')) return;
        const parts = normalized.split('/').filter(Boolean);
        // parts: [rootFolder, ...dirs, '__init__.py'] — need at least 3 parts
        if (parts.length >= 3) {
          packagePaths.add(parts.slice(1, -1).join('/'));
        }
      });

      // Fallback: no __init__.py found — use top-level non-hidden directories
      if (packagePaths.size === 0) {
        files.forEach(file => {
          const normalized = String(file.path || '').replace(/\\/g, '/');
          const parts = normalized.split('/').filter(Boolean);
          if (parts.length > 1 && !parts[1].startsWith('.')) {
            packagePaths.add(parts[1]);
          }
        });
      }

      return Array.from(packagePaths).sort((a, b) => a.localeCompare(b));
    },

    isLikelyTextFile(file) {
      const fileName = String(file?.name || '').toLowerCase();
      const mimeType = String(file?.type || '').toLowerCase();

      if (mimeType.startsWith('text/')) {
        return true;
      }

      return [
        '.py', '.pyi', '.txt', '.md', '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg',
        '.csv', '.tsv', '.js', '.ts', '.vue', '.html', '.css', '.scss', '.xml', '.sql',
        '.sh', '.bat', '.ps1', '.ipynb', '.env', '.gitignore'
      ].some(ext => fileName.endsWith(ext));
    },

    isImageFile(file) {
      const fileName = String(file?.name || '').toLowerCase();
      const mimeType = String(file?.type || '').toLowerCase();

      if (mimeType.startsWith('image/')) {
        return true;
      }

      return ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'].some(ext => fileName.endsWith(ext));
    },

    readImageFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => reject(reader.error || new Error('Failed to read image'));
        reader.readAsDataURL(file);
      });
    },

    async readUploadedFileContent(file) {
      try {
        if (this.isImageFile(file)) {
          return await this.readImageFileAsDataUrl(file);
        }
        if (!this.isLikelyTextFile(file)) {
          return '';
        }
        return await file.text();
      } catch (error) {
        console.warn(`Unable to read content for ${file?.name || 'unknown file'}:`, error);
        return '';
      }
    },

    extractCatalogFromPythonFiles(pythonFiles) {
      const packages = new Set();

      pythonFiles
        .filter(file => String(file.path || '').toLowerCase().endsWith('.py'))
        .forEach(file => {
          const normalizedPath = String(file.path || '').replace(/\\/g, '/');
          const parts = normalizedPath.split('/').filter(Boolean);
          const relativeParts = parts.slice(1);
          const modulePath = relativeParts.slice(0, -1);

          if (modulePath.length > 0) {
            packages.add(modulePath.join('.'));
            return;
          }

          const filename = relativeParts[relativeParts.length - 1] || '';
          const moduleName = filename.replace(/\.py$/i, '');
          if (moduleName && moduleName !== '__init__') {
            packages.add(moduleName);
          }
        });

      return Array.from(packages)
        .sort((a, b) => a.localeCompare(b))
        .map(packageName => ({
          package: packageName,
          blockName: this.packageToBlockName(packageName),
          section: 'Uncategorized'
        }));
    },

    parseCatalogFromText(content) {
      const parsed = JSON.parse(content);
      const entries = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.blocks)
          ? parsed.blocks
          : Array.isArray(parsed.entries)
            ? parsed.entries
            : Array.isArray(parsed.packages)
              ? parsed.packages
              : [];

      return entries
        .map((entry, index) => {
          const packageName = String(entry.package || entry.packageName || entry.module || '').trim();
          const blockName = String(entry.blockName || entry.block || entry.name || this.packageToBlockName(packageName || `package_${index + 1}`)).trim();
          const requestedSection = String(entry.section || entry.category || 'Uncategorized').trim() || 'Uncategorized';
          const section = this.catalogSections.includes(requestedSection) ? requestedSection : 'Uncategorized';

          return {
            package: packageName,
            blockName,
            section
          };
        })
        .filter(entry => entry.package);
    },

    packageToBlockName(packageName) {
      return String(packageName || '')
        .split('.')
        .pop()
        .split(/[_-]/g)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'Custom Block';
    },

    updateJsonFromVisual() {
      this.jsonEditorValue = JSON.stringify(this.catalogDraft, null, 2);
    },

    switchCatalogEditorMode(mode) {
      if (mode === this.catalogEditorMode) {
        return;
      }

      if (mode === 'json') {
        this.updateJsonFromVisual();
      } else {
        try {
          this.catalogDraft = this.parseCatalogFromText(this.jsonEditorValue);
        } catch (error) {
          alert(`Invalid JSON: ${error.message}`);
          return;
        }
      }

      this.catalogEditorMode = mode;
    },

    addCatalogRow() {
      this.catalogDraft.push({
        package: '',
        blockName: '',
        section: 'Uncategorized'
      });
      this.updateJsonFromVisual();
    },

    removeCatalogRow(index) {
      this.catalogDraft.splice(index, 1);
      this.updateJsonFromVisual();
    },

    buildBlocksFromCatalog(catalogEntries) {
      return catalogEntries.map(entry => ({
        id: this.generateBlockId(),
        type: 'PythonPackageBlock',
        name: entry.blockName || this.packageToBlockName(entry.package),
        icon: this.getSectionIcon(entry.section),
        category: entry.section || 'Uncategorized',
        config: {
          package: entry.package,
          source: 'python-package'
        },
        inputs: [],
        outputs: [],
        packages: [entry.package],
        code: '',
        status: 'idle'
      }));
    },

    getSectionIcon(section) {
      const iconMap = {
        Data: '📊',
        Processing: '⚙️',
        Feature: '🔧',
        Model: '🧠',
        Training: '🏋️',
        Evaluation: '📊',
        Visualization: '📈',
        Analysis: '🔍',
        Uncategorized: '📦'
      };

      return iconMap[section] || '📦';
    },

    closeCatalogEditor() {
      this.showCatalogEditor = false;
      this.catalogEditorMode = 'visual';
      this.catalogEditorAction = 'open';
      this.catalogEditorMessage = '';
      this.catalogDraft = [];
      this.jsonEditorValue = '';
      this.pendingProject = null;
    },

    openUncategorizedProject() {
      if (!this.pendingProject) {
        this.closeCatalogEditor();
        return;
      }

      const project = {
        ...this.pendingProject,
        blocks: this.buildBlocksFromCatalog(this.pendingProject.config.blockCatalog || []),
        lastModified: new Date()
      };

      this.saveProjectToStorage(project);
      this.addToRecentProjects(project);
      this.$emit('project-selected', project);
      this.closeCatalogEditor();
    },

    saveCatalogAndOpenProject() {
      if (!this.pendingProject) {
        this.closeCatalogEditor();
        return;
      }

      let resolvedCatalog = this.catalogDraft;
      if (this.catalogEditorMode === 'json') {
        try {
          resolvedCatalog = this.parseCatalogFromText(this.jsonEditorValue);
        } catch (error) {
          alert(`Invalid JSON: ${error.message}`);
          return;
        }
      }

      const sanitizedCatalog = resolvedCatalog
        .map(entry => ({
          package: String(entry.package || '').trim(),
          blockName: String(entry.blockName || this.packageToBlockName(entry.package)).trim(),
          section: this.catalogSections.includes(entry.section) ? entry.section : 'Uncategorized'
        }))
        .filter(entry => entry.package);

      if (sanitizedCatalog.length === 0) {
        alert('Add at least one package mapping before saving.');
        return;
      }

      const hasCategorizedSections = sanitizedCatalog.some(entry => entry.section !== 'Uncategorized');
      const project = {
        ...this.pendingProject,
        lastModified: new Date(),
        blocks: this.buildBlocksFromCatalog(sanitizedCatalog),
        config: {
          ...this.pendingProject.config,
          blockCatalog: sanitizedCatalog,
          catalogStatus: hasCategorizedSections ? 'mapped' : 'uncategorized'
        }
      };

      this.downloadCatalogJson(sanitizedCatalog, project.name);
      this.saveProjectToStorage(project);
      this.addToRecentProjects(project);

      if (this.catalogEditorAction === 'open') {
        this.$emit('project-selected', project);
      }

      this.closeCatalogEditor();
    },

    downloadCatalogJson(entries, projectName) {
      const payload = {
        version: '1.0',
        createdAt: new Date().toISOString(),
        project: projectName,
        blocks: entries
      };

      const dataStr = JSON.stringify(payload, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const link = document.createElement('a');
      link.setAttribute('href', dataUri);
      link.setAttribute('download', 'ml-blocks.catalog.json');
      link.click();
    },

    loadProject(project) {
      this.$emit('project-selected', project);
    },

    deleteProject(projectId) {
      const project = this.recentProjects.find(p => p.id === projectId);
      if (project) {
        this.projectToDelete = project;
        this.showDeleteModal = true;
      }
    },

    async confirmDelete() {
      if (!this.projectToDelete) return;
      try {
        await deleteProjectFiles(this.projectToDelete.id);
        const projects = JSON.parse(localStorage.getItem('ml_projects') || '[]');
        const filtered = projects.filter(project => project.id !== this.projectToDelete.id);
        localStorage.setItem('ml_projects', JSON.stringify(filtered));
        this.recentProjects = this.recentProjects.filter(project => project.id !== this.projectToDelete.id);
      } catch (error) {
        console.error('Error deleting project:', error);
      }
      this.cancelDelete();
    },

    cancelDelete() {
      this.showDeleteModal = false;
      this.projectToDelete = null;
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
      try {
        const projects = JSON.parse(localStorage.getItem('ml_projects') || '[]');
        const existingIndex = projects.findIndex(p => p.id === project.id);
        const safeProject = this.makeStorageSafeProject(project);
        
        if (existingIndex >= 0) {
          projects[existingIndex] = safeProject;
        } else {
          projects.push(safeProject);
        }

        try {
          localStorage.setItem('ml_projects', JSON.stringify(projects));
        } catch (storageError) {
          const isQuotaError = storageError && (storageError.name === 'QuotaExceededError' || storageError.code === 22);
          if (!isQuotaError) {
            throw storageError;
          }

          const minimalSafeProject = this.makeStorageSafeProject(project, { minimal: true });
          if (existingIndex >= 0) {
            projects[existingIndex] = minimalSafeProject;
          } else {
            projects.push(minimalSafeProject);
          }

          localStorage.setItem('ml_projects', JSON.stringify(projects));
        }
      } catch (error) {
        console.error('Error saving project:', error);
      }
    },

    loadRecentProjects() {
      try {
        const projects = JSON.parse(localStorage.getItem('ml_projects') || '[]');
        this.recentProjects = projects
          .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
          .slice(0, 5);
      } catch (error) {
        console.error('Error loading projects:', error);
        this.recentProjects = [];
      }
    },

    addToRecentProjects(project) {
      const existing = this.recentProjects.findIndex(p => p.id === project.id);
      if (existing >= 0) {
        this.recentProjects.splice(existing, 1);
      }
      this.recentProjects.unshift(project);
      this.recentProjects = this.recentProjects.slice(0, 5);
    },

    formatDate(date) {
      if (!date) return 'Never';
      const d = new Date(date);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }
};
</script>

<style src="../components/dashboard.css"></style>

<style scoped>
/* Delete Project Modal */
.delete-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.delete-modal-dialog {
  background: #1a1d27;
  border: 1px solid rgba(244, 67, 54, 0.25);
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
  overflow: hidden;
}
.delete-modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 24px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}
.delete-modal-icon { font-size: 22px; }
.delete-modal-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #f1f1f1;
}
.delete-modal-body {
  padding: 20px 24px;
  color: rgba(255,255,255,0.75);
  font-size: 14px;
  line-height: 1.6;
}
.delete-modal-body strong { color: #fff; }
.delete-modal-warning {
  margin-top: 10px;
  color: rgba(244, 67, 54, 0.85);
  font-size: 13px;
}
.delete-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px 20px;
  border-top: 1px solid rgba(255,255,255,0.07);
}
.delete-modal-cancel {
  padding: 9px 18px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.75);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.delete-modal-cancel:hover {
  background: rgba(255,255,255,0.12);
  color: #fff;
}
.delete-modal-confirm {
  padding: 9px 18px;
  border-radius: 8px;
  border: none;
  background: #e53935;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.delete-modal-confirm:hover {
  background: #c62828;
  transform: translateY(-1px);
}

/* Folder Link Modal */
.folder-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(6px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.folder-modal-dialog {
  background: #1a1d27;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
}

.folder-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.folder-modal-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #fff;
}

.folder-modal-close {
  background: rgba(255,255,255,0.08);
  border: none;
  color: rgba(255,255,255,0.6);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.folder-modal-close:hover {
  background: rgba(255,255,255,0.16);
  color: #fff;
}

.folder-modal-body {
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.folder-modal-hint {
  margin: 0;
  font-size: 13px;
  color: rgba(255,255,255,0.6);
  line-height: 1.5;
}

.folder-path-input {
  width: 100%;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 10px;
  color: #fff;
  padding: 12px 14px;
  font-size: 13px;
  font-family: 'Consolas', 'Courier New', monospace;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.folder-path-input:focus {
  border-color: rgba(255,255,255,0.35);
}

.folder-path-input::placeholder {
  color: rgba(255,255,255,0.3);
}

.folder-modal-error {
  margin: 0;
  font-size: 12px;
  color: #f87171;
}

.folder-modal-note {
  margin: 0;
  font-size: 11px;
  color: rgba(255,255,255,0.35);
}

.folder-modal-actions {
  display: flex;
  gap: 10px;
  padding: 0 24px 20px;
  justify-content: flex-end;
}

.folder-btn-skip {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.55);
  padding: 10px 18px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s;
}

.folder-btn-skip:hover {
  border-color: rgba(255,255,255,0.3);
  color: rgba(255,255,255,0.8);
}

.folder-btn-confirm {
  background: #3d82f6;
  border: none;
  color: #fff;
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  transition: background 0.2s;
}

.folder-btn-confirm:hover {
  background: #2563eb;
}

/* Upload Confirmation Modal */
.upload-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.upload-modal-dialog {
  background: #1a1d27;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.55);
  display: flex;
  flex-direction: column;
}
.upload-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}
.upload-modal-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.upload-modal-icon { font-size: 20px; }
.upload-modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #f1f1f1;
}
.upload-modal-close {
  background: rgba(255,255,255,0.08);
  border: none;
  color: rgba(255,255,255,0.6);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.upload-modal-close:hover { background: rgba(255,255,255,0.16); color: #fff; }
.upload-modal-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.upload-summary {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.upload-summary-item {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 13px;
}
.upload-summary-label {
  color: rgba(255,255,255,0.4);
  min-width: 52px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.upload-summary-value { color: rgba(255,255,255,0.85); }
.upload-catalog-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.upload-catalog-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255,255,255,0.4);
  font-weight: 600;
}
.upload-catalog-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  padding: 10px 14px;
  border-radius: 8px;
}
.upload-catalog-ok {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.25);
  color: #4ade80;
}
.upload-status-icon { font-style: normal; font-weight: 700; }
.upload-catalog-none {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.upload-catalog-hint {
  margin: 0;
  font-size: 12px;
  color: rgba(255,255,255,0.45);
  line-height: 1.5;
}
.upload-catalog-error {
  font-size: 12px;
  color: #f87171;
  padding: 8px 12px;
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.2);
  border-radius: 7px;
}
.upload-catalog-warning {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: #fbbf24;
  padding: 9px 12px;
  background: rgba(251, 191, 36, 0.07);
  border: 1px solid rgba(251, 191, 36, 0.2);
  border-radius: 7px;
  line-height: 1.5;
}
.upload-catalog-warning strong { color: #fde68a; }
.upload-warning-icon { font-style: normal; flex-shrink: 0; margin-top: 1px; }
.upload-select-catalog-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(61, 130, 246, 0.12);
  border: 1px solid rgba(61, 130, 246, 0.3);
  color: #60a5fa;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  width: fit-content;
}
.upload-select-catalog-btn:hover {
  background: rgba(61, 130, 246, 0.2);
  border-color: rgba(61, 130, 246, 0.5);
  color: #93c5fd;
}
.upload-hidden-input {
  display: none;
}
.upload-packages-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.upload-package-tag {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-family: 'Consolas', 'Courier New', monospace;
  font-weight: 600;
}
.tag-mapped {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.25);
  color: #86efac;
}
.tag-unmapped {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.45);
}
.upload-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px 20px;
  border-top: 1px solid rgba(255,255,255,0.07);
}
.upload-btn-cancel {
  padding: 9px 18px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.7);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.upload-btn-cancel:hover:not(:disabled) {
  background: rgba(255,255,255,0.12);
  color: #fff;
}
.upload-btn-cancel:disabled { opacity: 0.4; cursor: not-allowed; }
.upload-btn-import {
  padding: 9px 20px;
  border-radius: 8px;
  border: none;
  background: #3d82f6;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}
.upload-btn-import:hover:not(:disabled) { background: #2563eb; }
.upload-btn-import:disabled { opacity: 0.5; cursor: not-allowed; }
</style>

