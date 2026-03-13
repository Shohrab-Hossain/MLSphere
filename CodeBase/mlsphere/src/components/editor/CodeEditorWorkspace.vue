<template>
  <div class="code-editor-workspace">
    <!-- File Explorer Sidebar -->
    <div class="workspace-sidebar">
      <!-- Sidebar Tabs -->
      <div class="sidebar-tab-bar">
        <button class="sidebar-tab" :class="{ active: sidebarTab === 'files' }" @click="sidebarTab = 'files'">📂 Files</button>
        <button class="sidebar-tab" :class="{ active: sidebarTab === 'blocks' }" @click="sidebarTab = 'blocks'">📦 Blocks</button>
      </div>

      <!-- File Tree Panel -->
      <div v-show="sidebarTab === 'files'" class="file-explorer file-tree-panel">
        <div v-if="!projectFiles || !projectFiles.length" class="empty-workspace-state">
          <div class="empty-icon">📂</div>
          <p class="empty-title">No Files Loaded</p>
          <p class="empty-description">Load a project or select a template to view files here.</p>
        </div>
        <div v-else class="file-tree-root">
          <!-- Inline create at root level -->
          <div v-if="treeInlineCreate.show && !treeInlineCreate.parentPath" class="tree-node tree-inline-create" style="padding-left: 8px;">
            <span class="tree-icon">{{ treeInlineCreate.type === 'file' ? '📄' : (treeInlineCreate.isPackage ? '📦' : '📁') }}</span>
            <input
              ref="treeCreateInput"
              v-model="treeInlineCreate.value"
              type="text"
              class="tree-inline-input"
              :placeholder="treeInlineCreate.type === 'file' ? 'filename.py' : (treeInlineCreate.isPackage ? 'package_name' : 'folder_name')"
              @keyup.enter.stop="submitTreeCreate"
              @keyup.esc.stop="cancelTreeCreate"
              @blur="submitTreeCreate"
              @click.stop
            />
          </div>

          <template v-for="node in fileTreeNodes" :key="node.path">
            <div
              class="tree-node"
              :class="{
                'tree-node-dir': node.type === 'dir',
                'tree-node-file': node.type === 'file',
                'tree-node-active': activeFileId === ('tree-file-' + node.path),
                'tree-node-cut': treeClipboard.mode === 'cut' && treeClipboard.node && (treeClipboard.node.path === node.path || node.path.startsWith(treeClipboard.node.path + '/'))
              }"
              :style="{ paddingLeft: (8 + node.depth * 16) + 'px' }"
              @click="node.type === 'dir' ? toggleTreeFolder(node.path) : selectTreeFile(node)"
              @contextmenu.prevent.stop="onTreeNodeContextMenu($event, node)"
            >
              <span class="tree-chevron" v-if="node.type === 'dir'">{{ node.isExpanded ? '▼' : '▶' }}</span>
              <span class="tree-chevron tree-chevron-spacer" v-else></span>
              <span v-if="node.type === 'dir'" class="tree-icon">{{ node.isExpanded ? '📂' : '📁' }}</span>
              <span v-else class="tree-file-badge" :class="getFileIconDef(node.name).cls">{{ getFileIconDef(node.name).label }}</span>
              <span class="tree-name">{{ node.name }}</span>
            </div>
            <!-- Inline create inside this dir -->
            <div
              v-if="treeInlineCreate.show && treeInlineCreate.parentPath === node.path && node.type === 'dir' && node.isExpanded"
              class="tree-node tree-inline-create"
              :style="{ paddingLeft: (8 + (node.depth + 1) * 16) + 'px' }"
            >
              <span class="tree-icon">{{ treeInlineCreate.type === 'file' ? '📄' : (treeInlineCreate.isPackage ? '📦' : '📁') }}</span>
              <input
                ref="treeCreateInputNested"
                v-model="treeInlineCreate.value"
                type="text"
                class="tree-inline-input"
                :placeholder="treeInlineCreate.type === 'file' ? 'filename.py' : (treeInlineCreate.isPackage ? 'package_name' : 'folder_name')"
                @keyup.enter.stop="submitTreeCreate"
                @keyup.esc.stop="cancelTreeCreate"
                @blur="submitTreeCreate"
                @click.stop
              />
            </div>
          </template>
        </div>
      </div>

      <!-- Blocks Panel -->
      <div v-show="sidebarTab === 'blocks'" class="file-explorer">
        <!-- Empty state for python-import projects with no mapped blocks -->
        <div v-if="blockLibrary.length === 0 && projectType === 'python-import'" class="empty-workspace-state">
          <div class="empty-icon">📦</div>
          <p class="empty-title">No Blocks Mapped Yet</p>
          <p class="empty-description">Use the "🗂 Catalog Mapping" button to map your uploaded packages to blocks.</p>
          <p class="empty-hint-small">Go back to Pipeline view and click "Catalog Mapping" in the header.</p>
        </div>
        
        <!-- Block Packages - Each block is a package -->
        <div 
          v-for="category in categorizedBlocks" 
          :key="category.name"
          class="file-category"
        >
          <div class="category-header" @click="toggleCategory(category.name)">
            <span class="toggle-icon">{{ expandedCategories[category.name] ? '▼' : '▶' }}</span>
            <span class="category-name">{{ category.name }}</span>
          </div>
          
          <div v-show="expandedCategories[category.name]" class="category-blocks">
            <!-- Each Block as a Package Folder -->
            <div 
              v-for="block in category.blocks"
              :key="block.id"
              class="block-package"
            >
              <!-- Block Package Header (Folder) -->
              <div 
                class="block-package-header folder-style"
                @click="toggleBlockExpanded(block.id)"
                @contextmenu="handleBlockContextMenu($event, block)"
              >
                <span class="folder-toggle" @click.stop="toggleBlockExpanded(block.id)">
                  {{ expandedBlocks[block.id] ? '▼' : '▶' }}
                </span>
                <span class="folder-icon">📁</span>
                <span class="folder-name">{{ block.name }}</span>
              </div>

              <!-- Block Package Contents -->
              <div v-show="expandedBlocks[block.id]" class="block-package-contents">
                <!-- Custom Folders (sub-packages) under this block -->
                <folder-tree-item
                  v-for="folder in getBlockFolders(block.id)"
                  :key="folder.id"
                  :folder="folder"
                  :all-folders="customFolders"
                  :all-modules="customModules"
                  :selected-item="selectedItem"
                  :selected-folder="selectedFolder"
                  :expanded-folders="expandedFolders"
                  :inline-rename="inlineRename"
                  :inline-create="inlineCreate"
                  :block-id="block.id"
                  @select-module="selectModule"
                  @select-folder="selectFolderContext"
                  @toggle-folder="toggleFolderExpanded"
                  @delete-folder="deleteFolder"
                  @delete-module="deleteModule"
                  @show-context-menu="handleContextMenu"
                  @update-inline-rename="updateInlineRenameValue"
                  @submit-inline-rename="submitInlineRename"
                  @cancel-inline-rename="cancelInlineRename"
                  @update-inline-create="updateInlineCreateValue"
                  @submit-inline-create="submitInlineCreate"
                  @cancel-inline-create="cancelInlineCreate"
                />
                
                <!-- Custom Python Files directly under this block package -->
                <div 
                  v-for="module in getBlockModules(block.id)"
                  :key="module.id"
                  class="file-item module-item"
                  :class="{ active: selectedItem && selectedItem.type === 'module' && selectedItem.id === module.id }"
                  @click="isInlineRenaming('module', module.id) ? null : selectModule(module)"
                  @contextmenu="handleModuleContextMenu($event, module, block.id)"
                  style="padding-left: 32px;"
                >
                  <span class="file-icon">📄</span>
                  <template v-if="isInlineRenaming('module', module.id)">
                    <input
                      v-model="inlineRename.value"
                      type="text"
                      class="inline-rename-input"
                      :data-rename-id="module.id"
                      @click.stop
                      @keyup.enter.stop="submitInlineRename"
                      @keyup.esc.stop="cancelInlineRename"
                      @blur="submitInlineRename"
                    />
                  </template>
                  <template v-else>
                    <span class="file-name">{{ getModuleDisplayFilename(module.name) }}</span>
                  </template>
                </div>

                <div
                  v-if="shouldShowInlineCreateFor(block.id, null)"
                  class="file-item module-item inline-create-row"
                  style="padding-left: 32px;"
                >
                  <span class="file-icon">{{ getInlineCreateIcon() }}</span>
                  <input
                    v-model="inlineCreate.value"
                    type="text"
                    class="inline-create-input"
                    :placeholder="getInlineCreatePlaceholder()"
                    :data-create-scope="getCreateScopeKey(block.id, null)"
                    @click.stop
                    @keyup.enter.stop="submitInlineCreate"
                    @keyup.esc.stop="cancelInlineCreate"
                    @blur="submitInlineCreate"
                  />
                </div>

                <!-- __init__.py (package init file) - appears last after all folders and modules -->
                <div
                  class="file-item block-init-file"
                  :class="{ active: selectedItem && selectedItem.type === 'block-init' && selectedItem.blockId === block.id }"
                  @click="selectBlockInit(block)"
                  @contextmenu.prevent.stop="handleBlockInitContextMenu($event, block)"
                  style="padding-left: 32px;"
                >
                  <span class="file-icon">🐍</span>
                  <span class="file-name">__init__.py</span>
                </div>

                <!-- Empty state hint -->
                <div v-if="getBlockFolders(block.id).length === 0 && getBlockModules(block.id).length === 0" class="empty-block-content">
                  <span class="empty-hint">Right-click block to add files</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Editor Area -->
    <div class="workspace-main">
      <!-- Breadcrumb / File Header -->
      <div class="editor-breadcrumb">
        <span v-if="selectedItem" class="breadcrumb-text">
          <template v-if="selectedItem.type === 'block-init'">
            <span>📦 {{ selectedItem.blockName }} /</span>
            <strong>__init__.py</strong>
          </template>
          <template v-else-if="selectedItem.type === 'module'">
            <span v-if="selectedItem.blockId">📦 {{ getModuleBlockName(selectedItem.blockId) }} /</span>
            <span v-else>📄 </span>
            <strong>{{ getModuleDisplayFilename(selectedItem.name) }}</strong>
          </template>
          <template v-else>
            <span>{{ selectedBlock?.category }} /</span>
            <strong>{{ selectedItem.name }}.py</strong>
          </template>
        </span>
        <span v-else class="breadcrumb-empty">Select a file to edit</span>
      </div>

      <!-- Code Editor -->
      <div v-if="openFiles.length > 0" class="editor-container">
        <div class="editor-top">
          <div class="editor-tabbar">
            <div
              v-for="file in openFiles"
              :key="file.id"
              class="editor-tab"
              :class="{ active: activeFileId === file.id }"
              @click="switchToTab(file.id)"
            >
              <span class="tab-label">
                <template v-if="file.type === 'block-init'">
                  {{ file.blockName }}/__init__.py
                </template>
                <template v-else>
                  {{ getModuleDisplayFilename(file.name) }}
                </template>
              </span>
              <span class="tab-close" @click.stop="closeTab(file.id)">✕</span>
            </div>
          </div>
          <!-- Run Button -->
          <button
            v-if="activeFile && isPythonActiveFile"
            class="editor-run-btn"
            :class="{ 'run-btn-running': runStatus === 'running' }"
            :disabled="runStatus === 'running'"
            @click="runCurrentFile"
            title="Run current file"
          >
            <svg v-if="runStatus !== 'running'" width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M5 3l8 5-8 5V3z" fill="currentColor"/>
            </svg>
            <span v-if="runStatus === 'running'" class="run-spinner"></span>
            {{ runStatus === 'running' ? 'Running…' : 'Run' }}
          </button>
        </div>

        <div class="editor-main">
          <div v-if="activeFile && isCsvActive" class="csv-editor-view">
            <div class="csv-preview-toolbar">
              <span class="csv-preview-title">CSV Table Preview</span>
              <span class="csv-preview-meta">{{ csvPreviewRows.length }} rows</span>
            </div>
            <div class="csv-preview-table-wrap">
              <table class="csv-preview-table">
                <tbody>
                  <tr v-for="(row, rowIndex) in csvPreviewRows" :key="`csv-row-${rowIndex}`">
                    <template v-if="rowIndex === 0">
                      <th v-for="(cell, cellIndex) in row" :key="`csv-h-${rowIndex}-${cellIndex}`">
                        {{ cell }}
                      </th>
                    </template>
                    <template v-else>
                      <td v-for="(cell, cellIndex) in row" :key="`csv-c-${rowIndex}-${cellIndex}`">
                        {{ cell }}
                      </td>
                    </template>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div v-else-if="activeFile && isImageActive" class="image-editor-view">
            <div class="image-preview-toolbar">
              <span class="image-preview-title">Image Preview</span>
              <span class="image-preview-meta">{{ getModuleDisplayFilename(activeFile.name) }}</span>
            </div>
            <div class="image-preview-wrap">
              <img
                v-if="activeImageSrc"
                :src="activeImageSrc"
                :alt="getModuleDisplayFilename(activeFile.name)"
                class="image-preview"
              />
              <div v-else class="image-preview-empty">Image content is not available for this file.</div>
            </div>
          </div>
          <div v-else-if="activeFile && isIpynbActive" class="ipynb-editor-view">
            <div class="ipynb-preview-toolbar">
              <span class="ipynb-preview-title">Notebook Preview</span>
              <span class="ipynb-preview-meta">{{ ipynbPreview.valid ? `${ipynbPreview.cells.length} cells` : 'Invalid notebook JSON' }}</span>
            </div>
            <div v-if="ipynbPreview.valid" class="ipynb-cells-wrap">
              <div v-for="(cell, index) in ipynbPreview.cells" :key="`ipynb-${index}`" class="ipynb-cell" :class="`ipynb-${cell.type}`">
                <div class="ipynb-cell-header">{{ index + 1 }}. {{ cell.type.toUpperCase() }}</div>
                <pre class="ipynb-cell-content">{{ cell.preview }}</pre>
              </div>
            </div>
            <div v-else class="ipynb-invalid">Notebook file is not valid JSON. Open raw view by fixing JSON format.</div>
          </div>
          <div v-else-if="activeFile" class="text-editor-wrap">
            <div class="line-numbers" aria-hidden="true">
              <div class="line-numbers-inner" :style="{ transform: `translateY(-${editorScrollTop}px)` }">
                <div v-for="line in lineNumbers" :key="`ln-${line}`" class="line-number">{{ line }}</div>
              </div>
            </div>
            <textarea
              v-model="localCode"
              @input="handleCodeChange"
              @scroll="onEditorScroll"
              class="code-textarea"
              :placeholder="editorPlaceholder"
            ></textarea>
          </div>
        </div>

        <!-- Status Bar -->
        <div class="editor-statusbar">
          <span class="status-item">{{ activeLanguageLabel }}</span>
          <span v-if="showLineCount" class="status-item">{{ lineCount }} lines</span>
          <span
            v-if="isJsonActive"
            class="status-item"
            :class="{ 'json-invalid': !jsonValidation.valid }"
          >
            {{ jsonValidation.valid ? 'JSON ✓ Valid' : `JSON ⚠ ${jsonValidation.message}` }}
          </span>
          <span class="status-item auto-save" :class="{ modified: isModified }">
            {{ isModified ? '● Modified' : '✓ Saved' }}
          </span>
          <span v-if="activeFile?.type === 'block-init'" class="status-item">
            Package Init • Import: <code>from {{ activeFile.blockName }} import *</code>
          </span>
          <span v-else-if="activeFile?.type === 'module'" class="status-item">
            <template v-if="isPythonModule(activeFile.name) && activeFile.blockId">
              Module • Import: <code>from {{ getModuleBlockName(activeFile.blockId) }}.{{ getPythonModuleName(activeFile.name) }} import *</code>
            </template>
            <template v-else-if="isPythonModule(activeFile.name)">
              Python Module
            </template>
            <template v-else>
              File • {{ (getModuleDisplayExt(activeFile.name) || '').replace('.', '').toUpperCase() }}
            </template>
          </span>
        </div>

        <!-- Run Output Panel -->
        <div v-if="showRunPanel" class="run-output-panel" :class="`run-output-${runStatus}`">
          <div class="run-output-header">
            <span class="run-output-label">
              <span v-if="runStatus === 'running'" class="run-spinner-sm"></span>
              <span v-else-if="runStatus === 'success'">✓</span>
              <span v-else-if="runStatus === 'error'">✗</span>
              Output
            </span>
            <button class="run-output-close" @click="showRunPanel = false; runOutput = ''; runStatus = 'idle'">✕</button>
          </div>
          <pre class="run-output-content">{{ runOutput || '…' }}</pre>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="editor-empty">
        <div class="empty-icon">📝</div>
        <p>Select a file from a block package to start editing</p>
        <p class="empty-hint-small">Each block is a Python package with __init__.py and optional custom files</p>
      </div>
    </div>

    <!-- Flash Notification -->
    <transition name="flash-slide">
      <div
        v-if="flashNotification.show"
        class="flash-notification"
        :class="`flash-${flashNotification.type}`"
      >
        <span class="flash-icon">{{ getFlashIcon(flashNotification.type) }}</span>
        <span class="flash-message">{{ flashNotification.message }}</span>
      </div>
    </transition>

    <!-- Context Menu (Blocks panel) -->
    <div v-if="contextMenu.show && contextMenu.source !== 'tree'" class="context-menu" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }" @click.stop>
      <div class="context-menu-item" @click="startCreateFile(contextMenu.item)">
        📄 New File
      </div>
      <div class="context-menu-item" @click="startCreateFolder(contextMenu.item, false)">
        📁 New Folder
      </div>
      <div class="context-menu-item" @click="startCreateFolder(contextMenu.item, true)">
        📦 New Package
      </div>
      <template v-if="contextMenu.type === 'module' || contextMenu.type === 'folder'">
        <div class="context-menu-item" @click="startRenameFromContextMenu">
          ✏️ Rename
        </div>
        <div class="context-menu-divider"></div>
        <div v-if="contextMenu.type === 'module'" class="context-menu-item context-menu-danger" @click="confirmAndDeleteModule(contextMenu.item.id)">
          🗑️ Delete File
        </div>
        <div v-if="contextMenu.type === 'folder'" class="context-menu-item context-menu-danger" @click="confirmAndDeleteFolder(contextMenu.item.id)">
          🗑️ Delete Folder
        </div>
      </template>
      <template v-if="contextMenu.type === 'block'">
        <div class="context-menu-divider"></div>
        <div class="context-menu-item context-menu-danger" @click="confirmAndDeleteBlock(contextMenu.item.id)">
          🗑️ Delete Package
        </div>
      </template>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" @click="contextMenu.show = false">
        ❌ Close
      </div>
    </div>

    <!-- Context Menu (File Tree) -->
    <div v-if="contextMenu.show && contextMenu.source === 'tree'" class="ctx-menu" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }" @click.stop>
      <!-- New -->
      <div class="ctx-section-label">New</div>
      <div class="ctx-item" @click="startTreeCreate('file')">
        <span class="ctx-item-icon">📄</span>
        <span class="ctx-item-label">New File</span>
      </div>
      <div class="ctx-item" @click="startTreeCreate('folder', false)">
        <span class="ctx-item-icon">📁</span>
        <span class="ctx-item-label">New Folder</span>
      </div>
      <div class="ctx-item" @click="startTreeCreate('folder', true)">
        <span class="ctx-item-icon">📦</span>
        <span class="ctx-item-label">New Package</span>
      </div>

      <!-- Clipboard -->
      <template v-if="contextMenu.type === 'tree-file' || contextMenu.type === 'tree-dir'">
        <div class="ctx-sep"></div>
        <div class="ctx-item" @click="cutTreeNode(contextMenu.item)">
          <span class="ctx-item-icon">✂</span>
          <span class="ctx-item-label">Cut</span>
          <span class="ctx-item-hint">Ctrl+X</span>
        </div>
        <div class="ctx-item" @click="copyTreeNode(contextMenu.item)">
          <span class="ctx-item-icon">⎘</span>
          <span class="ctx-item-label">Copy</span>
          <span class="ctx-item-hint">Ctrl+C</span>
        </div>
      </template>
      <div class="ctx-item" :class="{ 'ctx-item-disabled': !treeClipboard.node }" @click="pasteTreeNode(contextMenu.item)">
        <span class="ctx-item-icon">⎗</span>
        <span class="ctx-item-label">Paste</span>
        <span class="ctx-item-hint">Ctrl+V</span>
      </div>

      <!-- Delete -->
      <template v-if="contextMenu.type === 'tree-file' || contextMenu.type === 'tree-dir'">
        <div class="ctx-sep"></div>
        <div class="ctx-item ctx-item-danger" @click="confirmAndDeleteTreeNode(contextMenu.item)">
          <span class="ctx-item-icon">🗑</span>
          <span class="ctx-item-label">{{ contextMenu.type === 'tree-dir' ? 'Delete Folder' : 'Delete File' }}</span>
          <span class="ctx-item-hint">Del</span>
        </div>
      </template>
    </div>

    <!-- Confirm Delete Dialog -->
    <div v-if="confirmDialog.show" class="module-dialog-overlay" @click.self="closeConfirmDialog">
      <div class="module-dialog confirm-dialog">
        <div class="dialog-header">
          <h3>{{ confirmDialog.title }}</h3>
          <button class="dialog-close" @click="closeConfirmDialog">×</button>
        </div>

        <div class="dialog-body">
          <p class="confirm-message">{{ confirmDialog.message }}</p>
        </div>

        <div class="dialog-footer">
          <button class="btn-cancel" @click="closeConfirmDialog">Cancel</button>
          <button class="btn-create btn-danger" @click="confirmDeleteAction">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { blockTypes, blockCategories } from '../../services/catalog/blockTypes';
