<template>
  <div class="block-library">
    <h2>📚 ML Block Library</h2>
    
    <!-- Uploaded Project Files Section (ONLY for python-import projects) -->
    <template v-if="isLocalImportProject">
      <!-- Show unmapped packages list -->
      <div v-if="isLocalImportWithoutMapping" class="uploaded-files-section">
        <h3 class="section-title">📦 Uploaded Project Files</h3>
        <p class="section-hint">Map these packages to blocks using Catalog Mapping</p>
        <div class="uploaded-packages-list">
          <div v-for="pkg in uploadedPackages" :key="pkg" class="uploaded-package-item">
            <span class="package-name">{{ pkg }}</span>
            <span class="package-status">unmapped</span>
          </div>
        </div>
      </div>
      
      <!-- Show mapped blocks as draggable blocks (after catalog mapping) -->
      <div v-else-if="hasMappedBlocks" class="mapped-blocks-container">
        <div v-for="(categoryInfo, category) in mappedCategories" :key="category" class="category-section">
          <h3 class="category-header">
            <span>{{ categoryInfo.icon }} {{ category }}</span>
          </h3>
          
          <div class="block-list">
            <div
              v-for="block in getMappedBlocksByCategory(category)"
              :key="block.id"
              class="library-block"
              draggable="true"
              @dragstart="onDragStart($event, block)"
              @click="addBlock(block)"
            >
              <div class="library-block-header">
                <span class="library-block-icon">{{ block.icon || '📦' }}</span>
                <span class="library-block-title">{{ block.name || 'Block' }}</span>
              </div>
              <div class="library-block-info">
                <span class="io-pill">In {{ (block.inputs || []).length }}</span>
                <span class="io-pill">Out {{ (block.outputs || []).length }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Fallback: show package list if blocks exist but not properly formatted -->
      <div v-else class="uploaded-files-section mapped-section">
        <h3 class="section-title">📦 Uploaded Project Mapped to Blocks</h3>
        <p class="section-hint">Edit catalog mapping to adjust package assignments</p>
        <div class="uploaded-packages-list">
          <div v-for="pkg in uploadedPackages" :key="pkg" class="uploaded-package-item mapped">
            <span class="package-name">{{ pkg }}</span>
            <span class="package-status">mapped</span>
          </div>
        </div>
      </div>
    </template>
    
    <!-- Predefined Blocks (ONLY for template projects, NOT for python-import) -->
    <template v-else>
      <div v-for="(categoryInfo, category) in categories" :key="category" class="category-section">
        <h3 class="category-header">
          <span>{{ categoryInfo.icon }} {{ category }}</span>
        </h3>
        
        <div class="block-list">
          <div
            v-for="block in getBlocksByCategory(category)"
            :key="block.id"
            class="library-block"
            draggable="true"
            @dragstart="onDragStart($event, block)"
            @click="addBlock(block)"
          >
            <div class="library-block-header">
              <span class="library-block-icon">{{ block.icon || '📦' }}</span>
              <span class="library-block-title">{{ block.name || 'Block' }}</span>
            </div>
            <div class="library-block-info">
              <span class="io-pill">In {{ (block.inputs || []).length }}</span>
              <span class="io-pill">Out {{ (block.outputs || []).length }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
    
  </div>
</template>

<script>
import { blockTypes, blockCategories } from '../../services/catalog/blockTypes';

export default {
  name: 'BlockLibrary',
  props: {
    currentProject: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      categories: blockCategories
    };
  },
  computed: {
    isLocalImportProject() {
      return this.currentProject?.type === 'python-import';
    },
    isLocalImportWithoutMapping() {
      return this.currentProject?.type === 'python-import' &&
        this.currentProject?.config?.catalogStatus === 'unmapped';
    },
    uploadedPackages() {
      return Array.isArray(this.currentProject?.config?.localPackages)
        ? this.currentProject.config.localPackages
        : [];
    },
    hasMappedBlocks() {
      return Array.isArray(this.currentProject?.blocks) && 
        this.currentProject.blocks.length > 0 &&
        this.currentProject.blocks.some(b => b && b.id);
    },
    mappedCategories() {
      if (!this.hasMappedBlocks) return {};
      
      const categoriesSet = new Set(
        this.currentProject.blocks
          .filter(block => block && block.category)
          .map(block => block.category)
      );
      
      const result = {};
      categoriesSet.forEach(cat => {
        result[cat] = blockCategories[cat] || { icon: '📦' };
      });
      
      return result;
    }
  },
  methods: {
    getBlocksByCategory(category) {
      return Object.values(blockTypes)
        .filter(block => block && block.id && block.category === category);
    },
    
    getMappedBlocksByCategory(category) {
      if (!this.hasMappedBlocks) return [];
      return this.currentProject.blocks
        .filter(block => block && block.id && block.category === category);
    },
    
    onDragStart(event, block) {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('block', JSON.stringify(block));
    },
    
    addBlock(block) {
      this.$emit('add-block', block);
    }
  }
};
</script>

<style scoped>
.block-library {
  width: 280px;
  flex-shrink: 0;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  padding: 20px;
  overflow-y: auto;
  height: 100%;
}

.block-library h2 {
  margin: 0 0 20px 0;
  font-size: 20px;
  color: var(--text-primary);
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-color);
}

