<template>
  <div v-if="visible" class="code-editor-modal" @click.self="close" @keydown.ctrl.s.prevent="saveCode" @keydown.esc="close">
    <div class="code-editor-container">
      <div class="editor-header">
        <h3>
          <span>{{ block.icon }}</span>
          {{ block.name }} - Code Editor
        </h3>
        <div v-if="saveStatus === 'saved'" class="header-status">
          ✓ Saved
        </div>
        <button class="close-btn" @click="close">×</button>
      </div>
      
      <div class="editor-body">
        <div class="module-manager">
          <div class="module-header">
            <span class="module-title">Modules / Packages</span>
            <span class="module-count">{{ localPackages.length }} added</span>
          </div>
          <div class="module-input-row">
            <input
              v-model="packageInput"
              class="module-input"
              type="text"
              placeholder="Add package (e.g. pandas, scikit-learn, matplotlib)"
              @keyup.enter="addPackage"
            />
            <button @click="addPackage" class="add-module-btn">+ Add</button>
          </div>
          <div v-if="localPackages.length > 0" class="module-chips">
            <span v-for="pkg in localPackages" :key="pkg" class="module-chip">
              {{ pkg }}
              <button class="chip-remove" @click="removePackage(pkg)" title="Remove package">×</button>
            </span>
          </div>
        </div>

        <div class="editor-surface">
          <div class="editor-tabbar">
            <div class="editor-tab active">
              {{ fileName }}
            </div>
          </div>

          <div class="editor-pane">
            <div ref="codearea" class="code-editor-host"></div>
          </div>
        </div>
      </div>
      
      <div class="editor-footer">
        <div class="editor-info">
          <span>Python Code</span>
          <span class="line-count">{{ lineCount }} lines</span>
        </div>
        <div class="editor-actions">
          <button @click="resetCode" class="reset-btn">
            ↺ Reset to Default
          </button>
          <button @click="close" class="cancel-btn">
            Cancel
          </button>
          <button @click="saveCode" class="save-btn">
            💾 Save Changes
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material-darker.css';
import 'codemirror/mode/python/python';
import 'codemirror/addon/selection/active-line';

