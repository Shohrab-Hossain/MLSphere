<template>
  <div class="dashboard">
    <!-- Hero Section -->
    <hero-section 
      @scroll-to-templates="scrollToTemplates"
      @scroll-to-guide="scrollToGuide"
    />

    <div class="dashboard-content">
      <!-- Project Templates Section -->
      <project-templates 
        :templates="projectTemplates"
        @select-template="selectTemplate"
      />

      <!-- Load From Local Section -->
      <load-from-local 
        @load-from-python-project="loadFromPythonProject"
      />

      <!-- Recent Projects Section -->
      <recent-projects 
        :projects="recentProjects"
        @load-project="loadProject"
        @delete-project="deleteProject"
      />

      <!-- Agent Setup Section -->
      <agent-setup 
        :desktopAgentState="desktopAgentState"
        :lastCheckHint="lastCheckHint"
        @download-installer="downloadInstallerFile"
      />

      <!-- Quick Start Guide Section -->
      <quick-start-guide />
    </div>

    <div v-if="showCatalogEditor" class="catalog-modal" @click.self="closeCatalogEditor">
      <div class="catalog-content">
        <div class="catalog-header">
          <h3>Package to Block Mapping</h3>
          <button class="catalog-close-btn" @click="closeCatalogEditor">?</button>
        </div>

        <p class="catalog-message">{{ catalogEditorMessage }}</p>

        <div class="catalog-mode-switch">
          <button
            class="catalog-mode-btn"
            :class="{ active: catalogEditorMode === 'visual' }"
            @click="switchCatalogEditorMode('visual')"
          >
            Visual Mapping
          </button>
          <button
            class="catalog-mode-btn"
            :class="{ active: catalogEditorMode === 'json' }"
            @click="switchCatalogEditorMode('json')"
          >
            JSON Editor
          </button>
        </div>

        <div v-if="catalogEditorMode === 'visual'" class="catalog-visual-editor">
          <div class="catalog-grid-header">
            <span>Package</span>
            <span>Block Name</span>
            <span>Section</span>
            <span></span>
          </div>

          <div v-for="(entry, index) in catalogDraft" :key="`catalog-${index}`" class="catalog-grid-row">
            <input
              v-model.trim="entry.package"
              class="catalog-input"
              placeholder="package.path"
              @input="updateJsonFromVisual"
            />
            <input
              v-model.trim="entry.blockName"
              class="catalog-input"
              placeholder="Block name"
              @input="updateJsonFromVisual"
            />
            <select v-model="entry.section" class="catalog-input" @change="updateJsonFromVisual">
              <option v-for="section in catalogSections" :key="section" :value="section">{{ section }}</option>
            </select>
            <button class="catalog-remove-btn" @click="removeCatalogRow(index)">Remove</button>
          </div>

          <button class="catalog-add-btn" @click="addCatalogRow">+ Add Package Mapping</button>
        </div>

        <div v-else class="catalog-json-editor">
          <p class="catalog-json-hint">Accepts array format or object with blocks/entries/packages.</p>
          <textarea
            v-model="jsonEditorValue"
            class="catalog-json-textarea"
            spellcheck="false"
          ></textarea>
        </div>

        <p v-if="catalogEditorError" class="catalog-inline-error">{{ catalogEditorError }}</p>

        <div class="catalog-footer">
          <button class="catalog-action-btn secondary" @click="closeCatalogEditor">No, cancel</button>
          <button
            v-if="catalogEditorAction === 'open'"
            class="catalog-action-btn warning"
            @click="openUncategorizedProject"
          >
            Open As Uncategorized
          </button>
          <button class="catalog-action-btn primary" @click="saveCatalogAndOpenProject">
            Yes, save & open
          </button>
        </div>
      </div>
    </div>

    <BaseFooter />

    <div v-if="showDeleteModal" class="delete-modal" @click.self="cancelDelete">
      <div class="delete-content">
        <h2>Delete Project?</h2>
        <p v-if="projectToDelete">Are you sure you want to delete "{{ projectToDelete.name }}"? This action cannot be undone.</p>
        <div class="delete-actions">
          <button class="delete-action-btn secondary" @click="cancelDelete">No, keep</button>
          <button class="delete-action-btn danger" @click="confirmDelete">Yes, delete</button>
        </div>
      </div>
    </div>

    <!-- Folder Selection Modal -->
    <div v-if="showFolderModal" class="folder-modal" @click.self="cancelFolderSelection">
      <div class="folder-modal-content">
        <h2>{{ folderModalTitle }}</h2>
        
        <!-- Project Info Card -->
        <div v-if="folderModalProject" class="folder-project-card">
          <div class="folder-project-icon">{{ folderModalProject.icon || '📦' }}</div>
          <div class="folder-project-info">
            <h3 class="folder-project-name">{{ folderModalProject.name }}</h3>
            <p class="folder-project-description">{{ folderModalProject.description }}</p>
            <div v-if="folderModalProject.features" class="folder-project-features">
              <span v-for="feature in folderModalProject.features" :key="feature" class="folder-feature-tag">
                {{ feature }}
              </span>
            </div>
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="folderModalError" class="folder-modal-error">
          <span class="folder-error-icon">⚠️</span>
          <div class="folder-error-content">
            <strong>Error</strong>
            <p>{{ folderModalError }}</p>
          </div>
          <button class="folder-error-dismiss" @click="folderModalError = ''" title="Dismiss">✕</button>
        </div>

        <!-- Instructions -->
        <div class="folder-instructions">
          <h3 class="folder-instructions-header">📋 Setup Instructions</h3>
          <div class="folder-instruction-item">
            <span class="folder-instruction-icon">📁</span>
            <div>
              <strong>{{ folderModalRequireEmpty ? 'Select an empty folder' : 'Select your project folder' }}</strong>
              <p>{{ folderModalRequireEmpty ? 'The folder must be empty or new to avoid conflicts.' : 'Choose the root directory of your existing project.' }}</p>
            </div>
          </div>
          <div class="folder-instruction-item">
            <span class="folder-instruction-icon">💾</span>
            <div>
              <strong>Project files will be saved here</strong>
              <p>All Python scripts, notebooks, and configurations will sync to this location.</p>
            </div>
          </div>
          <div class="folder-instruction-item">
            <span class="folder-instruction-icon">🔄</span>
            <div>
              <strong>Auto-sync enabled</strong>
              <p>Changes in the editor will automatically save to your local files.</p>
            </div>
          </div>
        </div>

        <!-- Folder Path Input -->
        <div class="folder-input-section">
          <label class="folder-input-label">Local Folder Path</label>
          
          <div class="folder-input-group">
            <input 
              type="text" 
              class="folder-path-input" 
              v-model="folderPathInput"
              placeholder="e.g., C:/Projects/MyProject or /home/user/projects/myproject"
              @keyup.enter="confirmFolderSelection"
              ref="folderPathInput"
            />
          </div>
          <p class="folder-input-hint">
            {{ folderModalRequireEmpty ? '📂 Folder must be empty or will be created if it doesn\'t exist' : '📍 Enter the full path where you want to store your project files.' }}
          </p>
        </div>

        <div class="folder-modal-actions">
          <button class="folder-action-btn secondary" @click="cancelFolderSelection">Cancel</button>
          <button class="folder-action-btn primary" @click="confirmFolderSelection" :disabled="!folderPathInput.trim()">Confirm & Continue</button>
        </div>
      </div>
    </div>

    <!-- Server Management Modal -->
    <div v-if="showServerManagementModal" class="server-management-modal" @click.self="closeServerManagementModal">
      <div class="server-management-modal-content">
        <div class="modal-header">
          <div class="header-content">
            <h2>🖥️ MLSphere Server</h2>
            <p class="header-subtitle">Manage your local development server</p>
          </div>
          <button class="modal-close-btn" @click="closeServerManagementModal" title="Close">✕</button>
        </div>

        <!-- Status Hero Section -->
        <div class="status-hero">
          <div class="status-card" :class="desktopAgentState">
            <div class="status-indicator">
              <span class="status-dot"></span>
              <span class="status-label">{{ desktopAgentLabel }}</span>
            </div>
            <div class="status-details">
              <div class="status-detail-item">
                <span class="detail-label">Host</span>
                <span class="detail-value">{{ desktopAgentHostPort.split(':')[0] || '127.0.0.1' }}</span>
              </div>
              <div class="status-detail-item">
                <span class="detail-label">Port</span>
                <span class="detail-value">{{ desktopAgentState !== 'online' ? 'N/A' : (desktopAgentHostPort.split(':')[1] || '51751') }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab Navigation -->
        <div class="modal-tabs">
          <button 
            class="tab-btn"
            :class="{ active: activeModalTab === 'available-ports' }"
            @click="activeModalTab = 'available-ports'"
          >
            <span class="tab-icon">◉</span>
            <span class="tab-text">Available Ports</span>
          </button>
          <button 
            class="tab-btn"
            :class="{ active: activeModalTab === 'custom-port' }"
            @click="activeModalTab = 'custom-port'"
          >
            <span class="tab-icon">⚙</span>
            <span class="tab-text">Custom Port</span>
          </button>
          <button 
            class="tab-btn"
            :class="{ active: activeModalTab === 'troubleshoot' }"
            @click="activeModalTab = 'troubleshoot'"
          >
            <span class="tab-icon">🛠️</span>
            <span class="tab-text">Troubleshoot</span>
          </button>
        </div>

        <!-- Tab Content: Available Ports -->
        <div v-if="activeModalTab === 'available-ports'" class="tab-content">
          <div class="content-header">
            <div>
              <h3>◉ Available Ports</h3>
              <p class="content-description">Detected MLSphere Servers on your machine</p>
            </div>
            <button class="rescan-btn" @click="rescanAvailablePorts" :disabled="availablePortsLoading || connectingPort !== null">
              <span v-if="availablePortsLoading">⟳ Scanning...</span>
              <span v-else>⟳ Rescan</span>
            </button>
          </div>

          <div class="available-ports-list">
            <div v-if="availablePortsLoading && availableServerPorts.length === 0" class="available-port-empty">
              <span class="empty-icon">⏳</span>
              <span>Scanning ports...</span>
            </div>
            <div v-else-if="!availablePortsLoading && availableServerPorts.length === 0" class="available-port-empty">
              <span class="empty-icon">⚠️</span>
              <span>No port is serving MLSphere Server. Try Custom Port or Troubleshoot.</span>
            </div>
            <div v-else v-for="server in availableServerPorts" :key="`available-${server.port}`" class="available-port-item">
              <div class="port-item-left">
                <span class="port-icon">🌐</span>
                <div class="port-info">
                  <div class="port-number-row">
                    <span class="port-label">Port</span>
                    <span class="port-number-value">{{ server.port }}</span>
                  </div>
                  <span class="port-status" v-if="effectiveConnectedPort === server.port">
                    <span class="port-status-dot"></span>
                    Connected
                  </span>
                </div>
              </div>
              <button
                v-if="effectiveConnectedPort !== server.port"
                class="port-connect-btn"
                @click="connectToDetectedPort(server.port)"
                :disabled="connectingPort !== null"
              >
                <span v-if="connectingPort === server.port">Connecting...</span>
                <span v-else>Connect</span>
              </button>
            </div>
          </div>

          <div v-if="availablePortsError" class="port-feedback error">
            <span class="feedback-icon">❌</span>
            <span>{{ availablePortsError }}</span>
          </div>
          <div v-if="availablePortsSuccess" class="port-feedback success">
            <span class="feedback-icon">✅</span>
            <span>{{ availablePortsSuccess }}</span>
          </div>

        </div>

        <!-- Tab Content: Custom Port -->
        <div v-if="activeModalTab === 'custom-port'" class="tab-content">
          <div class="content-header">
            <div>
              <h3>⚙ Custom Port</h3>
              <p class="content-description">Connect to a server on a specific port</p>
            </div>
          </div>

          <div class="custom-port-card">
            <label class="input-label">Port Number</label>
            <div class="port-input-group">
              <input 
                type="number" 
                v-model.number="customPortValue"
                placeholder="Enter port (1024-65535)"
                class="port-input"
                min="1024"
                max="65535"
                @keyup.enter="connectToCustomPort"
              />
              <button 
                @click="connectToCustomPort" 
                class="port-connect-btn primary"
                :disabled="customPortConnecting || !customPortValue || customPortValue < 1024 || customPortValue > 65535 || customPortValue === effectiveConnectedPort"
              >
                <span v-if="customPortConnecting">⏳ Connecting...</span>
                <span v-else-if="customPortValue === effectiveConnectedPort">Connected</span>
                <span v-else>Connect</span>
              </button>
            </div>
            <p class="input-hint">ℹ️ Valid range: 1024-65535</p>
            
            <div v-if="customPortError" class="port-feedback error">
              <span class="feedback-icon">❌</span>
              <span>{{ customPortError }}</span>
            </div>
            <div v-if="customPortSuccess" class="port-feedback success">
              <span class="feedback-icon">✅</span>
              <span>{{ customPortSuccess }}</span>
            </div>
          </div>

          <div class="info-card">
            <div class="info-card-header">
              <span class="info-icon">ℹ️</span>
              <strong>When to use custom ports</strong>
            </div>
            <ul class="info-list">
              <li>Default port (51751) is already in use</li>
              <li>Running multiple server instances</li>
              <li>Corporate firewall requires specific ports</li>
            </ul>
          </div>
        </div>

        <!-- Tab Content: Troubleshoot -->
        <div v-if="activeModalTab === 'troubleshoot'" class="tab-content">
          <div class="content-header">
            <div>
              <h3>🛠️ Troubleshooting</h3>
              <p class="content-description">Common issues and solutions</p>
            </div>
          </div>

          <!-- Server Actions -->
          <div class="server-actions">
            <button 
              @click="checkServerStatus" 
              class="hero-action-btn"
              :disabled="checkingStatus"
              :title="checkingStatus ? 'Checking server status...' : 'Check if server is running'"
            >
              <span v-if="checkingStatus">⏳ Checking...</span>
              <span v-else>🔍 Check Status</span>
            </button>
            <button 
              v-if="desktopAgentState === 'online'" 
              @click="restartServer" 
              class="hero-action-btn warning"
              :disabled="desktopAgentRestarting"
              :title="desktopAgentRestarting ? 'Restarting...' : 'Restart server'"
            >
              <span v-if="!desktopAgentRestarting">🔄 Restart</span>
              <span v-else>⏳ Restarting...</span>
            </button>

            <div v-if="troubleshootFeedbackMessage" class="port-feedback" :class="troubleshootFeedbackType">
              <span class="feedback-icon">{{ troubleshootFeedbackIcon }}</span>
              <span>{{ troubleshootFeedbackMessage }}</span>
            </div>
          </div>

          <div class="instruction-card">
            <div class="instruction-header">
              <span class="instruction-icon">🧾</span>
              <strong>Starting server with custom port</strong>
            </div>
            <div class="code-examples">
              <div class="code-example">
                <span class="code-platform">Windows</span>
                <code>mlsphere-agent-win-x64.exe --port 54000</code>
              </div>
              <div class="code-example">
                <span class="code-platform">macOS/Linux</span>
                <code>./mlsphere-agent --port 54000</code>
              </div>
              <div class="code-example">
                <span class="code-platform">Node.js</span>
                <code>node server.js --port 54000</code>
              </div>
            </div>
          </div>

          <div class="troubleshooting-grid">
            <div class="troubleshooting-card">
              <div class="trouble-icon">❌</div>
              <strong>Server shows offline</strong>
              <p>Make sure you've downloaded and started the server. Check if another application is using the port.</p>
            </div>
            <div class="troubleshooting-card">
              <div class="trouble-icon">⚠️</div>
              <strong>Port already in use</strong>
              <p>Start server with custom port using <code>--port</code> flag, then connect to that port above.</p>
            </div>
            <div class="troubleshooting-card">
              <div class="trouble-icon">🔍</div>
              <strong>Can't find correct port</strong>
              <p>Browser smartly scans active ports on your machine. For ports outside the default range, use custom port input.</p>
            </div>
          </div>
        </div>

        <!-- Close Button -->
        <div class="modal-footer">
          <button class="modal-action-btn" @click="closeServerManagementModal">Close</button>
        </div>
      </div>
    </div>

    <!-- Custom Port Configuration Modal -->
    <div v-if="showCustomPortModal" class="custom-port-modal" @click.self="closeCustomPortModal">
      <div class="custom-port-modal-content">
        <h2>⚙️ Custom Port Configuration</h2>
        
        <div class="custom-port-instructions">
          <h3 class="custom-port-instructions-header">📖 How to Use Custom Ports</h3>
          
          <div class="custom-port-instruction-item">
            <span class="custom-port-instruction-icon">1️⃣</span>
            <div>
              <strong>Start server with custom port</strong>
              <p>When running the downloaded server, add the <code>--port</code> argument:</p>
              <div class="code-example-group">
                <div class="code-example">
                  <span class="code-label">Windows:</span>
                  <code>mlsphere-agent-win-x64.exe --port 54000</code>
                </div>
                <div class="code-example">
                  <span class="code-label">macOS/Linux:</span>
                  <code>./mlsphere-agent --port 54000</code>
                </div>
                <div class="code-example">
                  <span class="code-label">Node.js:</span>
                  <code>node server.js --port 54000</code>
                </div>
              </div>
            </div>
          </div>
          
          <div class="custom-port-instruction-item">
            <span class="custom-port-instruction-icon">2️⃣</span>
            <div>
              <strong>Test the connection</strong>
              <p>Enter the custom port below and click "Test & Connect" to verify the server is running.</p>
            </div>
          </div>
          
          <div class="custom-port-instruction-item">
            <span class="custom-port-instruction-icon">💡</span>
            <div>
              <strong>When to use custom ports</strong>
              <ul>
                <li>Default port (51751) is already in use by another service</li>
                <li>Running multiple servers for different projects</li>
                <li>Corporate firewall requires specific ports</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Port Input Section -->
        <div class="custom-port-input-section">
          <label class="custom-port-input-label">Custom Port Number</label>
          
          <div class="custom-port-input-group">
            <input 
              type="number" 
              class="custom-port-number-input" 
              v-model.number="customPortValue"
              placeholder="e.g., 54000"
              min="1024"
              max="65535"
              @keyup.enter="testAndConnectCustomPort"
              ref="customPortInput"
            />
            <span class="port-range-hint">Valid range: 1024-65535</span>
          </div>
          
          <div v-if="customPortError" class="custom-port-error">
            <span class="error-icon">❌</span>
            <span>{{ customPortError }}</span>
          </div>
          
          <div v-if="customPortSuccess" class="custom-port-success">
            <span class="success-icon">✅</span>
            <span>{{ customPortSuccess }}</span>
          </div>
        </div>

        <div class="custom-port-modal-actions">
          <button class="custom-port-action-btn secondary" @click="closeCustomPortModal">Cancel</button>
          <button 
            class="custom-port-action-btn primary" 
            @click="testAndConnectCustomPort" 
            :disabled="!customPortValue || customPortValue < 1024 || customPortValue > 65535 || customPortValue === effectiveConnectedPort"
          >
            Test & Connect
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import HeroSection from './homepage/HeroSection.vue';
import ProjectTemplates from './homepage/ProjectTemplates.vue';
import LoadFromLocal from './homepage/LoadFromLocal.vue';
import RecentProjects from './homepage/RecentProjects.vue';
import AgentSetup from './homepage/AgentSetup.vue';
import QuickStartGuide from './homepage/QuickStartGuide.vue';
import BaseFooter from './base/BaseFooter.vue';
import templateCatalogs from '../data/block-catalog.templates.json';
import { deleteProjectFiles, saveProjectFiles } from '../services/project/projectFileStore';
import { discoverAvailableServerPorts, getProjectFolderLink, linkProjectFolder, syncProjectFiles, verifyServerPort } from '../services/agent/desktopAgentClient';
import { CATALOG_SECTIONS } from '../services/catalog/catalogMapping';
import { createTemplateBlocks, PROJECT_TEMPLATES } from '../services/project/projectTemplates';

export default {
  name: 'ProjectDashboard',
  components: {
    HeroSection,
    ProjectTemplates,
    LoadFromLocal,
    RecentProjects,
    AgentSetup,
    QuickStartGuide,
    BaseFooter
  },
  props: {
    desktopAgentState: {
      type: String,
      default: 'checking'
    },
    desktopAgentLabel: {
      type: String,
      default: 'checking'
    },
    desktopAgentHostPort: {
      type: String,
      default: ''
    },
    desktopAgentTooltip: {
      type: String,
      default: ''
    },
    desktopAgentRestarting: {
      type: Boolean,
      default: false
    },
    desktopAgentActionLabel: {
      type: String,
      default: 'Start'
    },
    desktopAgentActionTitle: {
      type: String,
      default: 'Start desktop agent from browser'
    },
    desktopAgentDownloadUrl: {
      type: String,
      default: ''
    },
    desktopAgentInstalled: {
      type: Boolean,
      default: false
    }
  },
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
      catalogEditorError: '',
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
      catalogSections: [...CATALOG_SECTIONS]
    };
  },
  mounted() {
    this.loadRecentProjects();
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
    async selectTemplate(template) {
      const blockCatalog = this.getTemplateCatalog(template.id);
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
        blocks: this.getTemplateBlocks(template.id),
        config: {
          ...this.getTemplateConfig(template.id),
          blockCatalog,
          catalogStatus: 'provided'
        }
      };

      try {
        await this.ensureProjectFolderLink(newProject, { requireEmpty: true });
        // Immediately generate and sync template files to disk
        await this.syncTemplateFilesToDisk(newProject);
      } catch (error) {
        // Silently return if user cancels folder selection - no alert
        console.log('[Dashboard] Project setup cancelled:', error.message);
        return;
      }

      // Save to localStorage
      this.saveProjectToStorage(newProject);
      this.addToRecentProjects(newProject);

      // Emit event to parent to switch to editor
      this.$emit('project-selected', newProject);
    },

    getTemplateCatalog(templateId) {
      const entries = Array.isArray(templateCatalogs[templateId]) ? templateCatalogs[templateId] : [];
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
      if (fileList.length === 0) return;

      const pythonFiles = await Promise.all(fileList.map(async (file) => {
        const relativePath = file.webkitRelativePath || file.path || file.name;
        const content = await this.readUploadedFileContent(file);

        return {
          name: file.name,
          path: relativePath,
          relativePath,
          size: file.size,
          type: file.type,
          content
        };
      }));

      const folderName = (pythonFiles[0]?.path || '').split(/[/\\]/).filter(Boolean)[0] || 'Python Project';
      const catalogFile = fileList.find(file => {
        const path = (file.webkitRelativePath || file.name || '').toLowerCase();
        return path.endsWith('ml-blocks.catalog.json');
      });

      let blockCatalog = [];
      let catalogStatus = 'unmapped';

      if (catalogFile) {
        try {
          const content = await catalogFile.text();
          blockCatalog = this.parseCatalogFromText(content);
          catalogStatus = 'provided';
        } catch (error) {
          console.error('Failed to parse ml-blocks.catalog.json:', error);
        }
      }

      // Extract all top-level directories and relevant files from upload
      const localPackages = this.extractLocalPackagesFromFiles(pythonFiles);

      if (catalogStatus !== 'provided') {
        blockCatalog = [];
      }

      const mappedPackageSet = new Set(blockCatalog.map(entry => entry.package));
      const unmappedPackages = localPackages.filter(packageName => !mappedPackageSet.has(packageName));

      const project = {
        id: Date.now(),
        name: folderName,
        icon: '🐍',
        description: `Import existing Python project with ${pythonFiles.length} files`,
        features: ['Python Files', catalogStatus === 'provided' ? 'Catalog Provided' : 'Manual Mapping', `${localPackages.length} Packages`],
        type: 'python-import',
        lastModified: new Date(),
        blocks: catalogStatus === 'provided' ? this.buildBlocksFromCatalog(blockCatalog) : [],
        pythonFiles,
        config: {
          importType: 'python-packages',
          createdAt: new Date().toISOString(),
          blockCatalog,
          catalogStatus,
          localPackages,
          unmappedPackages,
          openCatalogOnLoad: catalogStatus !== 'provided'
        }
      };

      await saveProjectFiles(project.id, pythonFiles);

      this.saveProjectToStorage(project);
      this.addToRecentProjects(project);
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

    async syncTemplateFilesToDisk(project) {
      const projectId = String(project?.id || '');
      if (!projectId) {
        return;
      }

      const blocks = Array.isArray(project?.blocks) ? project.blocks : [];
      if (blocks.length === 0) {
        return;
      }

      const files = [];

      // Generate __init__.py and block files for each block
      blocks.forEach((block, index) => {
        if (!block || !block.id) {
          return;
        }

        // Determine package name
        const packageName = this.getBlockPackageNameForTemplate(block, project);
        const packageRoot = packageName.replace(/\./g, '/');
        const initPath = `${packageRoot}/__init__.py`;
        
        // Create empty __init__.py for the package
        files.push({
          path: initPath,
          content: '# Package initialization file\n'
        });

        // Create block module file
        const safeBlockName = String(block.name || `block_${index + 1}`)
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '') || `block_${index + 1}`;

        const blockCode = typeof block.code === 'string' ? block.code : (block.defaultCode || '');
        files.push({
          path: `pipeline_blocks/${safeBlockName}.py`,
          content: blockCode || `# ${block.name}\n\ndef main():\n    pass\n`
        });
      });

      // Add requirements.txt
      files.push({
        path: 'requirements.txt',
        content: '# Add your Python package dependencies here\n'
      });

      // Sync all files to disk
      if (files.length > 0) {
        await syncProjectFiles(projectId, files);
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
      const packages = new Set();

      files.forEach(file => {
        const normalizedPath = String(file.path || '').replace(/\\/g, '/');
        const parts = normalizedPath.split('/').filter(Boolean);
        
        // Skip the root folder name and get the first level item
        if (parts.length > 1) {
          const topLevelItem = parts[1];
          if (topLevelItem && !topLevelItem.startsWith('.')) {
            packages.add(topLevelItem);
          }
        }
      });

      return Array.from(packages).sort((a, b) => a.localeCompare(b));
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
        this.catalogEditorError = '';
      } else {
        try {
          this.catalogDraft = this.parseCatalogFromText(this.jsonEditorValue);
          this.catalogEditorError = '';
        } catch (error) {
          this.catalogEditorError = `Invalid JSON: ${error.message}`;
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
      this.catalogEditorError = '';
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
          this.catalogEditorError = `Invalid JSON: ${error.message}`;
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
        this.catalogEditorError = 'Add at least one package mapping before saving.';
        return;
      }
      this.catalogEditorError = '';

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

<style src="./dashboard.css"></style>

