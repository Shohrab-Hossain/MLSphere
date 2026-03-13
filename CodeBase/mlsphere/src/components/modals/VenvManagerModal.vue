<template>
  <div v-if="show" class="venv-modal-overlay" @click.self="close">
    <div class="venv-modal">
      <!-- Header -->
      <div class="venv-modal-header">
        <div class="venv-header-info">
          <h2>Python Environments</h2>
          <p class="venv-header-sub">{{ projectName || 'Project' }}</p>
        </div>
        <button class="venv-close-btn" @click="close">✕</button>
      </div>

      <!-- Tabs -->
      <div class="venv-tabs">
        <button class="venv-tab" :class="{ active: activeTab === 'envs' }" @click="activeTab = 'envs'">
          Environments
        </button>
        <button class="venv-tab" :class="{ active: activeTab === 'packages' }" @click="switchToPackages">
          Install Packages
        </button>
      </div>

      <!-- ── Environments Tab ── -->
      <div v-if="activeTab === 'envs'" class="venv-tab-content">

        <!-- Existing venvs list -->
        <div v-if="venvs.length > 0" class="venv-list">
          <div
            v-for="venv in venvs"
            :key="venv.name"
            class="venv-item"
            :class="{ active: venv.isActive }"
          >
            <div class="venv-item-icon">🐍</div>
            <div class="venv-item-info">
              <div class="venv-item-name">{{ venv.name }}</div>
              <div class="venv-item-meta">Python {{ venv.pythonVersion }} · {{ venv.pythonExecutable }}</div>
              <div v-if="venv.isActive" class="venv-active-badge">Active</div>
            </div>
            <div class="venv-item-actions">
              <button
                v-if="!venv.isActive"
                class="venv-btn venv-btn-activate"
                :disabled="loadingVenv === venv.name"
                @click="activateVenv(venv.name)"
              >
                {{ loadingVenv === venv.name ? 'Setting…' : 'Use' }}
              </button>
              <button
                v-else
                class="venv-btn venv-btn-deactivate"
                :disabled="loadingVenv === venv.name"
                @click="deactivateVenv()"
              >
                Deactivate
              </button>
              <button
                class="venv-btn venv-btn-delete"
                :disabled="loadingVenv === venv.name"
                @click="confirmDeleteVenv(venv.name)"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="!loadingList" class="venv-empty">
          <div class="venv-empty-icon">🐍</div>
          <p>No virtual environments yet.</p>
          <p class="venv-empty-hint">Create one below to isolate your project's dependencies.</p>
        </div>

        <div v-if="loadingList" class="venv-loading">Loading environments…</div>

        <!-- Create new venv form -->
        <div class="venv-create-section">
          <h3 class="venv-section-title">Create New Environment</h3>

          <div class="venv-form-row">
            <label class="venv-label">Name</label>
            <input
              v-model.trim="newVenvName"
              class="venv-input"
              placeholder="e.g. venv-3.11"
              :disabled="creating"
            />
          </div>

          <div class="venv-form-row">
            <label class="venv-label">Python Version</label>
            <div class="venv-python-select-row">
              <select v-model="selectedPython" class="venv-select" :disabled="creating || loadingPythons">
                <option value="" disabled>-- select --</option>
                <option v-for="p in pythonVersions" :key="p.executable" :value="p.executable">
                  {{ p.display }}
                </option>
              </select>
              <button class="venv-btn venv-btn-refresh" :disabled="loadingPythons" @click="loadPythonVersions" title="Refresh Python versions">
                {{ loadingPythons ? '…' : '⟳' }}
              </button>
            </div>
            <div v-if="pythonVersions.length === 0 && !loadingPythons" class="venv-hint-warn">
              No Python versions detected. Make sure Python is installed and on your PATH.
            </div>
          </div>

          <div v-if="createError" class="venv-error">{{ createError }}</div>

          <div class="venv-form-actions">
            <button
              class="venv-btn venv-btn-primary"
              :disabled="!newVenvName || !selectedPython || creating"
              @click="createVenv"
            >
              <span v-if="creating">Creating… (this may take a moment)</span>
              <span v-else>Create Environment</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ── Install Packages Tab ── -->
      <div v-if="activeTab === 'packages'" class="venv-tab-content">

        <!-- Active venv check -->
        <div v-if="!activeVenvName" class="venv-warn-box">
          <span class="venv-warn-icon">⚠️</span>
          No active environment selected. Go to <strong>Environments</strong> tab and activate one first.
        </div>

        <template v-else>
          <div class="venv-active-indicator">
            Using: <strong>{{ activeVenvName }}</strong>
            <span class="venv-active-dot"></span>
          </div>

          <!-- Requirements files -->
          <div class="venv-section">
            <h3 class="venv-section-title">Requirements Files</h3>
            <p class="venv-section-hint">Enter full paths to requirements.txt files (one per line)</p>
            <textarea
              v-model="requirementFilesText"
              class="venv-textarea"
              placeholder="/path/to/requirements.txt"
              rows="3"
              :disabled="installing"
            ></textarea>
          </div>

          <!-- Manual packages -->
          <div class="venv-section">
            <h3 class="venv-section-title">Package Names</h3>
            <p class="venv-section-hint">Enter package names separated by spaces or new lines (e.g. numpy pandas scikit-learn)</p>
            <textarea
              v-model="packagesText"
              class="venv-textarea"
              placeholder="numpy&#10;pandas&#10;scikit-learn==1.3.0"
              rows="4"
              :disabled="installing"
            ></textarea>
          </div>

          <div v-if="installError" class="venv-error">{{ installError }}</div>

          <div class="venv-form-actions">
            <button
              class="venv-btn venv-btn-primary"
              :disabled="(!packagesText.trim() && !requirementFilesText.trim()) || installing"
              @click="installPackages"
            >
              <span v-if="installing">Installing…</span>
              <span v-else>Install Packages</span>
            </button>
          </div>

          <!-- Install log output -->
          <div v-if="installLogs.length > 0 || installing" class="venv-log-box" ref="logBox">
            <div class="venv-log-header">
              <span>Output</span>
              <span class="venv-log-status" :class="installStatus">{{ installStatus }}</span>
            </div>
            <div class="venv-log-content">
              <div
                v-for="(entry, i) in installLogs"
                :key="i"
                class="venv-log-line"
                :class="entry.stream"
              >{{ entry.message }}</div>
            </div>
          </div>
        </template>
      </div>

    </div>
  </div>