export default {
  name: 'CodeEditor',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    block: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      localCode: '',
      localPackages: [],
      packageInput: '',
      codeMirror: null,
      isSyncingFromEditor: false,
      saveStatus: 'idle', // 'idle', 'saving', 'saved'
      globalKeydownHandler: null
    };
  },
  computed: {
    lineCount() {
      return this.localCode.split('\n').length;
    },
    fileName() {
      if (!this.block) {
        return 'block.py';
      }

      return `${this.block.id || 'block'}.py`;
    }
  },
  watch: {
    visible(newValue) {
      if (newValue) {
        // Use a small delay to ensure DOM is fully painted
        this.$nextTick(() => {
          setTimeout(() => {
            this.initCodeEditor();
          }, 50);
        });
        // Prevent browser's default Ctrl+S save dialog when modal is open
        this.globalKeydownHandler = (event) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
            event.preventDefault();
            event.stopPropagation();
            this.saveCode();
          }
        };
        window.addEventListener('keydown', this.globalKeydownHandler, true);
      } else {
        if (this.codeMirror) {
          this.codeMirror.clearHistory();
        }
        this.codeMirror = null;
        // Remove global keydown listener
        if (this.globalKeydownHandler) {
          window.removeEventListener('keydown', this.globalKeydownHandler, true);
          this.globalKeydownHandler = null;
        }
      }
    },
    localCode(newValue) {
      if (!this.codeMirror || this.isSyncingFromEditor) {
        return;
      }

      if (this.codeMirror.getValue() !== newValue) {
        const cursor = this.codeMirror.getCursor();
        this.codeMirror.setValue(newValue);
        this.codeMirror.setCursor(cursor);
      }
    },
    block: {
      immediate: true,
      handler(newBlock) {
        if (newBlock && newBlock.code) {
          this.localCode = newBlock.code;
        } else if (newBlock && newBlock.defaultCode) {
          this.localCode = newBlock.defaultCode;
        } else {
          this.localCode = '';
        }

        if (newBlock && Array.isArray(newBlock.packages)) {
          this.localPackages = [...new Set(newBlock.packages.map(pkg => String(pkg).trim()).filter(Boolean))];
        } else {
          this.localPackages = [];
        }

        this.packageInput = '';

        this.$nextTick(() => {
          this.syncEditorFromLocalCode();
          if (this.codeMirror) {
            this.codeMirror.scrollTo(0, 0);
            this.codeMirror.focus();
          }
        });
      }
    }
  },
  methods: {
    initCodeEditor() {
      // Clear previous editor if exists
      const codeareaEl = this.$refs.codearea;
      if (!codeareaEl) {
        console.warn('CodeEditor: codearea ref not found');
        return;
      }

      // Remove any existing CodeMirror instance
      if (this.codeMirror) {
        this.codeMirror.toTextArea();
        this.codeMirror = null;
      }

      // Clear the container
      while (codeareaEl.firstChild) {
        codeareaEl.removeChild(codeareaEl.firstChild);
      }

      this.codeMirror = CodeMirror(codeareaEl, {
        value: this.localCode,
        mode: 'python',
        theme: 'material-darker',
        lineNumbers: true,
        gutters: ['CodeMirror-linenumbers'],
        indentUnit: 4,
        tabSize: 4,
        smartIndent: true,
        lineWrapping: false,
        styleActiveLine: true,
        viewportMargin: Infinity,
        autoCloseBrackets: true,
        matchBrackets: true,
        extraKeys: {
          'Escape': () => this.close()
        }
      });

      this.codeMirror.on('change', (instance) => {
        this.isSyncingFromEditor = true;
        this.localCode = instance.getValue();
        this.isSyncingFromEditor = false;
      });

      this.codeMirror.setSize('100%', '100%');
      setTimeout(() => {
        if (this.codeMirror) {
          this.codeMirror.refresh();
          this.codeMirror.focus();
        }
      }, 100);
    },

    syncEditorFromLocalCode() {
      if (!this.codeMirror) {
        return;
      }

      if (this.codeMirror.getValue() !== this.localCode) {
        this.codeMirror.setValue(this.localCode);
      }
    },

    close() {
      if (this.codeMirror) {
        this.localCode = this.codeMirror.getValue();
      }
      this.$emit('close');
    },
    
    saveCode() {
      this.saveStatus = 'saving';
      this.$emit('save', {
        code: this.localCode,
        packages: [...this.localPackages]
      });
      
      // Show save confirmation for 1.5 seconds
      setTimeout(() => {
        this.saveStatus = 'saved';
        setTimeout(() => {
          this.saveStatus = 'idle';
          this.close();
        }, 1500);
      }, 100);
    },

    addPackage() {
      const normalized = this.packageInput.trim();
      if (!normalized) {
        return;
      }

      if (!this.localPackages.includes(normalized)) {
        this.localPackages.push(normalized);
      }

      this.packageInput = '';
    },

    removePackage(packageName) {
      this.localPackages = this.localPackages.filter(pkg => pkg !== packageName);
    },
    
    resetCode() {
      if (this.block && this.block.defaultCode) {
        this.localCode = this.block.defaultCode;
      } else {
        this.localCode = '';
      }

      this.localPackages = [];
      this.syncEditorFromLocalCode();
      if (this.codeMirror) {
        this.codeMirror.focus();
      }
    }
  }
};
</script>

<style scoped>
.code-editor-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.code-editor-container {
  background: var(--bg-elevated);
  border-radius: 14px;
  border: 1px solid var(--border-color);
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-soft);
}

.editor-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-secondary);
  border-radius: 14px 14px 0 0;
}

.editor-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 32px;
  line-height: 1;
  cursor: pointer;
  color: var(--text-muted);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.close-btn:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.header-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #4ade80;
  font-weight: 600;
  animation: fadeInOut 2s ease-in-out;
}

@keyframes fadeInOut {
  0%, 100% { opacity: 1; }
  80% { opacity: 1; }
  95% { opacity: 0; }
}