/* Uploaded Files Section */
.uploaded-files-section {
  margin-bottom: 30px;
  padding: 15px;
  background: rgba(160, 212, 104, 0.08);
  border: 1px solid rgba(160, 212, 104, 0.2);
  border-radius: 10px;
}

.uploaded-files-section .section-title {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 700;
  color: #a0d468;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-hint {
  margin: 0 0 12px 0;
  font-size: 12px;
  color: #888;
  line-height: 1.4;
}

.uploaded-packages-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.uploaded-package-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  background: rgba(45, 45, 45, 0.6);
  border: 1px solid #404040;
  border-radius: 6px;
  font-size: 12px;
}

.package-name {
  color: #d3d3d3;
  font-weight: 500;
  flex: 1;
}

.package-status {
  color: #b0a080;
  font-size: 10px;
  text-transform: uppercase;
  background: rgba(176, 160, 128, 0.15);
  padding: 2px 6px;
  border-radius: 3px;
}

/* Mapped section styles */
.uploaded-files-section.mapped-section {
  background: rgba(104, 160, 212, 0.08);
  border: 1px solid rgba(104, 160, 212, 0.2);
}

.uploaded-files-section.mapped-section .section-title {
  color: #68a0d4;
}

.uploaded-package-item.mapped {
  background: rgba(45, 55, 75, 0.8);
  border: 1px solid rgba(104, 160, 212, 0.3);
}

.uploaded-package-item.mapped .package-status {
  color: #68a0d4;
  background: rgba(104, 160, 212, 0.15);
  font-weight: 600;
}

/* Mapped blocks container for python-import projects */
.mapped-blocks-container {
  margin-top: 10px;
}

.category-section {
  margin-bottom: 25px;
}

.category-header {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}

.block-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.library-block {
  position: relative;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  cursor: grab;
  transition: all 0.25s ease;
  overflow: hidden;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
}

.library-block:hover {
  box-shadow: var(--shadow-hover);
  transform: translateY(-3px) scale(1.01);
}

.library-block::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.75), transparent);
  opacity: 0.65;
}

.library-block:active {
  cursor: grabbing;
}

.library-block-header {
  background: #333333;
  padding: 10px 12px;
  color: white;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.library-block-icon {
  font-size: 17px;
}

.library-block-title {
  font-size: 13px;
  flex: 1;
}

.library-block-info {
  padding: 8px 10px;
  background: color-mix(in srgb, var(--bg-secondary) 88%, transparent);
  display: flex;
  align-items: center;
  gap: 8px;
}

.io-pill {
  font-size: 11px;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--bg-elevated) 82%, var(--border-color));
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 3px 8px;
  font-weight: 600;
}



@media (max-width: 1200px) {
  .block-library {
    width: 240px;
    padding: 14px;
  }
}

@media (max-width: 768px) {
  .block-library {
    width: 100%;
    max-height: 42vh;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }

  .block-library h2 {
    font-size: 16px;
    margin-bottom: 12px;
    padding-bottom: 10px;
  }
}
</style>