</template>

<script>
import {
  listPythonVersions,
  listProjectVenvs,
  createProjectVenv,
  deleteProjectVenv,
  activateProjectVenv,
  deactivateProjectVenv,
  installProjectPackages,
  getInstallOpLogs,
} from '../../services/agent/desktopAgentClient';

export default {
  name: 'VenvManagerModal',
  props: {
    show: { type: Boolean, default: false },
    projectId: { type: String, default: '' },
    projectName: { type: String, default: '' },
  },
  emits: ['close', 'venv-changed'],
  data() {
    return {
      activeTab: 'envs',
      // env list
      venvs: [],
      activeVenvName: null,
      loadingList: false,
      loadingVenv: null,
      // python versions
      pythonVersions: [],
      loadingPythons: false,
      // create form
      newVenvName: '',
      selectedPython: '',
      creating: false,
      createError: '',
      // install
      requirementFilesText: '',
      packagesText: '',
      installing: false,
      installStatus: 'idle',
      installLogs: [],
      installPollTimer: null,
      installError: '',
    };
  },
  watch: {
    show(val) {
      if (val && this.projectId) {
        this.loadVenvs();
        this.loadPythonVersions();
      }
    },
  },
  methods: {
    close() {
      this.stopInstallPoll();
      this.$emit('close');
    },
    switchToPackages() {
      this.activeTab = 'packages';
    },

    // ---- Load data ----
    async loadVenvs() {
      if (!this.projectId) return;
      this.loadingList = true;
      try {
        const result = await listProjectVenvs(this.projectId);
        this.venvs = result.venvs || [];
        this.activeVenvName = result.activeVenv || null;
      } catch (e) {
        // server may be offline — silently fail
      } finally {
        this.loadingList = false;
      }
    },

    async loadPythonVersions() {
      this.loadingPythons = true;
      try {
        const result = await listPythonVersions();
        this.pythonVersions = result.versions || [];
        if (this.pythonVersions.length > 0 && !this.selectedPython) {
          this.selectedPython = this.pythonVersions[0].executable;
        }
      } catch (e) {
        this.pythonVersions = [];
      } finally {
        this.loadingPythons = false;
      }
    },

    // ---- Create venv ----
    async createVenv() {
      this.createError = '';
      if (!this.newVenvName || !this.selectedPython) return;
      this.creating = true;
      try {
        const result = await createProjectVenv(this.projectId, {
          name: this.newVenvName,
          pythonExecutable: this.selectedPython,
        });
        await this.loadVenvs();
        this.newVenvName = '';
        this.$emit('venv-changed', { activeVenv: this.activeVenvName, pythonInVenv: result.venv?.pythonInVenv });
      } catch (e) {
        this.createError = e.message || 'Failed to create environment';
      } finally {
        this.creating = false;
      }
    },

    // ---- Activate / deactivate ----
    async activateVenv(name) {
      this.loadingVenv = name;
      try {
        const result = await activateProjectVenv(this.projectId, name);
        this.activeVenvName = name;
        this.venvs.forEach(v => { v.isActive = v.name === name; });
        this.$emit('venv-changed', { activeVenv: name, pythonInVenv: result.pythonInVenv });
      } catch (e) {
        // ignore
      } finally {
        this.loadingVenv = null;
      }
    },

    async deactivateVenv() {
      this.loadingVenv = this.activeVenvName;
      try {
        await deactivateProjectVenv(this.projectId);
        this.activeVenvName = null;
        this.venvs.forEach(v => { v.isActive = false; });
        this.$emit('venv-changed', { activeVenv: null, pythonInVenv: null });
      } catch (e) {
        // ignore
      } finally {
        this.loadingVenv = null;
      }
    },

    // ---- Delete venv ----
    async confirmDeleteVenv(name) {
      if (!confirm(`Delete environment "${name}"? This cannot be undone.`)) return;
      this.loadingVenv = name;
      try {
        await deleteProjectVenv(this.projectId, name);
        if (this.activeVenvName === name) {
          this.activeVenvName = null;
          this.$emit('venv-changed', { activeVenv: null, pythonInVenv: null });
        }
        await this.loadVenvs();
      } catch (e) {
        // ignore
      } finally {
        this.loadingVenv = null;
      }
    },

    // ---- Install packages ----
    async installPackages() {
      if (!this.activeVenvName) return;
      this.installError = '';
      this.installLogs = [];
      this.installStatus = 'running';

      const packages = this.packagesText
        .split(/[\s,]+/)
        .map(s => s.trim())
        .filter(Boolean);

      const requirementFiles = this.requirementFilesText
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

      if (packages.length === 0 && requirementFiles.length === 0) return;

      this.installing = true;
      try {
        const result = await installProjectPackages(this.projectId, this.activeVenvName, {
          packages,
          requirementFiles,
        });
        this.pollInstallLogs(result.opId);
      } catch (e) {
        this.installError = e.message || 'Failed to start installation';
        this.installStatus = 'failed';
        this.installing = false;
      }
    },

    pollInstallLogs(opId) {
      let cursor = 0;
      this.stopInstallPoll();
      const poll = async () => {
        try {
          const result = await getInstallOpLogs(opId, cursor);
          if (result.logs && result.logs.length > 0) {
            this.installLogs.push(...result.logs);
            cursor = result.nextCursor;
            this.$nextTick(() => {
              const box = this.$refs.logBox;
              if (box) box.querySelector('.venv-log-content').scrollTop = 999999;
            });
          }
          this.installStatus = result.status;
          if (result.status === 'running') {
            this.installPollTimer = setTimeout(poll, 400);
          } else {
            this.installing = false;
          }
        } catch (e) {
          this.installStatus = 'failed';
          this.installing = false;
        }
      };
      poll();
    },

    stopInstallPoll() {
      if (this.installPollTimer) {
        clearTimeout(this.installPollTimer);
        this.installPollTimer = null;
      }
    },
  },
  beforeUnmount() {
    this.stopInstallPoll();
  },
};
</script>