.editor-body {
  flex: 1;
  overflow: hidden;
  padding: 12px;
  background: #1e1e1e;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.module-manager {
  background: #252526;
  border: 1px solid #313131;
  border-radius: 8px;
  padding: 10px;
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.module-title {
  font-size: 12px;
  font-weight: 700;
  color: #d4d4d4;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.module-count {
  font-size: 12px;
  color: #8f8f8f;
}

.module-input-row {
  display: flex;
  gap: 8px;
}

.module-input {
  flex: 1;
  border-radius: 6px;
  border: 1px solid #3c3c3c;
  background: #1f1f1f;
  color: #d4d4d4;
  font-size: 13px;
  padding: 8px 10px;
  outline: none;
}

.module-input:focus {
  border-color: #007acc;
}

.add-module-btn {
  border: 1px solid #0e639c;
  background: #0e639c;
  color: white;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.add-module-btn:hover {
  background: #1177bb;
}

.module-chips {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.module-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #2d2d2d;
  border: 1px solid #3c3c3c;
  color: #c8c8c8;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
}

.chip-remove {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  background: #1f1f1f;
  color: #9aa0a6;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  line-height: 1;
}

.chip-remove:hover {
  color: #ffffff;
}

.editor-surface {
  flex: 1;
  border: 1px solid #2f2f2f;
  border-radius: 8px;
  overflow: hidden;
  background: #1e1e1e;
  display: flex;
  flex-direction: column;
}

.editor-tabbar {
  height: 35px;
  background: #252526;
  border-bottom: 1px solid #2f2f2f;
  display: flex;
  align-items: end;
  padding: 0 10px;
}

.editor-tab {
  height: 100%;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  font-size: 12px;
  color: #9ea4ad;
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
}

.editor-tab.active {
  background: #1e1e1e;
  color: #d4d4d4;
  border-top: 1px solid #3c3c3c;
  border-left: 1px solid #3c3c3c;
  border-right: 1px solid #3c3c3c;
}

.editor-pane {
  flex: 1;
  overflow: hidden;
  background: #1e1e1e;
}

.code-editor-host {
  width: 100%;
  height: 100%;
}

:deep(.CodeMirror) {
  height: 100%;
  font-family: 'Cascadia Code', 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  line-height: 22px;
  background: #1e1e1e;
  color: #d4d4d4;
  letter-spacing: 0.5px;
}

:deep(.CodeMirror-gutters) {
  background: #1a1a1a;
  border-right: 1px solid #2a2a2a;
  min-width: 40px;
}

:deep(.CodeMirror-linenumber) {
  color: #6b7280;
  padding: 0 8px;
  text-align: right;
  min-width: 40px;
  font-family: 'Cascadia Code', 'Consolas', 'Courier New', monospace;
  font-size: 13px;
}

:deep(.CodeMirror-linenumber:hover) {
  color: #9ca3af;
}

:deep(.CodeMirror-linewidget) {
  clarity: auto;
}

:deep(.CodeMirror-cursor) {
  border-left: 1.5px solid #d4d4d4;
}

:deep(.CodeMirror-selected),
:deep(.CodeMirror-focused .CodeMirror-selected) {
  background: rgba(38, 79, 120, 0.85);
}

.editor-footer {
  padding: 10px 12px;
  border-top: 1px solid #2f2f2f;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #007acc;
  border-radius: 0 0 14px 14px;
}

.editor-info {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #ffffff;
}

.line-count {
  font-weight: 600;
  color: #ffffff;
}

.editor-actions {
  display: flex;
  gap: 10px;
}

.reset-btn, .cancel-btn, .save-btn {
  padding: 7px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
}

.reset-btn {
  background: #3a3d41;
  color: white;
  border: 1px solid #4a4d52;
}

.reset-btn:hover {
  background: #474b50;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.28);
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.22);
}

.save-btn {
  background: #0e639c;
  color: white;
  border: 1px solid #0f74b6;
}

.save-btn:hover {
  background: #1177bb;
}

@media (max-width: 900px) {
  .code-editor-modal {
    padding: 10px;
  }

  .code-editor-container {
    max-height: 95vh;
  }

  .editor-footer {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .editor-actions {
    width: 100%;
    justify-content: flex-end;
    flex-wrap: wrap;
  }
}

@media (max-width: 640px) {
  .editor-header {
    padding: 12px;
  }

  .editor-header h3 {
    font-size: 14px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .module-input-row {
    flex-direction: column;
  }

  .add-module-btn,
  .reset-btn,
  .cancel-btn,
  .save-btn {
    width: 100%;
  }

  .editor-actions {
    flex-direction: column;
  }
}
</style>
