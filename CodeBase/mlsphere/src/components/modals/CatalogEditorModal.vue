<template>
  <div v-if="visible" class="catalog-modal" @click.self="onCancel">
    <div class="catalog-content">
      <div class="catalog-header">
        <h2>Catalog Mapping</h2>
        <button class="catalog-close-btn" @click="onCancel">✕</button>
      </div>
      <p class="catalog-subtitle">Map package names to block names and sections for this project.</p>

      <div class="catalog-unmapped" v-if="availablePackages.length > 0">
        <h3>Unmapped Packages</h3>
        <p>These packages are loaded from your folder but are not blocks yet.</p>
        <div class="catalog-unmapped-list">
          <div v-for="packageName in availablePackages" :key="`unmapped-${packageName}`" class="catalog-unmapped-item">
            <span>{{ packageName }}</span>
            <button class="catalog-row-btn" @click="onAddPackageToMapping(packageName)">Add as Block</button>
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
        <button class="catalog-action-btn secondary" @click="onCancel">No, cancel</button>
        <button class="catalog-action-btn primary" @click="onSave">Yes, save</button>
      </div>
    </div>
  </div>
</template>

<script>
import { useCatalogEditor } from '@/services/catalog/catalogEditor';

export default {
  name: 'CatalogEditorModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    availablePackages: {
      type: Array,
      default: () => []
    }
  },
  setup() {
    const catalog = useCatalogEditor();
    return { ...catalog };
  },
  methods: {
    onAddPackageToMapping(packageName) {
      this.addPackageToMapping(packageName);
    },
    onCatalogRowChange() {
      this.syncCatalogJson();
    },
    onSave() {
      this.$emit('save');
    },
    onCancel() {
      this.$emit('cancel');
    }
  }
};
</script>

<style scoped>
.catalog-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(3, 7, 15, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2200;
  padding: 16px;
}

.catalog-content {
  width: 100%;
  max-width: 980px;
  max-height: 90vh;
  overflow-y: auto;
  background: #162239;
  border: 1px solid #233552;
  border-radius: 12px;
  padding: 16px;
}

.catalog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.catalog-header h2 {
  margin: 0;
  font-size: 22px;
  color: #e6edf8;
}

.catalog-close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #233552;
  background: transparent;
  color: #b8c6db;
  cursor: pointer;
  font-weight: 700;
}

.catalog-close-btn:hover {
  color: #e6edf8;
}

.catalog-subtitle {
  margin: 0 0 12px 0;
  color: #b8c6db;
  font-size: 13px;
}

.catalog-unmapped {
  margin-bottom: 12px;
  padding: 10px;
  border: 1px solid #233552;
  border-radius: 10px;
  background: rgba(15, 23, 41, 0.9);
}

.catalog-unmapped h3 {
  margin: 0;
  font-size: 14px;
  color: #e6edf8;
}

.catalog-unmapped > p {
  margin: 6px 0 8px 0;
  color: #b8c6db;
  font-size: 12px;
}

.catalog-unmapped-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.catalog-unmapped-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid #233552;
  border-radius: 8px;
  color: #e6edf8;
  font-size: 13px;
}

.catalog-mode-switch {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.catalog-mode-btn {
  border: 1px solid #233552;
  background: transparent;
  color: #b8c6db;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
}

.catalog-mode-btn.active {
  background: rgba(37, 99, 235, 0.24);
  border-color: #2563eb;
  color: #e6edf8;
}

.catalog-body {
  margin-bottom: 12px;
}

.catalog-empty-hint {
  margin: 0 0 8px 0;
  color: #8ca2c2;
  font-size: 12px;
}

.catalog-grid-header,
.catalog-grid-row {
  display: grid;
  grid-template-columns: 1.3fr 1fr 0.9fr auto;
  gap: 8px;
  align-items: center;
}

.catalog-grid-header {
  color: #8ca2c2;
  font-size: 12px;
  margin-bottom: 6px;
  font-weight: 600;
}

.catalog-grid-row {
  margin-bottom: 8px;
}

.catalog-input {
  width: 100%;
  border: 1px solid #233552;
  background: #0f1729;
  color: #e6edf8;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
}

.catalog-input:focus {
  outline: none;
  border-color: #2563eb;
}

.catalog-row-btn,
.catalog-add-btn {
  border: 1px solid #233552;
  background: transparent;
  color: #b8c6db;
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 12px;
}

.catalog-row-btn:hover,
.catalog-add-btn:hover {
  color: #e6edf8;
  border-color: #31507a;
}

.catalog-add-btn {
  margin-top: 4px;
  width: 100%;
}

.catalog-json {
  width: 100%;
  min-height: 360px;
  border: 1px solid #233552;
  background: #0f1729;
  color: #e6edf8;
  border-radius: 8px;
  padding: 12px;
  resize: vertical;
  font-family: 'Cascadia Code', 'Consolas', 'Courier New', monospace;
  font-size: 12px;
}

.catalog-json:focus {
  outline: none;
  border-color: #2563eb;
}

.catalog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.catalog-action-btn {
  border: 1px solid #233552;
  border-radius: 8px;
  padding: 9px 12px;
  font-weight: 600;
  cursor: pointer;
  font-size: 13px;
}

.catalog-action-btn.secondary {
  background: transparent;
  color: #b8c6db;
}

.catalog-action-btn.secondary:hover {
  color: #e6edf8;
  border-color: #31507a;
}

.catalog-action-btn.primary {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
}

.catalog-action-btn.primary:hover {
  background: #1d4ed8;
}
</style>