<style scoped>
.venv-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
}

.venv-modal {
  background: #1a1d24;
  border: 1px solid #2d3142;
  border-radius: 12px;
  width: 580px;
  max-width: 95vw;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
}

/* Header */
.venv-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px 14px;
  border-bottom: 1px solid #2d3142;
  flex-shrink: 0;
}
.venv-modal-header h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #e2e8f0;
}
.venv-header-sub {
  margin: 2px 0 0;
  font-size: 12px;
  color: #64748b;
}
.venv-close-btn {
  background: none;
  border: none;
  color: #64748b;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  line-height: 1;
  transition: color 0.15s;
}
.venv-close-btn:hover { color: #e2e8f0; }

/* Tabs */
.venv-tabs {
  display: flex;
  border-bottom: 1px solid #2d3142;
  padding: 0 22px;
  flex-shrink: 0;
}
.venv-tab {
  background: none;
  border: none;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  padding: 10px 16px 9px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;
}
.venv-tab:hover { color: #a0aec0; }
.venv-tab.active { color: #7c6aff; border-bottom-color: #7c6aff; }

/* Tab content */
.venv-tab-content {
  overflow-y: auto;
  padding: 20px 22px;
  flex: 1;
}

/* Venv list */
.venv-list { margin-bottom: 24px; }
.venv-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #2d3142;
  border-radius: 8px;
  margin-bottom: 8px;
  background: #12151c;
  transition: border-color 0.15s;
}
.venv-item.active { border-color: #7c6aff; background: #1a1730; }

.venv-item-icon { font-size: 22px; flex-shrink: 0; }
.venv-item-info { flex: 1; min-width: 0; }
.venv-item-name { font-size: 14px; font-weight: 600; color: #e2e8f0; }
.venv-item-meta { font-size: 11px; color: #64748b; margin-top: 2px; }
.venv-active-badge {
  display: inline-block;
  margin-top: 4px;
  font-size: 10px;
  font-weight: 700;
  color: #7c6aff;
  background: rgba(124,106,255,0.12);
  padding: 2px 7px;
  border-radius: 10px;
  letter-spacing: 0.05em;
}
.venv-item-actions { display: flex; gap: 6px; flex-shrink: 0; }

/* Empty state */
.venv-empty {
  text-align: center;
  padding: 24px 0 8px;
  color: #64748b;
}
.venv-empty-icon { font-size: 32px; margin-bottom: 8px; }
.venv-empty-hint { font-size: 12px; color: #4a5568; margin-top: 4px; }

.venv-loading { text-align: center; color: #64748b; font-size: 13px; padding: 16px 0; }

/* Create section */
.venv-create-section {
  border-top: 1px solid #2d3142;
  padding-top: 20px;
}
.venv-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #a0aec0;
  margin: 0 0 14px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.venv-form-row { margin-bottom: 14px; }
.venv-label {
  display: block;
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 5px;
  font-weight: 500;
}
.venv-input, .venv-select, .venv-textarea {
  width: 100%;
  background: #0f1117;
  border: 1px solid #2d3142;
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 13px;
  padding: 8px 10px;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s;
}
.venv-input:focus, .venv-select:focus, .venv-textarea:focus { border-color: #7c6aff; }
.venv-input:disabled, .venv-select:disabled, .venv-textarea:disabled { opacity: 0.5; cursor: not-allowed; }
.venv-textarea { resize: vertical; font-family: monospace; }

.venv-python-select-row { display: flex; gap: 6px; align-items: center; }
.venv-python-select-row .venv-select { flex: 1; }

.venv-hint-warn { font-size: 11px; color: #f6ad55; margin-top: 5px; }

.venv-form-actions { margin-top: 16px; }
.venv-error { background: rgba(229,62,62,0.1); border: 1px solid rgba(229,62,62,0.3); border-radius: 6px; padding: 8px 12px; color: #fc8181; font-size: 12px; margin-top: 10px; }

/* Buttons */
.venv-btn {
  padding: 5px 12px;
  border-radius: 5px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  white-space: nowrap;
}
.venv-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.venv-btn-activate { background: rgba(124,106,255,0.15); border-color: #7c6aff; color: #b9aeff; }
.venv-btn-activate:hover:not(:disabled) { background: rgba(124,106,255,0.25); }

.venv-btn-deactivate { background: rgba(100,116,139,0.15); border-color: #4a5568; color: #94a3b8; }
.venv-btn-deactivate:hover:not(:disabled) { background: rgba(100,116,139,0.25); }

.venv-btn-delete { background: rgba(229,62,62,0.1); border-color: rgba(229,62,62,0.3); color: #fc8181; }
.venv-btn-delete:hover:not(:disabled) { background: rgba(229,62,62,0.2); }

.venv-btn-primary {
  background: #7c6aff;
  border-color: #7c6aff;
  color: #fff;
  padding: 9px 20px;
  font-size: 13px;
  width: 100%;
}
.venv-btn-primary:hover:not(:disabled) { background: #6a57e8; }

.venv-btn-refresh {
  background: #12151c;
  border: 1px solid #2d3142;
  color: #94a3b8;
  padding: 6px 10px;
  font-size: 15px;
  flex-shrink: 0;
}
.venv-btn-refresh:hover { color: #e2e8f0; }

/* Install packages tab */
.venv-warn-box {
  background: rgba(246,173,85,0.1);
  border: 1px solid rgba(246,173,85,0.3);
  border-radius: 8px;
  padding: 14px 16px;
  color: #f6ad55;
  font-size: 13px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.venv-warn-icon { font-size: 16px; flex-shrink: 0; }

.venv-active-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 18px;
}
.venv-active-indicator strong { color: #b9aeff; }
.venv-active-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #48bb78;
  display: inline-block;
  margin-left: 2px;
}

.venv-section { margin-bottom: 18px; }
.venv-section-hint { font-size: 11px; color: #64748b; margin: -8px 0 7px; }

/* Log box */
.venv-log-box {
  border: 1px solid #2d3142;
  border-radius: 8px;
  overflow: hidden;
  margin-top: 16px;
}
.venv-log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 12px;
  background: #0f1117;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #2d3142;
}
.venv-log-status {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 10px;
  background: rgba(100,116,139,0.2);
  color: #94a3b8;
}
.venv-log-status.running { background: rgba(246,173,85,0.15); color: #f6ad55; }
.venv-log-status.completed { background: rgba(72,187,120,0.15); color: #48bb78; }
.venv-log-status.failed { background: rgba(229,62,62,0.15); color: #fc8181; }

.venv-log-content {
  max-height: 220px;
  overflow-y: auto;
  padding: 10px 12px;
  background: #0a0c10;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.6;
}
.venv-log-line { white-space: pre-wrap; word-break: break-all; }
.venv-log-line.stdout { color: #a8d8a0; }
.venv-log-line.stderr { color: #f6ad55; }
.venv-log-line.system { color: #64748b; font-style: italic; }
</style>