import { desktopAgentHealth, getJobLogs, getJobStatus, readProjectFile, submitPythonJob, writeProjectFile } from '../../services/agent/desktopAgentClient';
import { loadProjectFiles, saveProjectFiles } from '../../services/project/projectFileStore';
import { getModuleBaseName, getModuleDisplayExt, getModuleDisplayFilename, splitModuleName } from '../../services/utils/moduleFilename';

const FolderTreeItem = {
  name: 'FolderTreeItem',
  props: ['folder', 'allFolders', 'allModules', 'selectedItem', 'selectedFolder', 'expandedFolders', 'inlineRename', 'inlineCreate', 'blockId'],
  computed: {
    isExpanded() {
      return this.expandedFolders[this.folder.id] !== false;
    },
    childFolders() {
      return this.allFolders
        .filter(f => f.parent === this.folder.id)
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    childModules() {
      return this.allModules
        .filter(m => m.folder === this.folder.id)
        .sort((a, b) => a.name.localeCompare(b.name));
    }
  },
  template: `
    <div class="custom-folder-wrapper">
      <!-- Folder Header - Styled like block package header -->
      <div 
        class="custom-folder-header"
        :class="{ active: selectedFolder && selectedFolder.id === folder.id }"
        @click="handleFolderClick"
        @contextmenu="$emit('show-context-menu', { event: $event, folder: folder, type: 'folder', blockId: blockId })"
      >
        <span class="folder-toggle" @click.stop="toggleFolder">{{ isExpanded ? '▼' : '▶' }}</span>
        <span class="folder-icon">📁</span>
        <template v-if="isInlineRenaming('folder', folder.id)">
          <input
            :value="inlineRename.value"
            type="text"
            class="inline-rename-input"
            :data-rename-id="folder.id"
            @click.stop
            @input="updateRenameValue"
            @keyup.enter.stop="$emit('submit-inline-rename')"
            @keyup.esc.stop="$emit('cancel-inline-rename')"
            @blur="$emit('submit-inline-rename')"
          />
        </template>
        <span v-else class="folder-name">{{ folder.name }}</span>
      </div>

      <!-- Folder Contents -->
      <div v-show="isExpanded" class="custom-folder-contents">
        <!-- Child Folders -->
        <folder-tree-item
          v-for="child in childFolders"
          :key="child.id"
          :folder="child"
          :all-folders="allFolders"
          :all-modules="allModules"
          :selected-item="selectedItem"
          :selected-folder="selectedFolder"
          :expanded-folders="expandedFolders"
          :inline-rename="inlineRename"
          :inline-create="inlineCreate"
          :block-id="blockId"
          @select-module="$emit('select-module', $event)"
          @select-folder="$emit('select-folder', $event)"
          @delete-folder="$emit('delete-folder', $event)"
          @delete-module="$emit('delete-module', $event)"
          @toggle-folder="$emit('toggle-folder', $event)"
          @show-context-menu="$emit('show-context-menu', $event)"
          @update-inline-rename="$emit('update-inline-rename', $event)"
          @submit-inline-rename="$emit('submit-inline-rename')"
          @cancel-inline-rename="$emit('cancel-inline-rename')"
          @update-inline-create="$emit('update-inline-create', $event)"
          @submit-inline-create="$emit('submit-inline-create')"
          @cancel-inline-create="$emit('cancel-inline-create')"
        />

        <!-- Files in this folder -->
        <div 
          v-for="module in childModules"
          :key="module.id"
          class="file-item nested-file-item"
          :class="{ active: selectedItem && selectedItem.type === 'module' && selectedItem.id === module.id, 'is-init': module.name === '__init__' }"
          @click="handleModuleClick(module)"
          @contextmenu="$emit('show-context-menu', { event: $event, folder: module, type: 'module', blockId: blockId })"
        >
          <span class="file-icon">📄</span>
          <template v-if="isInlineRenaming('module', module.id)">
            <input
              :value="inlineRename.value"
              type="text"
              class="inline-rename-input"
              :data-rename-id="module.id"
              @click.stop
              @input="updateRenameValue"
              @keyup.enter.stop="$emit('submit-inline-rename')"
              @keyup.esc.stop="$emit('cancel-inline-rename')"
              @blur="$emit('submit-inline-rename')"
            />
          </template>
          <template v-else>
            <span class="file-name">{{ getModuleDisplayFilename(module.name) }}</span>
          </template>
        </div>

        <div v-if="isInlineCreatingHere()" class="file-item nested-file-item inline-create-row">
          <span class="file-icon">{{ getInlineCreateIcon() }}</span>
          <input
            :value="inlineCreate.value"
            type="text"
            class="inline-create-input"
            :placeholder="getInlineCreatePlaceholder()"
            :data-create-scope="getCreateScopeKey(blockId, folder.id)"
            @click.stop
            @input="updateInlineCreateValue"
            @keyup.enter.stop="$emit('submit-inline-create')"
            @keyup.esc.stop="$emit('cancel-inline-create')"
            @blur="$emit('submit-inline-create')"
          />
        </div>
      </div>
    </div>
  `,
  methods: {
    splitModuleName(fileName) {
      return splitModuleName(fileName);
    },
    getModuleBaseName(fileName) {
      return getModuleBaseName(fileName);
    },
    getModuleDisplayExt(fileName) {
      return getModuleDisplayExt(fileName);
    },
    getModuleDisplayFilename(fileName) {
      return getModuleDisplayFilename(fileName);
    },
    isInlineRenaming(type, id) {
      return this.inlineRename && this.inlineRename.show && this.inlineRename.type === type && this.inlineRename.itemId === id;
    },
    updateRenameValue(event) {
      this.$emit('update-inline-rename', event.target.value);
    },
    updateInlineCreateValue(event) {
      this.$emit('update-inline-create', event.target.value);
    },
    isInlineCreatingHere() {
      return this.inlineCreate &&
        this.inlineCreate.show &&
        this.inlineCreate.blockId === this.blockId &&
        this.inlineCreate.parentFolderId === this.folder.id;
    },
    getCreateScopeKey(blockId, parentFolderId) {
      return `${blockId || 'none'}::${parentFolderId || 'root'}`;
    },
    getInlineCreateIcon() {
      if (!this.inlineCreate || !this.inlineCreate.type) {
        return '📄';
      }
      if (this.inlineCreate.type === 'folder') {
        return this.inlineCreate.isPackage ? '📦' : '📁';
      }
      return '📄';
    },
    getInlineCreatePlaceholder() {
      if (!this.inlineCreate || !this.inlineCreate.type) {
        return 'new_file.py';
      }
      if (this.inlineCreate.type === 'folder') {
        return this.inlineCreate.isPackage ? 'new_package' : 'new_folder';
      }
      return 'new_file.py';
    },
    handleFolderClick() {
      if (this.isInlineRenaming('folder', this.folder.id)) {
        return;
      }
      this.$emit('select-folder', this.folder);
      this.$emit('toggle-folder', this.folder.id);
    },
    handleModuleClick(module) {
      if (this.isInlineRenaming('module', module.id)) {
        return;
      }
      this.$emit('select-module', module);
    },
    toggleFolder() {
      this.$emit('toggle-folder', this.folder.id);
    }
  }
};

export default {
  name: 'CodeEditorWorkspace',
  components: {
    FolderTreeItem
  },
  props: {
    blocks: {
      type: Array,
      default: () => []
    },
    projectType: {
      type: String,
      default: ''
    },
    projectFiles: {
      type: Array,
      default: () => []
    },
    blockCatalog: {
      type: Array,
      default: () => []
    },
    workspaceReloadToken: {
      type: Number,
      default: 0
    },
    projectId: {
      type: [String, Number],
      default: null
    }
  },
  watch: {
    blocks: {
      handler(newBlocks) {
        const validBlocks = Array.isArray(newBlocks) 
          ? newBlocks.filter(b => b && b.id)
          : [];
        
        if (validBlocks.length > 0) {
          this.blockLibrary = validBlocks;
          // Re-initialize expanded states for new blocks
          validBlocks.forEach(block => {
            if (!(block.id in this.expandedBlocks)) {
              this.expandedBlocks[block.id] = false;
            }
          });
        } else {
          // For python-import projects, show empty state instead of predefined blocks
          if (this.projectType === 'python-import') {
            this.blockLibrary = [];
          } else {
            // Fallback to predefined blocks only for template/blank projects
            this.blockLibrary = Object.values(blockTypes);
          }
        }
      },
      immediate: true,
      deep: true
    },
    selectedItem(newItem) {
      if (newItem) {
        if (newItem.type === 'block') {
          this.localCode = newItem.code || newItem.defaultCode || '';
        } else if (newItem.type === 'block-init') {
          // For block-init, load the package __init__.py content (not the block's main script)
          this.localCode = this.blockInitCodeMap[newItem.blockId] || this.getDefaultInitCode();
        } else if (newItem.type === 'module') {
          this.localCode = this.getParsedEditorCode(newItem.name, newItem.code || '');
        }
        this.isModified = false;
      }
    },
    workspaceReloadToken() {
      this.loadModulesFromStorage();
    }
  },
  data() {
    return {
      sidebarTab: 'files',
      expandedTreeFolders: {},
      // Run output
      runStatus: 'idle',   // 'idle' | 'running' | 'success' | 'error'
      runOutput: '',
      showRunPanel: false,
      // File tree inline create
      treeInlineCreate: {
        show: false,
        type: 'file',     // 'file' | 'folder'
        isPackage: false,
        parentPath: null, // null = root, string = parent dir path
        value: '',
      },
      selectedBlock: null,
      selectedItem: null,
      openFiles: [],
      activeFileId: null,
      fileModifiedMap: {}, // Track which files have unsaved changes
      blockLibrary: [],
      blockCategories: Object.keys(blockCategories),
      customModules: [],
      localCode: '',
      editorScrollTop: 0,
      isModified: false,
      expandedCategories: {},
      expandedBlocks: {}, // Track which blocks are expanded to show their custom content
      hiddenBlockIds: [],
      blockInitCodeMap: {},
      autoSaveTimer: null,
      customFolders: [],
      expandedFolders: {},
      selectedFolder: null,
      contextMenu: {
        show: false,
        x: 0,
        y: 0,
        item: null,
        type: null, // 'folder', 'module', 'block', 'tree-file', 'tree-dir'
        blockId: null,
        source: null, // 'blocks' | 'tree'
      },
      createInContext: {
        type: null, // 'file' or 'folder'
        parentFolderId: null,
        blockId: null,
        isPackage: false // true for packages (with __init__.py), false for regular folders
      },
      inlineCreate: {
        show: false,
        type: null,
        blockId: null,
        parentFolderId: null,
        isPackage: false,
        value: ''
      },
      closeContextMenuHandler: null,
      treeKeyHandler: null,
      flashNotification: {
        show: false,
        message: '',
        type: 'info'
      },
      flashTimer: null,
      inlineRename: {
        show: false,
        type: null,
        itemId: null,
        value: ''
      },
      confirmDialog: {
        show: false,
        type: null,
        itemId: null,
        title: '',
        message: ''
      },
      treeClipboard: {
        mode: null,  // 'cut' | 'copy'
        node: null
      }
    };
  },
  computed: {
    isPythonActiveFile() {
      const name = this.activeFile?.name || '';
      return name.endsWith('.py') || name === '__init__';
    },

    fileTreeNodes() {
      const files = Array.isArray(this.projectFiles) ? this.projectFiles : [];
      if (!files.length) return [];

      // Build a nested map from relative paths
      const root = {};
      files.forEach(file => {
        const pathStr = (file.relativePath || file.path || file.name || '').replace(/\\/g, '/');
        const parts = pathStr.split('/').filter(Boolean);
        if (!parts.length) return;

        let node = root;
        parts.forEach((part, idx) => {
          if (idx === parts.length - 1) {
            if (!node[part]) node[part] = { _type: 'file', file };
          } else {
            if (!node[part]) node[part] = { _type: 'dir', children: {} };
            node = node[part].children;
          }
        });
      });

      // Flatten to a list for v-for rendering
      return this._flattenTreeMap(root, 0, '');
    },

    categorizedBlocks() {
      const categorized = {};
      this.blockLibrary.forEach(block => {
        if (block && block.id && block.category) {
          if (!categorized[block.category]) {
            categorized[block.category] = [];
          }
          categorized[block.category].push(block);
        }
      });

      return Object.entries(categorized).map(([name, blocks]) => ({
        name,
        blocks
      }));
    },
    lineCount() {
      return this.localCode.split('\n').length;
    },
    lineNumbers() {
      return Array.from({ length: this.lineCount }, (_, idx) => idx + 1);
    },
    activeFile() {
      return this.openFiles.find(f => f.id === this.activeFileId);
    },
    activeFileExtension() {
      if (!this.activeFile || this.activeFile.type !== 'module') {
        return '.py';
      }
      return this.getModuleDisplayExt(this.activeFile.name).toLowerCase();
    },
    isCsvActive() {
      return this.activeFile?.type === 'module' && this.activeFileExtension === '.csv';
    },
    isImageActive() {
      if (this.activeFile?.type !== 'module') {
        return false;
      }
      return ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'].includes(this.activeFileExtension);
    },
    isIpynbActive() {
      return this.activeFile?.type === 'module' && this.activeFileExtension === '.ipynb';
    },
    activeImageSrc() {
      if (!this.isImageActive) {
        return '';
      }
      const inline = typeof this.activeFile?.code === 'string' ? this.activeFile.code : '';
      if (inline) {
        return inline;
      }
      return this.resolveModuleContentFromProjectFiles(this.activeFile) || '';
    },
    isJsonActive() {
      return this.activeFile?.type === 'module' && this.activeFileExtension === '.json';
    },
    ipynbPreview() {
      if (!this.isIpynbActive) {
        return { valid: false, cells: [] };
      }

      try {
        const parsed = JSON.parse(this.localCode || '{}');
        const cells = Array.isArray(parsed?.cells) ? parsed.cells : [];
        const previewCells = cells.map(cell => {
          const source = Array.isArray(cell?.source) ? cell.source.join('') : String(cell?.source || '');
          const normalized = source.trim();
          return {
            type: String(cell?.cell_type || 'unknown').toLowerCase(),
            preview: normalized.length > 600 ? `${normalized.slice(0, 600)}\n...` : normalized
          };
        });

        return {
          valid: true,
          cells: previewCells
        };
      } catch (error) {
        return {
          valid: false,
          cells: []
        };
      }
    },
    jsonValidation() {
      if (!this.isJsonActive) {
        return { valid: true, message: '' };
      }

      try {
        JSON.parse(this.localCode || '{}');
        return { valid: true, message: '' };
      } catch (error) {
        const message = this.getJsonErrorMessage(error, this.localCode || '');
        return { valid: false, message };
      }
    },
    csvPreviewRows() {
      if (!this.isCsvActive) {
        return [];
      }
      return this.parseCsvRows(this.localCode || '').slice(0, 300);
    },
    activeLanguageLabel() {
      if (!this.activeFile) return 'Text';
      if (this.activeFile.type === 'block-init') return 'Python';

      const extension = this.activeFileExtension;
      if (this.isImageActive) return 'Image';
      if (this.isIpynbActive) return 'Notebook';
      if (extension === '.json') return 'JSON';
      if (extension === '.csv') return 'CSV';
      if (extension === '.js' || extension === '.mjs' || extension === '.cjs') return 'JavaScript';
      if (extension === '.ts') return 'TypeScript';
      if (extension === '.py' || extension === '.pyi') return 'Python';
      if (extension === '.md') return 'Markdown';
      if (extension === '.yaml' || extension === '.yml') return 'YAML';
      if (extension === '.xml') return 'XML';
      return (extension || 'text').replace('.', '').toUpperCase();
    },
    editorPlaceholder() {
      if (this.isCsvActive) {
        return 'Edit CSV content...';
      }
      return `Edit ${this.activeLanguageLabel} content...`;
    },
    showLineCount() {
      return Boolean(this.activeFile) && !this.isCsvActive && !this.isImageActive;
    },
    rootFolders() {
      return this.customFolders.filter(f => !f.parent);
    },
    rootModules() {
      return this.customModules.filter(m => !m.folder);
    },
    allFolderOptions() {
      return this.customFolders.map(folder => {
        const breadcrumb = this.getBreadcrumb(folder.id);
        return {
          id: folder.id,
          name: folder.name,
          prefix: breadcrumb.replace(folder.name, '')
        };
      });
    }
  },
  mounted() {
    // For python-import projects, clear any cached template-related data
    if (this.projectType === 'python-import') {
      const seedKey = 'mlsphere-template-packages-seeded-v1';
      localStorage.removeItem(seedKey);
    }
    
    // Load custom modules from localStorage
    this.loadModulesFromStorage();
    this.loadWorkspacePackageState();
    this.applyHiddenBlocks();
    
    // Only bootstrap template packages for non-python-import projects
    if (this.projectType !== 'python-import') {
      this.bootstrapTemplatePackages();
    }
    
    this.sanitizeAllInitFiles();
    
    // Initialize blockLibrary if not set yet (wait for watch to populate it)
    if (this.blockLibrary.length === 0) {
      const validBlocks = Array.isArray(this.blocks) 
        ? this.blocks.filter(b => b && b.id)
        : [];
      
      if (validBlocks.length > 0) {
        this.blockLibrary = validBlocks;
      } else {
        // For python-import projects, show empty state instead of predefined blocks
        if (this.projectType === 'python-import') {
          this.blockLibrary = [];
        } else {
          this.blockLibrary = Object.values(blockTypes);
        }
      }
    }
    
    // Initialize expanded categories
    const uniqueCategories = [...new Set(this.blockLibrary.map(b => b && b.category).filter(Boolean))];
    uniqueCategories.forEach(cat => {
      this.expandedCategories[cat] = true;
    });

    // Select first block's __init__.py by default
    if (this.blockLibrary.length > 0) {
      this.selectBlockInit(this.blockLibrary[0]);
      // Expand the first block to show its contents
      this.expandedBlocks[this.blockLibrary[0].id] = true;
    }
    
    // Close context menu when clicking outside
    this.closeContextMenuHandler = (e) => {
      if (this.contextMenu.show && !e.target.closest('.context-menu') && !e.target.closest('.ctx-menu') && !e.target.closest('.folder-item')) {
        this.contextMenu.show = false;
      }
    };
    document.addEventListener('click', this.closeContextMenuHandler);

    this.treeKeyHandler = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && this.treeClipboard.node) {
        e.preventDefault();
        this.pasteTreeNode(this.contextMenu.item || null);
      }
    };
    document.addEventListener('keydown', this.treeKeyHandler);
  },
  methods: {
    // ── File Tree ──────────────────────────────────────────────────────────

    _flattenTreeMap(nodeMap, depth, parentPath) {
      const dirs = [];
      const files = [];
      Object.keys(nodeMap).forEach(name => {
        const node = nodeMap[name];
        const path = parentPath ? `${parentPath}/${name}` : name;
        if (node._type === 'dir') {
          const isExpanded = this.expandedTreeFolders[path] !== false;
          dirs.push({ type: 'dir', name, path, depth, isExpanded, children: node.children || {} });
        } else {
          files.push({ type: 'file', name, path, depth, file: node.file });
        }
      });
      dirs.sort((a, b) => a.name.localeCompare(b.name));
      files.sort((a, b) => a.name.localeCompare(b.name));

      const result = [];
      dirs.forEach(dir => {
        result.push(dir);
        if (dir.isExpanded) {
          result.push(...this._flattenTreeMap(dir.children, depth + 1, dir.path));
        }
      });
      files.forEach(f => result.push(f));
      return result;
    },

    toggleTreeFolder(path) {
      const current = this.expandedTreeFolders[path];
      this.expandedTreeFolders[path] = current !== false ? false : true;
    },

    getFileIcon(name) {
      const ext = (name || '').split('.').pop().toLowerCase();
      const map = {
        py: '🐍', pyi: '🐍',
        js: '📜', mjs: '📜', cjs: '📜', ts: '📘',
        json: '📋', csv: '📊', md: '📝', txt: '📄',
        ipynb: '📓', png: '🖼️', jpg: '🖼️', jpeg: '🖼️',
        gif: '🖼️', svg: '🖼️', webp: '🖼️',
        yaml: '⚙️', yml: '⚙️', toml: '⚙️', ini: '⚙️', cfg: '⚙️',
        sh: '🔧', bat: '🔧', ps1: '🔧',
      };
      return map[ext] || '📄';
    },

    getFileIconDef(name) {
      const n = (name || '').toLowerCase();
      const ext = n.includes('.') ? n.split('.').pop() : '';
      const byName = {
        '__init__.py': { label: '🐍', cls: 'fi-python' },
        'requirements.txt': { label: 'REQ', cls: 'fi-req' },
        'main.py': { label: '🐍', cls: 'fi-python' },
        'setup.py': { label: '🐍', cls: 'fi-python' },
        '.gitignore': { label: 'GIT', cls: 'fi-git' },
        '.env': { label: 'ENV', cls: 'fi-env' },
        'dockerfile': { label: 'DOC', cls: 'fi-docker' },
      };
      if (byName[n]) return byName[n];
      const byExt = {
        py:     { label: '🐍', cls: 'fi-python' },
        pyi:    { label: '🐍', cls: 'fi-python' },
        js:     { label: 'JS',   cls: 'fi-js' },
        mjs:    { label: 'JS',   cls: 'fi-js' },
        cjs:    { label: 'JS',   cls: 'fi-js' },
        ts:     { label: 'TS',   cls: 'fi-ts' },
        tsx:    { label: 'TSX',  cls: 'fi-ts' },
        vue:    { label: 'VUE',  cls: 'fi-vue' },
        json:   { label: '{ }',  cls: 'fi-json' },
        md:     { label: 'MD',   cls: 'fi-md' },
        txt:    { label: 'TXT',  cls: 'fi-txt' },
        csv:    { label: 'CSV',  cls: 'fi-csv' },
        yaml:   { label: 'YML',  cls: 'fi-yaml' },
        yml:    { label: 'YML',  cls: 'fi-yaml' },
        toml:   { label: 'TOML', cls: 'fi-yaml' },
        ini:    { label: 'INI',  cls: 'fi-yaml' },
        cfg:    { label: 'CFG',  cls: 'fi-yaml' },
        sh:     { label: 'SH',   cls: 'fi-sh' },
        bat:    { label: 'BAT',  cls: 'fi-sh' },
        ps1:    { label: 'PS',   cls: 'fi-sh' },
        ipynb:  { label: 'NB',   cls: 'fi-notebook' },
        png:    { label: 'IMG',  cls: 'fi-img' },
        jpg:    { label: 'IMG',  cls: 'fi-img' },
        jpeg:   { label: 'IMG',  cls: 'fi-img' },
        gif:    { label: 'GIF',  cls: 'fi-img' },
        svg:    { label: 'SVG',  cls: 'fi-img' },
        webp:   { label: 'IMG',  cls: 'fi-img' },
      };
      if (byExt[ext]) return byExt[ext];
      const label = ext ? ext.toUpperCase().slice(0, 3) : '?';
      return { label, cls: 'fi-default' };
    },

    cutTreeNode(node) {
      this.treeClipboard = { mode: 'cut', node };
      this.contextMenu.show = false;
      this.showFlash(`"${node.name}" ready to move`, 'info');
    },

    copyTreeNode(node) {
      this.treeClipboard = { mode: 'copy', node };
      this.contextMenu.show = false;
      this.showFlash(`"${node.name}" copied`, 'info');
    },

    async pasteTreeNode(targetNode) {
      this.contextMenu.show = false;
      const { mode, node: srcNode } = this.treeClipboard;
      if (!srcNode) return;

      // Determine target directory
      let targetDir = '';
      if (targetNode) {
        if (targetNode.type === 'dir') {
          targetDir = targetNode.path;
        } else {
          const parts = (targetNode.path || '').split('/');
          targetDir = parts.slice(0, -1).join('/');
        }
      }

      const projectId = this.getProjectIdForSync();
      if (!projectId) return;

      const existing = await loadProjectFiles(projectId).catch(() => []);
      const srcPath = srcNode.path;
      const srcName = srcNode.name;
      const newBase = targetDir ? `${targetDir}/${srcName}` : srcName;

      let updated;

      if (mode === 'copy') {
        const newFiles = [];
        if (srcNode.type === 'file') {
          const srcFile = existing.find(f => (f.relativePath || f.path || '').replace(/\\/g, '/') === srcPath);
          if (srcFile) {
            const destPath = this.resolveNameConflict(newBase, existing);
            newFiles.push({ ...srcFile, path: destPath, relativePath: destPath, name: destPath.split('/').pop() });
          }
        } else {
          existing.forEach(f => {
            const rp = (f.relativePath || f.path || '').replace(/\\/g, '/');
            if (rp === srcPath || rp.startsWith(srcPath + '/')) {
              const rel = rp.slice(srcPath.length);
              const destPath = newBase + rel;
              newFiles.push({ ...f, path: destPath, relativePath: destPath, name: destPath.split('/').pop() });
            }
          });
        }
        updated = [...existing, ...newFiles];
        this.showFlash(`Pasted "${srcName}"`, 'success');
      } else {
        // Cut — move (rename paths)
        updated = existing.map(f => {
          const rp = (f.relativePath || f.path || '').replace(/\\/g, '/');
          if (srcNode.type === 'file' && rp === srcPath) {
            return { ...f, path: newBase, relativePath: newBase, name: newBase.split('/').pop() };
          } else if (srcNode.type === 'dir' && (rp === srcPath || rp.startsWith(srcPath + '/'))) {
            const rel = rp.slice(srcPath.length);
            const movedPath = newBase + rel;
            return { ...f, path: movedPath, relativePath: movedPath, name: movedPath.split('/').pop() };
          }
          return f;
        });
        this.treeClipboard = { mode: null, node: null };
        this.showFlash(`Moved "${srcName}"`, 'success');
      }

      await saveProjectFiles(projectId, updated);
      this.$emit('tree-files-changed', updated);
    },

    resolveNameConflict(path, files) {
      const existingPaths = new Set(files.map(f => (f.relativePath || f.path || '').replace(/\\/g, '/')));
      if (!existingPaths.has(path)) return path;
      const dotIdx = path.lastIndexOf('.');
      const base = dotIdx > 0 ? path.slice(0, dotIdx) : path;
      const ext = dotIdx > 0 ? path.slice(dotIdx) : '';
      let n = 1;
      let candidate;
      do { candidate = `${base}_copy${n > 1 ? n : ''}${ext}`; n++; } while (existingPaths.has(candidate));
      return candidate;
    },

    async selectTreeFile(node) {
      const file = node.file;
      if (!file) return;

      const displayName = node.name; // Use path component, not file.name (may be '' for template files)
      const fileId = `tree-file-${node.path}`;
      const existing = this.openFiles.find(f => f.id === fileId);
      if (existing) {
        this.activeFileId = fileId;
        this.localCode = existing.code || '';
        this.selectedItem = { type: 'module', id: fileId, name: displayName, blockId: null, folder: null, code: existing.code || '' };
        return;
      }

      let content = typeof file.content === 'string' ? file.content : '';
      const projectId = this.getProjectIdForSync();
      const filePath = file.relativePath || file.path || '';
      if (projectId && filePath) {
        try {
          const fileData = await readProjectFile(projectId, filePath);
          if (fileData?.content) content = fileData.content;
        } catch (e) { /* fall back to in-memory content */ }
      }

      const parsedCode = this.getParsedEditorCode(displayName, content);
      const fileObj = {
        id: fileId,
        type: 'module',
        name: displayName,
        blockId: null,
        folder: null,
        filePath,
        code: parsedCode,
        originalCode: parsedCode
      };
      this.openFiles.push(fileObj);
      this.activeFileId = fileId;
      this.selectedItem = { type: 'module', id: fileId, name: displayName, blockId: null, folder: null, code: content };
      this.selectedFolder = null;
    },

    // ── File Tree Context Menu ───────────────────────────────────────────────

    onTreeNodeContextMenu(event, node) {
      event.preventDefault();
      event.stopPropagation();
      let x = event.clientX;
      let y = event.clientY;
      if (x > window.innerWidth - 210) x = window.innerWidth - 210;
      if (y > window.innerHeight - 160) y = window.innerHeight - 160;
      this.contextMenu.show = true;
      this.contextMenu.source = 'tree';
      this.contextMenu.x = x;
      this.contextMenu.y = y;
      this.contextMenu.type = node.type === 'dir' ? 'tree-dir' : 'tree-file';
      this.contextMenu.item = node;
      this.contextMenu.blockId = null;
    },

    startTreeCreate(type, isPackage = false) {
      this.contextMenu.show = false;
      const parentNode = this.contextMenu.item;
      // If right-clicked on a file, create inside its parent dir; if on a dir create inside it
      const parentPath = parentNode?.type === 'dir' ? parentNode.path : null;
      // Expand the parent if it's a dir
      if (parentPath) {
        this.expandedTreeFolders[parentPath] = true;
      }
      this.treeInlineCreate.show = true;
      this.treeInlineCreate.type = type;
      this.treeInlineCreate.isPackage = isPackage;
      this.treeInlineCreate.parentPath = parentPath;
      this.treeInlineCreate.value = '';
      this.$nextTick(() => {
        const input = this.$refs.treeCreateInputNested || this.$refs.treeCreateInput;
        if (input) {
          const el = Array.isArray(input) ? input[0] : input;
          if (el) el.focus();
        }
      });
    },

    cancelTreeCreate() {
      this.treeInlineCreate.show = false;
      this.treeInlineCreate.value = '';
      this.treeInlineCreate.parentPath = null;
    },

    async submitTreeCreate() {
      const raw = (this.treeInlineCreate.value || '').trim();
      if (!raw) { this.cancelTreeCreate(); return; }

      const { type, isPackage, parentPath } = this.treeInlineCreate;
      this.cancelTreeCreate();

      const base = parentPath ? `${parentPath}/` : '';

      if (type === 'file') {
        const filePath = `${base}${raw}`;
        await this._addTreeFile(filePath, '');
      } else {
        // Folder / Package — create a placeholder __init__.py inside it
        const initContent = isPackage ? '# Package init\n' : '';
        const initPath = `${base}${raw}/__init__.py`;
        await this._addTreeFile(initPath, initContent);
      }
    },

    async _addTreeFile(relativePath, content) {
      const projectId = this.getProjectIdForSync();
      if (!projectId) {
        this.showFlash('No project loaded', 'error'); return;
      }
      const name = relativePath.split('/').filter(Boolean).pop() || relativePath;
      const newFile = { name, path: relativePath, relativePath, content };

      // Update IndexedDB
      const existing = await loadProjectFiles(projectId).catch(() => []);
      const updated = [...existing.filter(f => (f.relativePath || f.path) !== relativePath), newFile];
      await saveProjectFiles(projectId, updated);

      // Notify parent to refresh pythonFiles
      this.$emit('tree-files-changed', updated);
      this.showFlash(`Created ${name}`, 'success');

      // Auto-open the new file if it's not a hidden init placeholder
      if (!relativePath.endsWith('__init__.py') || content) {
        const fakeNode = { type: 'file', name, path: relativePath, file: newFile };
        await this.selectTreeFile(fakeNode);
      }
    },

    confirmAndDeleteTreeNode(node) {
      this.contextMenu.show = false;
      const isDir = node.type === 'dir';
      this.confirmDialog.show = true;
      this.confirmDialog.type = isDir ? 'tree-dir' : 'tree-file';
      this.confirmDialog.itemId = node.path;
      this.confirmDialog.title = isDir ? 'Delete Folder' : 'Delete File';
      this.confirmDialog.message = isDir
        ? `Delete folder "${node.name}" and all files inside it? This cannot be undone.`
        : `Delete file "${node.name}"? This cannot be undone.`;
    },

    async deleteTreeNode(nodePath, isDir) {
      const projectId = this.getProjectIdForSync();
      if (!projectId) return;

      const existing = await loadProjectFiles(projectId).catch(() => []);
      const updated = existing.filter(f => {
        const rp = (f.relativePath || f.path || '').replace(/\\/g, '/');
        if (isDir) {
          return rp !== nodePath && !rp.startsWith(nodePath + '/');
        }
        return rp !== nodePath;
      });
      await saveProjectFiles(projectId, updated);

      // Close any open tabs for deleted path(s)
      this.openFiles = this.openFiles.filter(f => {
        const id = f.id || '';
        if (isDir) return !id.startsWith(`tree-file-${nodePath}/`) && id !== `tree-file-${nodePath}`;
        return id !== `tree-file-${nodePath}`;
      });
      if (!this.openFiles.find(f => f.id === this.activeFileId)) {
        this.activeFileId = this.openFiles[0]?.id || null;
        this.localCode = this.openFiles[0]?.code || '';
      }

      // Notify parent
      this.$emit('tree-files-changed', updated);
      this.showFlash(`Deleted`, 'success');
    },

    // ── Run Current File ─────────────────────────────────────────────────────

    async runCurrentFile() {
      if (this.runStatus === 'running') return;
      const file = this.activeFile;
      if (!file) return;

      this.runStatus = 'running';
      this.runOutput = '';
      this.showRunPanel = true;

      // Check agent availability
      try {
        await desktopAgentHealth();
      } catch {
        this.runStatus = 'error';
        this.runOutput = 'Desktop agent is not running.\nPlease start the agent to execute Python code.';
        return;
      }

      const code = this.localCode || file.code || '';
      const fileName = file.name || 'script.py';
      const projectId = this.getProjectIdForSync();

      try {
        const payload = {
          projectId,
          entryFile: fileName,
          code,
          files: [{ path: fileName, content: code }],
          args: [],
        };

        const submitResult = await submitPythonJob(payload);
        const jobId = submitResult?.job?.id;
        if (!jobId) throw new Error('Agent did not return a job ID');

        let cursor = 0;
        let combined = '';
        let status = submitResult?.job?.status || 'queued';

        while (status === 'queued' || status === 'running') {
          const logResult = await getJobLogs(jobId, cursor);
          const logs = Array.isArray(logResult?.logs) ? logResult.logs : [];
          cursor = Number(logResult?.nextCursor ?? cursor);
          if (logs.length > 0) {
            combined += logs.map(l => l.message || '').join('');
            this.runOutput = combined;
          }
          const jobStatus = await getJobStatus(jobId);
          status = jobStatus?.job?.status || 'failed';
          if (status === 'queued' || status === 'running') {
            await new Promise(r => setTimeout(r, 400));
          }
        }

        this.runStatus = status === 'completed' ? 'success' : 'error';
        this.runOutput = (combined || (status === 'completed' ? 'Done.' : 'Execution failed.')).trim();
      } catch (err) {
        this.runStatus = 'error';
        this.runOutput = `Error: ${err.message}`;
      }
    },

    // ── End File Tree ───────────────────────────────────────────────────────

    onEditorScroll(event) {
      this.editorScrollTop = event?.target?.scrollTop || 0;
    },

    getJsonErrorMessage(error, sourceText) {
      const rawMessage = String(error?.message || 'Invalid JSON');
      const positionMatch = rawMessage.match(/position\s+(\d+)/i);

      if (!positionMatch) {
        return rawMessage;
      }

      const position = Number(positionMatch[1]);
      const text = String(sourceText || '');
      const upto = text.slice(0, Math.max(position, 0));
      const lines = upto.split('\n');
      const line = lines.length;
      const column = (lines[lines.length - 1] || '').length + 1;

      return `Invalid at L${line}:C${column}`;
    },

    showFlash(message, type = 'info') {
      if (this.flashTimer) {
        clearTimeout(this.flashTimer);
        this.flashTimer = null;
      }

      this.flashNotification.message = message;
      this.flashNotification.type = type;
      this.flashNotification.show = true;

      this.flashTimer = setTimeout(() => {
        this.flashNotification.show = false;
        this.flashTimer = null;
      }, 2400);
    },

    getFlashIcon(type) {
      if (type === 'success') return '✓';
      if (type === 'error') return '⚠';
      return 'ℹ';
    },

    // Get custom folders that belong to a specific block (root level, no parent)
    getBlockFolders(blockId) {
      return this.customFolders
        .filter(f => !f.parent && f.blockId === blockId)
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    // Get custom modules that belong to a specific block (not in any folder)
    getBlockModules(blockId) {
      return this.customModules
        .filter(m => !m.folder && m.blockId === blockId)
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    getDefaultInitCode() {
      return '';
    },

    isInitCodeCorrupted(blockId, initCode) {
      if (!initCode || !initCode.trim()) return false;
      const block = this.blockLibrary.find(b => b.id === blockId);
      if (!block) return false;
      
      const trimmedInit = initCode.trim();
      const trimmedDefault = (block.defaultCode || '').trim();
      
      if (trimmedInit === trimmedDefault) {
        return true;
      }
      
      if (block.code && trimmedInit === (block.code || '').trim()) {
        return true;
      }
      
      const blockModules = this.customModules.filter(m => m.blockId === blockId);
      for (const mod of blockModules) {
        if (mod.code && trimmedInit === mod.code.trim()) {
          return true;
        }
      }
      
      return false;
    },

    loadWorkspacePackageState() {
      try {
        const hidden = localStorage.getItem('mlsphere-hidden-packages');
        this.hiddenBlockIds = hidden ? JSON.parse(hidden) : [];

        const initMap = localStorage.getItem('mlsphere-init-code-map');
        this.blockInitCodeMap = initMap ? JSON.parse(initMap) : {};
      } catch (e) {
        this.hiddenBlockIds = [];
        this.blockInitCodeMap = {};
        console.error('Failed to load package state from localStorage:', e);
      }
    },

    saveWorkspacePackageState() {
      try {
        localStorage.setItem('mlsphere-hidden-packages', JSON.stringify(this.hiddenBlockIds));
        localStorage.setItem('mlsphere-init-code-map', JSON.stringify(this.blockInitCodeMap));
      } catch (e) {
        console.error('Failed to save package state to localStorage:', e);
      }
    },

    applyHiddenBlocks() {
      // For python-import projects, don't load predefined blocks
      if (this.projectType === 'python-import') {
        return;
      }
      this.blockLibrary = Object.values(blockTypes).filter(block => !this.hiddenBlockIds.includes(block.id));
    },

    sanitizeAllInitFiles() {
      let hasChanges = false;
      this.blockLibrary.forEach(block => {
        const savedInit = this.blockInitCodeMap[block.id];
        const trimmedDefault = (block.defaultCode || '').trim();
        const trimmedSaved = (savedInit || '').trim();
        
        if (trimmedSaved === trimmedDefault || trimmedSaved === (block.code || '').trim()) {
          this.blockInitCodeMap[block.id] = this.getDefaultInitCode();
          hasChanges = true;
        }
      });
      if (hasChanges) {
        this.saveWorkspacePackageState();
      }
    },

    bootstrapTemplatePackages() {
      // Skip for python-import projects
      if (this.projectType === 'python-import') {
        return;
      }
      
      const seedKey = 'mlsphere-template-packages-seeded-v2';
      const seeded = localStorage.getItem(seedKey) === '1';

      if (!seeded) {
        this.blockLibrary.forEach(block => {
          const hasRootModule = this.customModules.some(m => m.blockId === block.id && !m.folder);
          if (!hasRootModule) {
            this.customModules.push({
              id: `module_tpl_${block.id}_main`,
              name: 'main.py',
              type: 'module',
              blockId: block.id,
              folder: null,
              code: ''
            });
          }

          if (!this.blockInitCodeMap[block.id]) {
            this.blockInitCodeMap[block.id] = this.getDefaultInitCode();
          }
        });

        this.saveFoldersAndModulesToStorage();
        this.saveWorkspacePackageState();
        localStorage.setItem(seedKey, '1');
        return;
      }

      let hasModuleMigrationChanges = false;
      this.customModules.forEach(moduleItem => {
        if (!moduleItem || moduleItem.type !== 'module' || moduleItem.name !== 'main.py' || moduleItem.folder) {
          return;
        }

        const linkedBlock = this.blockLibrary.find(block => block && block.id === moduleItem.blockId);
        if (!linkedBlock) {
          return;
        }

        const moduleCode = String(moduleItem.code || '').trim();
        const defaultCode = String(linkedBlock.defaultCode || '').trim();

        if (moduleCode && defaultCode && moduleCode === defaultCode) {
          moduleItem.code = '';
          hasModuleMigrationChanges = true;
        }
      });

      if (hasModuleMigrationChanges) {
        this.saveFoldersAndModulesToStorage();
      }

      this.blockLibrary.forEach(block => {
        const defaultInit = this.getDefaultInitCode();
        const savedInit = this.blockInitCodeMap[block.id];
        
        if (!savedInit || this.isInitCodeCorrupted(block.id, savedInit)) {
          this.blockInitCodeMap[block.id] = defaultInit;
        }
      });
      this.saveWorkspacePackageState();
    },

    // Toggle block expansion to show/hide custom content
    toggleBlockExpanded(blockId) {
      this.expandedBlocks[blockId] = !this.expandedBlocks[blockId];
    },

    // Handle context menu on block header
    handleBlockContextMenu(event, block) {
      event.preventDefault();
      event.stopPropagation();
      
      let x = event.clientX;
      let y = event.clientY;
      
      if (x > window.innerWidth - 200) {
        x = window.innerWidth - 200;
      }
      if (y > window.innerHeight - 120) {
        y = window.innerHeight - 120;
      }
      
      this.contextMenu.show = true;
      this.contextMenu.x = x;
      this.contextMenu.y = y;
      this.contextMenu.type = 'block';
      this.contextMenu.item = block;
      this.contextMenu.blockId = block.id;
      
      // Expand the block to show custom content if not already expanded
      if (!this.expandedBlocks[block.id]) {
        this.expandedBlocks[block.id] = true;
      }
    },

    // Handle context menu on module
    handleModuleContextMenu(event, module, blockId) {
      event.preventDefault();
      event.stopPropagation();
      
      let x = event.clientX;
      let y = event.clientY;
      
      if (x > window.innerWidth - 200) {
        x = window.innerWidth - 200;
      }
      if (y > window.innerHeight - 120) {
        y = window.innerHeight - 120;
      }
      
      this.contextMenu.show = true;
      this.contextMenu.x = x;
      this.contextMenu.y = y;
      this.contextMenu.type = 'module';
      this.contextMenu.item = module;
      this.contextMenu.blockId = blockId;
    },

    // Handle context menu on __init__.py block init file
    handleBlockInitContextMenu(event, block) {
      event.preventDefault();
      event.stopPropagation();

      let x = event.clientX;
      let y = event.clientY;

      if (x > window.innerWidth - 200) x = window.innerWidth - 200;
      if (y > window.innerHeight - 120) y = window.innerHeight - 120;

      this.contextMenu.show = true;
      this.contextMenu.x = x;
      this.contextMenu.y = y;
      this.contextMenu.type = 'block-init';
      this.contextMenu.item = block;
      this.contextMenu.blockId = block.id;
      this.contextMenu.source = 'blocks';
    },

    selectBlock(block) {
      this.selectedBlock = { ...block };
      this.selectedItem = { ...block, type: 'block' };
    },

    selectBlockInit(block) {
      const fileId = `init-${block.id}`;
      
      // Check if file is already open
      const existingFile = this.openFiles.find(f => f.id === fileId && f.type === 'block-init');
      
      if (existingFile) {
        // Switch to existing tab
        this.activeFileId = existingFile.id;
      } else {
        // Add new file to open files
        this.selectedBlock = { ...block };
        let initCode = this.blockInitCodeMap[block.id] || this.getDefaultInitCode();
        
        if (this.isInitCodeCorrupted(block.id, initCode)) {
          initCode = this.getDefaultInitCode();
        }
        
        const fileObj = {
          id: fileId,
          type: 'block-init',
          blockId: block.id,
          blockName: block.name,
          name: '__init__',
          code: initCode,
          originalCode: initCode,
          icon: block.icon
        };
        this.openFiles.push(fileObj);
        this.activeFileId = fileId;
      }
      
      this.selectedItem = {
        type: 'block-init',
        blockId: block.id,
        blockName: block.name,
        name: '__init__',
        code: this.activeFile?.code || this.getDefaultInitCode(),
        icon: block.icon
      };
      this.localCode = this.selectedItem.code;
      this.isModified = false;
    },

    getModuleBlockName(blockId) {
      const block = this.blockLibrary.find(b => b.id === blockId);
      return block ? block.name : 'Unknown';
    },

    getFolderPathParts(folderId) {
      if (!folderId) return [];

      const parts = [];
      let currentId = folderId;

      while (currentId) {
        const folder = this.customFolders.find(f => f.id === currentId);
        if (!folder) break;
        parts.unshift(folder.name);
        currentId = folder.parent;
      }

      return parts;
    },

    getBlockPackageName(blockId) {
      const block = this.blockLibrary.find(b => b && b.id === blockId);
      if (!block) return '';

      const catalog = Array.isArray(this.blockCatalog) ? this.blockCatalog : [];
      const entry = catalog.find(item => String(item?.blockName || '').trim() === String(block?.name || '').trim());
      if (entry?.package) {
        return String(entry.package).trim();
      }

      if (Array.isArray(block.packages) && block.packages.length > 0) {
        return String(block.packages[0] || '').trim();
      }

      if (block.config && block.config.package) {
        return String(block.config.package).trim();
      }

      return String(block.name || 'block')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '') || 'block';
    },

    getProjectIdForSync() {
      if (this.projectId === null || this.projectId === undefined || this.projectId === '') {
        return '';
      }
      return this.projectId;
    },

    getBlockInitFilePath(blockId) {
      const packageName = this.getBlockPackageName(blockId);
      if (!packageName) {
        return '';
      }
      return `${packageName.replace(/\./g, '/')}/__init__.py`;
    },

    getModuleFilePathForSync(moduleLike) {
      if (!moduleLike) {
        return '';
      }

      const computedTail = this.buildModuleTargetTail(moduleLike);
      if (computedTail) {
        return computedTail;
      }

      if (typeof moduleLike.filePath === 'string' && moduleLike.filePath.trim()) {
        const existingPath = String(moduleLike.filePath).replace(/\\/g, '/').trim();
        if (this.projectType === 'python-import') {
          return existingPath;
        }

        if (existingPath.includes('/')) {
          return existingPath;
        }

        return '';
      }

      return this.buildModuleTargetTail(moduleLike);
    },

    normalizeProjectFilePath(pathValue) {
      return String(pathValue || '').replace(/\\/g, '/').toLowerCase();
    },

    buildModuleTargetTail(moduleLike) {
      if (!moduleLike || moduleLike.type !== 'module') {
        return '';
      }

      const packageName = this.getBlockPackageName(moduleLike.blockId);
      if (!packageName) {
        return '';
      }

      const folderParts = this.getFolderPathParts(moduleLike.folder);
      return [packageName, ...folderParts, moduleLike.name]
        .filter(Boolean)
        .join('/')
        .toLowerCase();
    },

    findProjectFileByTail(targetTail) {
      if (!targetTail) {
        return null;
      }

      return (Array.isArray(this.projectFiles) ? this.projectFiles : []).find(file => {
        const normalizedPath = this.normalizeProjectFilePath(file?.relativePath || file?.path || '');
        return normalizedPath === targetTail || normalizedPath.endsWith(`/${targetTail}`);
      }) || null;
    },

    cacheResolvedModuleContent(moduleId, content) {
      if (!moduleId || !content) {
        return;
      }

      const moduleRecord = this.customModules.find(m => m && m.id === moduleId);
      if (moduleRecord && !moduleRecord.code) {
        moduleRecord.code = content;
        this.saveModulesToStorage();
      }

      const openFileRecord = this.openFiles.find(f => f && f.id === moduleId);
      if (openFileRecord && !openFileRecord.code) {
        openFileRecord.code = content;
      }
    },

    resolveModuleContentFromProjectFiles(moduleLike) {
      if (!moduleLike || moduleLike.type !== 'module') {
        return '';
      }

      const targetTail = this.buildModuleTargetTail(moduleLike);
      if (!targetTail) {
        return '';
      }

      const candidate = this.findProjectFileByTail(targetTail);
      const content = typeof candidate?.content === 'string' ? candidate.content : '';
      if (!content) {
        return '';
      }

      this.cacheResolvedModuleContent(moduleLike.id, content);

      return content;
    },

    splitModuleName(fileName) {
      return splitModuleName(fileName);
    },

    getModuleBaseName(fileName) {
      return getModuleBaseName(fileName);
    },

    getModuleDisplayExt(fileName) {
      return getModuleDisplayExt(fileName);
    },

    getModuleDisplayFilename(fileName) {
      return getModuleDisplayFilename(fileName);
    },

    getParsedEditorCode(fileName, rawCode) {
      const extension = this.getModuleDisplayExt(fileName).toLowerCase();
      const safeCode = typeof rawCode === 'string' ? rawCode : '';

      if (extension === '.json') {
        try {
          return JSON.stringify(JSON.parse(safeCode), null, 2);
        } catch (error) {
          return safeCode;
        }
      }

      return safeCode;
    },

    parseCsvRows(text) {
      const input = String(text || '').replace(/\r\n/g, '\n');
      if (!input.trim()) {
        return [];
      }

      const rows = [];
      let row = [];
      let cell = '';
      let inQuotes = false;

      for (let index = 0; index < input.length; index += 1) {
        const char = input[index];
        const next = input[index + 1];

        if (char === '"') {
          if (inQuotes && next === '"') {
            cell += '"';
            index += 1;
          } else {
            inQuotes = !inQuotes;
          }
          continue;
        }

        if (char === ',' && !inQuotes) {
          row.push(cell);
          cell = '';
          continue;
        }

        if (char === '\n' && !inQuotes) {
          row.push(cell);
          rows.push(row);
          row = [];
          cell = '';
          continue;
        }

        cell += char;
      }

      row.push(cell);
      if (row.length > 1 || row[0] !== '') {
        rows.push(row);
      }

      const maxColumns = rows.reduce((max, current) => Math.max(max, current.length), 0);
      return rows.map(current => {
        const normalized = [...current];
        while (normalized.length < maxColumns) {
          normalized.push('');
        }
        return normalized;
      });
    },

    isPythonModule(fileName) {
      const extension = this.getModuleDisplayExt(fileName).toLowerCase();
      return extension === '' || extension === '.py';
    },

    getPythonModuleName(fileName) {
      return this.getModuleBaseName(fileName);
    },

    getFolderPath(folderId) {
      if (!folderId) return '';
      
      const parts = [];
      let currentId = folderId;
      
      while (currentId) {
        const folder = this.customFolders.find(f => f.id === currentId);
        if (!folder) break;
        parts.unshift(folder.name);
        currentId = folder.parent;
      }
      
      return parts.join(' / ') || '';
    },

    async selectModule(module) {
      try {
        let effectiveCode = '';
        const projectId = this.getProjectIdForSync();

        // If module has a filePath, load from disk via desktop agent
        if (projectId && typeof module?.filePath === 'string' && module.filePath) {
          try {
            const fileData = await readProjectFile(projectId, module.filePath);
            effectiveCode = fileData?.content || '';
          } catch (error) {
            console.warn('Failed to load file from disk:', error);
            effectiveCode = '';
          }
        } else {
          // Fallback to existing code in module or resolve from project files
          const fallbackCode = this.resolveModuleContentFromProjectFiles(module);
          effectiveCode = typeof module?.code === 'string' && module.code
            ? module.code
            : fallbackCode;
        }

        // Check if file is already open
        const existingFile = this.openFiles.find(f => f.id === module.id && f.type === 'module');
        
        if (existingFile) {
          if (!existingFile.code && effectiveCode) {
            existingFile.code = effectiveCode;
          }
          // Switch to existing tab
          this.activeFileId = existingFile.id;
        } else {
          // Add new file to open files
          const parsedCode = this.getParsedEditorCode(module.name, effectiveCode || '');
          const fileObj = {
            id: module.id,
            type: 'module',
            name: module.name,
            blockId: module.blockId,
            folder: module.folder || null,
            filePath: module.filePath || null,  // Keep track of disk file path
            code: parsedCode,
            originalCode: parsedCode
          };
          this.openFiles.push(fileObj);
          this.activeFileId = module.id;
        }
        
        this.selectedItem = {
          ...module,
          code: effectiveCode || ''
        };
        this.selectedFolder = null;
      } catch (error) {
        console.error('Error selecting module:', error);
        this.showFlash('Failed to load module', 'error');
      }
    },

    closeTab(fileId) {
      const fileIndex = this.openFiles.findIndex(f => f.id === fileId);
      if (fileIndex === -1) return;
      
      this.openFiles.splice(fileIndex, 1);
      
      // If closing the active file, switch to another tab
      if (this.activeFileId === fileId) {
        if (this.openFiles.length > 0) {
          // Switch to the previous tab or next tab
          const newIndex = Math.min(fileIndex, this.openFiles.length - 1);
          const nextFileId = this.openFiles[newIndex].id;
          this.switchToTab(nextFileId);
        } else {
          this.activeFileId = null;
          this.selectedItem = null;
          this.localCode = '';
        }
      }
      
      this.showFlash(`Closed tab`, 'info');
    },

    switchToTab(fileId) {
      const file = this.openFiles.find(f => f.id === fileId);
      if (!file) return;

      let resolvedFileCode = file.code;
      if (file.type === 'module' && !resolvedFileCode) {
        resolvedFileCode = this.resolveModuleContentFromProjectFiles(file) || '';
        if (resolvedFileCode) {
          file.code = resolvedFileCode;
        }
      }
      
      this.activeFileId = fileId;
      this.localCode = file.type === 'module'
        ? this.getParsedEditorCode(file.name, resolvedFileCode)
        : file.code;
      this.isModified = this.fileModifiedMap[fileId] || false;
      
      if (file.type === 'module') {
        this.selectedItem = {
          type: 'module',
          id: file.id,
          name: file.name,
          blockId: file.blockId,
          folder: file.folder || null,
          code: resolvedFileCode
        };
      } else if (file.type === 'block-init') {
        this.selectedItem = {
          type: 'block-init',
          blockId: file.blockId,
          blockName: file.blockName,
          name: '__init__',
          code: file.code,
          icon: file.icon
        };
      }
    },


    selectFolderContext(folder) {
      this.selectedFolder = folder;
      this.selectedItem = null;
    },

    handleContextMenu(data) {
      data.event.preventDefault();
      data.event.stopPropagation();
      
      let x = data.event.clientX;
      let y = data.event.clientY;
      
      // Adjust position if menu would go off-screen
      if (x > window.innerWidth - 200) {
        x = window.innerWidth - 200;
      }
      if (y > window.innerHeight - 120) {
        y = window.innerHeight - 120;
      }
      
      this.contextMenu.show = true;
      this.contextMenu.x = x;
      this.contextMenu.y = y;
      this.contextMenu.type = data.type;
      this.contextMenu.item = data.folder;
      this.contextMenu.blockId = data.blockId;

    },

    startRenameFromContextMenu() {
      if (!this.contextMenu.item || !this.contextMenu.type) {
        this.contextMenu.show = false;
        return;
      }

      if (this.contextMenu.type === 'folder' || this.contextMenu.type === 'module') {
        this.beginInlineRename(this.contextMenu.type, this.contextMenu.item.id, this.contextMenu.item.name || '');
      }

      this.contextMenu.show = false;
    },

    isInlineRenaming(type, itemId) {
      return this.inlineRename.show && this.inlineRename.type === type && this.inlineRename.itemId === itemId;
    },

    beginInlineRename(type, itemId, currentValue) {
      this.cancelInlineCreate();
      this.inlineRename.show = true;
      this.inlineRename.type = type;
      this.inlineRename.itemId = itemId;
      this.inlineRename.value = currentValue;

      this.$nextTick(() => {
        this.focusInlineRenameInput();
      });
    },

    focusInlineRenameInput() {
      const input = document.querySelector(`.inline-rename-input[data-rename-id="${this.inlineRename.itemId}"]`);
      if (input) {
        input.focus();
        input.select();
      }
    },

    updateInlineRenameValue(value) {
      this.inlineRename.value = value;
    },

    cancelInlineRename() {
      this.inlineRename.show = false;
      this.inlineRename.type = null;
      this.inlineRename.itemId = null;
      this.inlineRename.value = '';
    },

    submitInlineRename() {
      if (!this.inlineRename.show || !this.inlineRename.type || !this.inlineRename.itemId) {
        this.cancelInlineRename();
        return;
      }

      const { type, itemId, value } = this.inlineRename;
      if (type === 'module') {
        this.applyRenameModule(itemId, value);
      } else if (type === 'folder') {
        this.applyRenameFolder(itemId, value);
      }
    },

    updateInlineCreateValue(value) {
      this.inlineCreate.value = value;
    },

    getCreateScopeKey(blockId, parentFolderId) {
      return `${blockId || 'none'}::${parentFolderId || 'root'}`;
    },

    shouldShowInlineCreateFor(blockId, parentFolderId) {
      if (!this.inlineCreate.show) {
        return false;
      }
      return this.inlineCreate.blockId === blockId && (this.inlineCreate.parentFolderId || null) === (parentFolderId || null);
    },

    getInlineCreateIcon() {
      if (this.inlineCreate.type === 'folder') {
        return this.inlineCreate.isPackage ? '📦' : '📁';
      }
      return '📄';
    },

    getInlineCreatePlaceholder() {
      if (this.inlineCreate.type === 'folder') {
        return this.inlineCreate.isPackage ? 'new_package' : 'new_folder';
      }
      return 'new_file.py';
    },

    resolveCreateContext(contextItem, fallbackBlockId) {
      let blockId = fallbackBlockId || null;
      let parentFolderId = null;

      if (contextItem?.type === 'folder' || contextItem?.children) {
        parentFolderId = contextItem.id;
        blockId = contextItem.blockId || blockId;
      } else if (contextItem?.type === 'module') {
        parentFolderId = contextItem.folder || null;
        blockId = contextItem.blockId || blockId;
      } else {
        blockId = contextItem?.id || blockId;
      }

      return { blockId, parentFolderId };
    },

    beginInlineCreate(type, { blockId, parentFolderId = null, isPackage = false }) {
      this.cancelInlineRename();
      this.inlineCreate.show = true;
      this.inlineCreate.type = type;
      this.inlineCreate.blockId = blockId;
      this.inlineCreate.parentFolderId = parentFolderId;
      this.inlineCreate.isPackage = !!isPackage;
      this.inlineCreate.value = '';

      if (blockId) {
        this.expandedBlocks[blockId] = true;
      }
      if (parentFolderId) {
        let ancestorId = parentFolderId;
        while (ancestorId) {
          this.expandedFolders[ancestorId] = true;
          const ancestor = this.customFolders.find(f => f.id === ancestorId);
          ancestorId = ancestor?.parent;
        }
      }

      this.$nextTick(() => {
        this.focusInlineCreateInput();
      });
    },

    focusInlineCreateInput() {
      const scope = this.getCreateScopeKey(this.inlineCreate.blockId, this.inlineCreate.parentFolderId);
      const input = document.querySelector(`.inline-create-input[data-create-scope="${scope}"]`);
      if (input) {
        input.focus();
        input.select();
      }
    },

    cancelInlineCreate() {
      this.inlineCreate.show = false;
      this.inlineCreate.type = null;
      this.inlineCreate.blockId = null;
      this.inlineCreate.parentFolderId = null;
      this.inlineCreate.isPackage = false;
      this.inlineCreate.value = '';
    },

    submitInlineCreate() {
      if (!this.inlineCreate.show || !this.inlineCreate.type) {
        return;
      }

      if (!(this.inlineCreate.value || '').trim()) {
        this.cancelInlineCreate();
        return;
      }

      if (this.inlineCreate.type === 'file') {
        this.createFile();
      } else if (this.inlineCreate.type === 'folder') {
        this.createFolder();
      }
    },

    resetCreateContext() {
      this.createInContext.type = null;
      this.createInContext.parentFolderId = null;
      this.createInContext.blockId = null;
      this.createInContext.isPackage = false;
    },

    openDeleteConfirmDialog(type, itemId) {
      this.confirmDialog.show = true;
      this.confirmDialog.type = type;
      this.confirmDialog.itemId = itemId;
      if (type === 'folder') {
        this.confirmDialog.title = 'Delete Folder';
        this.confirmDialog.message = 'Delete this folder and all its contents? This action cannot be undone.';
      } else if (type === 'block') {
        this.confirmDialog.title = 'Delete Package';
        this.confirmDialog.message = 'Delete this package and all files inside it? This action cannot be undone.';
      } else {
        this.confirmDialog.title = 'Delete File';
        this.confirmDialog.message = 'Delete this file? This action cannot be undone.';
      }
    },

    closeConfirmDialog() {
      this.confirmDialog.show = false;
      this.confirmDialog.type = null;
      this.confirmDialog.itemId = null;
      this.confirmDialog.title = '';
      this.confirmDialog.message = '';
    },

    confirmDeleteAction() {
      const { type, itemId } = this.confirmDialog;
      this.closeConfirmDialog();

      if (!type || !itemId) return;

      if (type === 'module') {
        this.deleteModule(itemId);
      } else if (type === 'folder') {
        this.deleteFolder(itemId);
      } else if (type === 'block') {
        this.deleteBlockPackage(itemId);
      } else if (type === 'tree-file') {
        this.deleteTreeNode(itemId, false);
      } else if (type === 'tree-dir') {
        this.deleteTreeNode(itemId, true);
      }
    },

    confirmAndDeleteBlock(blockId) {
      this.contextMenu.show = false;
      this.openDeleteConfirmDialog('block', blockId);
    },

    deleteBlockPackage(blockId) {
      const block = this.blockLibrary.find(b => b.id === blockId);
      if (!block) {
        return;
      }

      this.hiddenBlockIds = [...new Set([...this.hiddenBlockIds, blockId])];
      this.blockLibrary = this.blockLibrary.filter(b => b.id !== blockId);

      this.customModules = this.customModules.filter(m => m.blockId !== blockId);
      this.customFolders = this.customFolders.filter(f => f.blockId !== blockId);
      delete this.expandedBlocks[blockId];
      delete this.blockInitCodeMap[blockId];

      if (this.selectedItem && this.selectedItem.blockId === blockId) {
        this.selectedItem = null;
        this.localCode = '';
      }

      this.saveFoldersAndModulesToStorage();
      this.saveWorkspacePackageState();
      this.showFlash(`Package "${block.name}" deleted`, 'success');
    },

    startCreateFile(contextItem) {
      this.contextMenu.show = false;
      const { blockId, parentFolderId } = this.resolveCreateContext(contextItem, this.contextMenu.blockId);
      this.createInContext.type = 'file';
      this.createInContext.blockId = blockId;
      this.createInContext.parentFolderId = parentFolderId;
      this.createInContext.isPackage = false;

      this.beginInlineCreate('file', {
        blockId,
        parentFolderId,
        isPackage: false
      });
    },

    startCreateFolder(contextItem, isPackage) {
      this.contextMenu.show = false;
      const { blockId, parentFolderId } = this.resolveCreateContext(contextItem, this.contextMenu.blockId);
      this.createInContext.type = 'folder';
      this.createInContext.blockId = blockId;
      this.createInContext.parentFolderId = parentFolderId;
      this.createInContext.isPackage = isPackage;

      this.beginInlineCreate('folder', {
        blockId,
        parentFolderId,
        isPackage
      });
    },

    toggleCategory(categoryName) {
      this.expandedCategories[categoryName] = !this.expandedCategories[categoryName];
    },

    showCreateModuleDialog() {
      if (!this.selectedFolder && !this.selectedItem) {
        this.showFlash('Select a folder or module first', 'error');
        return;
      }
      this.startCreateModule(this.selectedFolder);
    },

    createFile() {
      const rawPath = this.inlineCreate.show && this.inlineCreate.type === 'file'
        ? this.inlineCreate.value
        : '';
      const fullPath = rawPath.trim();
      
      if (!fullPath) {
        this.showFlash('Please enter a file name', 'error');
        return;
      }
      
      // Parse the path to handle nested folders
      const pathParts = fullPath.split('/').filter(p => p.trim());
      if (pathParts.length === 0) {
        this.showFlash('Invalid file name', 'error');
        return;
      }
      
      const fileName = pathParts[pathParts.length - 1];
      const folderPath = pathParts.slice(0, -1);
      
      // Validate file name (allow any extension)
      if (!fileName || fileName.trim() === '') {
        this.showFlash('Invalid file name', 'error');
        return;
      }
      
      // Create intermediate folders if path is specified
      let currentParent = this.createInContext.parentFolderId;
      const blockId = this.createInContext.blockId;
      
      for (const folderName of folderPath) {
        // Check if folder exists
        let existingFolder = this.customFolders.find(f => 
          f.name === folderName && 
          f.parent === currentParent && 
          f.blockId === blockId
        );
        
        if (!existingFolder) {
          // Create the folder
          existingFolder = {
            id: `folder_${Date.now()}_${Math.random()}`,
            name: folderName,
            blockId: blockId,
            parent: currentParent,
            children: []
          };
          
          // Update parent's children if exists
          if (currentParent) {
            const parent = this.customFolders.find(f => f.id === currentParent);
            if (parent && !parent.children.includes(existingFolder.id)) {
              parent.children.push(existingFolder.id);
            }
          }
          
          this.customFolders.push(existingFolder);
          this.expandedFolders[existingFolder.id] = true;
        }
        
        currentParent = existingFolder.id;
      }
      
      // Check if file already exists in target folder
      if (this.customModules.some(m => m.name === fileName && m.folder === currentParent && m.blockId === blockId)) {
        this.showFlash(`File "${fileName}" already exists in this location`, 'error');
        return;
      }
      
      // Create the file
      const newFile = {
        id: `module_${Date.now()}`,
        name: fileName,
        type: 'module',
        blockId: blockId,
        folder: currentParent,
        code: ''  // Empty initial code
      };
      
      this.customModules.push(newFile);
      
      // Expand the block and all parent folders
      if (blockId) {
        this.expandedBlocks[blockId] = true;
      }
      if (currentParent) {
        this.expandedFolders[currentParent] = true;
        // Expand all ancestor folders
        let ancestorId = currentParent;
        while (ancestorId) {
          this.expandedFolders[ancestorId] = true;
          const ancestor = this.customFolders.find(f => f.id === ancestorId);
          ancestorId = ancestor?.parent;
        }
      }
      
      this.selectModule(newFile);
      this.cancelInlineCreate();
      this.resetCreateContext();
      
      this.saveFoldersAndModulesToStorage();
      this.showFlash(`File "${fileName}" created`, 'success');
    },

    confirmAndDeleteModule(moduleId) {
      this.contextMenu.show = false;
      this.openDeleteConfirmDialog('module', moduleId);
    },

    deleteModule(moduleId) {
      const index = this.customModules.findIndex(m => m.id === moduleId);
      if (index > -1) {
        this.customModules.splice(index, 1);

        if (this.isInlineRenaming('module', moduleId)) {
          this.cancelInlineRename();
        }

        if (this.selectedItem && this.selectedItem.id === moduleId) {
          this.selectedItem = null;
        }
        
        this.saveModulesToStorage();
        this.showFlash('File deleted', 'success');
      }
    },

    renameModule(moduleId) {
      const module = this.customModules.find(m => m.id === moduleId);
      if (!module) {
        return;
      }

      this.beginInlineRename('module', moduleId, module.name);
    },

    applyRenameModule(moduleId, value) {
      const module = this.customModules.find(m => m.id === moduleId);
      if (!module) {
        this.cancelInlineRename();
        return;
      }

      const newName = (value || '').trim();
      if (!newName) {
        this.showFlash('File name cannot be empty', 'error');
        return;
      }

      if (newName.includes('/')) {
        this.showFlash('Rename only supports file name, not path', 'error');
        return;
      }

      const duplicate = this.customModules.some(m =>
        m.id !== moduleId &&
        m.blockId === module.blockId &&
        m.folder === module.folder &&
        m.name === newName
      );

      if (duplicate) {
        this.showFlash(`File "${newName}" already exists in this location`, 'error');
        return;
      }

      if (module.name === newName) {
        this.cancelInlineRename();
        return;
      }

      module.name = newName;
      this.saveFoldersAndModulesToStorage();
      this.cancelInlineRename();
      this.showFlash('File renamed', 'success');
    },

    handleCodeChange() {
      this.isModified = true;
      
      // Track modification for current file
      if (this.activeFileId) {
        this.fileModifiedMap[this.activeFileId] = true;
      }
      
      if (this.autoSaveTimer) {
        clearTimeout(this.autoSaveTimer);
      }
      
      this.autoSaveTimer = setTimeout(() => {
        this.saveCode();
      }, 1500);
    },

    async saveCode() {
      if (!this.activeFile) {
        return;
      }

      const file = this.activeFile;

      if (file.type === 'block-init') {
        const blockId = file.blockId;
        this.blockInitCodeMap[blockId] = this.localCode;
        this.saveWorkspacePackageState();

        const projectId = this.getProjectIdForSync();
        const filePath = this.getBlockInitFilePath(blockId);
        if (projectId && filePath) {
          try {
            await writeProjectFile(projectId, filePath, this.localCode);
          } catch (error) {
            console.warn('Failed to save __init__.py to disk:', error);
            this.showFlash('Failed to sync __init__.py to disk', 'error');
          }
        }
      } else if (file.type === 'module') {
        // Update module code locally
        const module = this.customModules.find(m => m.id === file.id);
        if (module) {
          module.code = this.localCode;

          const projectId = this.getProjectIdForSync();
          const filePath = this.getModuleFilePathForSync(module);
          if (filePath) {
            module.filePath = filePath;
          }

          if (projectId && module.filePath) {
            try {
              await writeProjectFile(projectId, module.filePath, this.localCode);
            } catch (error) {
              console.warn('Failed to save file to disk:', error);
              this.showFlash('Failed to save file to disk', 'error');
            }
          }

          this.saveModulesToStorage();
        } else if (file.filePath) {
          // Tree file (from file tree, not a block module) — save directly by path
          const projectId = this.getProjectIdForSync();
          if (projectId) {
            try {
              await writeProjectFile(projectId, file.filePath, this.localCode);
            } catch (error) {
              console.warn('Failed to save tree file to disk:', error);
            }
          }
        }
      }

      // Update file in openFiles
      file.code = this.localCode;
      this.isModified = false;
      this.fileModifiedMap[file.id] = false;
    },

    saveModulesToStorage() {
      this.saveFoldersAndModulesToStorage();
    },

    saveFoldersAndModulesToStorage() {
      try {
        // Create a copy of modules WITHOUT the code to avoid localStorage quota exceeded
        const modulesForStorage = this.customModules.map(m => ({
          id: m.id,
          name: m.name,
          type: m.type,
          blockId: m.blockId,
          folder: m.folder,
          filePath: m.filePath  // Keep filePath so we know where to load from
          // Note: code is intentionally excluded to save storage space
        }));
        
        localStorage.setItem('mlsphere-modules', JSON.stringify(modulesForStorage));
        localStorage.setItem('mlsphere-folders', JSON.stringify(this.customFolders));
      } catch (e) {
        if (e.name === 'QuotaExceededError') {
          console.warn('localStorage quota exceeded, clearing old cache...');
          try {
            // Clear old data and try again
            const projects = JSON.parse(localStorage.getItem('ml_projects') || '[]');
            localStorage.clear();
            localStorage.setItem('ml_projects', JSON.stringify(projects));
            
            const modulesForStorage = this.customModules.map(m => ({
              id: m.id,
              name: m.name,
              type: m.type,
              blockId: m.blockId,
              folder: m.folder,
              filePath: m.filePath
            }));
            localStorage.setItem('mlsphere-modules', JSON.stringify(modulesForStorage));
            localStorage.setItem('mlsphere-folders', JSON.stringify(this.customFolders));
          } catch (retryError) {
            console.error('Failed to save even after clearing cache:', retryError);
          }
        } else {
          console.error('Failed to save to localStorage:', e);
        }
      }
    },

    loadModulesFromStorage() {
      try {
        const modules = localStorage.getItem('mlsphere-modules');
        if (modules) {
          this.customModules = JSON.parse(modules);
          // Ensure all modules have a blockId (for backward compatibility, default to first block)
          this.customModules.forEach(m => {
            if (!m.blockId && this.blockLibrary.length > 0) {
              m.blockId = this.blockLibrary[0].id;
            }
          });
        }
        
        const folders = localStorage.getItem('mlsphere-folders');
        if (folders) {
          this.customFolders = JSON.parse(folders);
          // Ensure all folders have a blockId (for backward compatibility, default to first block)
          this.customFolders.forEach(f => {
            if (!f.blockId && this.blockLibrary.length > 0) {
              f.blockId = this.blockLibrary[0].id;
            }
          });
        }
        
        // Save updated data if any items were missing blockId
        this.saveFoldersAndModulesToStorage();
      } catch (e) {
        console.error('Failed to load from localStorage:', e);
      }
    },

    showCreateFolderDialog() {
      if (!this.selectedFolder && !this.selectedItem) {
        this.showFlash('Select a folder or module first', 'error');
        return;
      }
      this.startCreateFolder(this.selectedFolder);
    },

    createFolder() {
      const rawPath = this.inlineCreate.show && this.inlineCreate.type === 'folder'
        ? this.inlineCreate.value
        : '';
      const fullPath = rawPath.trim();
      
      if (!fullPath) {
        this.showFlash('Please enter a folder name', 'error');
        return;
      }
      
      // Parse the path to handle nested folders
      const pathParts = fullPath.split('/').filter(p => p.trim());
      if (pathParts.length === 0) {
        this.showFlash('Invalid folder name', 'error');
        return;
      }
      
      // Create all folders in the path
      let currentParent = this.createInContext.parentFolderId;
      const blockId = this.createInContext.blockId;
      const isPackage = this.createInContext.isPackage;
      
      for (let i = 0; i < pathParts.length; i++) {
        const folderName = pathParts[i];
        
        // Validate folder name
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(folderName)) {
          this.showFlash(`Folder name "${folderName}" is invalid`, 'error');
          return;
        }
        
        // Check if folder exists
        let existingFolder = this.customFolders.find(f => 
          f.name === folderName && 
          f.parent === currentParent && 
          f.blockId === blockId
        );
        
        if (existingFolder) {
          // Folder exists, just use it as parent for next level
          currentParent = existingFolder.id;
          this.expandedFolders[existingFolder.id] = true;
        } else {
          // Create new folder
          const newFolder = {
            id: `folder_${Date.now()}_${Math.random()}`,
            name: folderName,
            blockId: blockId,
            parent: currentParent,
            children: [],
            isPackage: isPackage  // Store package flag
          };
          
          // Update parent's children if exists
          if (currentParent) {
            const parent = this.customFolders.find(f => f.id === currentParent);
            if (parent && !parent.children.includes(newFolder.id)) {
              parent.children.push(newFolder.id);
            }
          }
          
          this.customFolders.push(newFolder);
          this.expandedFolders[newFolder.id] = true;
          
          // If this is a package, create __init__.py file in the folder
          if (isPackage) {
            const initFile = {
              id: `module_${Date.now()}_${Math.random()}`,
              name: '__init__',
              type: 'module',
              blockId: blockId,
              folder: newFolder.id,
              code: '# Package initialization\n'
            };
            this.customModules.push(initFile);
          }
          
          currentParent = newFolder.id;
        }
      }
      
      // Expand the block and all parent folders
      if (blockId) {
        this.expandedBlocks[blockId] = true;
      }
      if (currentParent) {
        // Expand all ancestor folders
        let ancestorId = currentParent;
        while (ancestorId) {
          this.expandedFolders[ancestorId] = true;
          const ancestor = this.customFolders.find(f => f.id === ancestorId);
          ancestorId = ancestor?.parent;
        }
      }
      
      this.cancelInlineCreate();
      this.resetCreateContext();
      
      this.saveFoldersAndModulesToStorage();
      this.showFlash(isPackage ? 'Package created' : 'Folder created', 'success');
    },

    confirmAndDeleteFolder(folderId) {
      this.contextMenu.show = false;
      this.openDeleteConfirmDialog('folder', folderId);
    },

    deleteFolder(folderId) {
      const folder = this.customFolders.find(f => f.id === folderId);
      if (!folder) return;

      if (this.isInlineRenaming('folder', folderId)) {
        this.cancelInlineRename();
      }

      // Remove all modules in this folder
      this.customModules = this.customModules.filter(m => m.folder !== folderId);

      // Recursively delete child folders
      const deleteChildFolders = (parentId) => {
        const children = this.customFolders.filter(f => f.parent === parentId);
        children.forEach(child => {
          deleteChildFolders(child.id);
          this.customModules = this.customModules.filter(m => m.folder !== child.id);
        });
      };
      deleteChildFolders(folderId);

      // Remove from parent's children
      if (folder.parent) {
        const parent = this.customFolders.find(f => f.id === folder.parent);
        if (parent) {
          parent.children = parent.children.filter(id => id !== folderId);
        }
      }

      this.customFolders = this.customFolders.filter(f => f.id !== folderId);
      if (this.selectedItem && this.selectedItem.id === folderId) {
        this.selectedItem = null;
      }
      
      this.saveFoldersAndModulesToStorage();
      this.showFlash('Folder deleted', 'success');
    },

    renameFolder(folderId) {
      const folder = this.customFolders.find(f => f.id === folderId);
      if (!folder) {
        return;
      }

      this.beginInlineRename('folder', folderId, folder.name);
    },

    applyRenameFolder(folderId, value) {
      const folder = this.customFolders.find(f => f.id === folderId);
      if (!folder) {
        this.cancelInlineRename();
        return;
      }

      const newName = (value || '').trim();
      if (!newName) {
        this.showFlash('Folder name cannot be empty', 'error');
        return;
      }

      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newName)) {
        this.showFlash('Folder name format is invalid', 'error');
        return;
      }

      const duplicate = this.customFolders.some(f =>
        f.id !== folderId &&
        f.blockId === folder.blockId &&
        f.parent === folder.parent &&
        f.name === newName
      );

      if (duplicate) {
        this.showFlash(`Folder "${newName}" already exists in this location`, 'error');
        return;
      }

      if (folder.name === newName) {
        this.cancelInlineRename();
        return;
      }

      folder.name = newName;
      this.saveFoldersAndModulesToStorage();
      this.cancelInlineRename();
      this.showFlash('Folder renamed', 'success');
    },

    toggleFolderExpanded(folderId) {
      this.expandedFolders[folderId] = !this.expandedFolders[folderId];
    },

    getBreadcrumb(folderId) {
      const parts = [];
      let currentId = folderId;
      
      while (currentId) {
        const folder = this.customFolders.find(f => f.id === currentId);
        if (!folder) break;
        parts.unshift(folder.name);
        currentId = folder.parent;
      }
      
      return parts.join(' / ');
    }
  },
  beforeUnmount() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    if (this.closeContextMenuHandler) {
      document.removeEventListener('click', this.closeContextMenuHandler);
      this.closeContextMenuHandler = null;
    }
    if (this.treeKeyHandler) {
      document.removeEventListener('keydown', this.treeKeyHandler);
      this.treeKeyHandler = null;
    }
    if (this.flashTimer) {
      clearTimeout(this.flashTimer);
      this.flashTimer = null;
    }
  }
};
</script>

<style scoped src="./codeEditorWorkspace.css"></style>

