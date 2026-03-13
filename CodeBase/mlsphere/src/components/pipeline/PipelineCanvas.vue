<template>
  <div 
    class="pipeline-canvas"
    @drop="onDrop"
    @dragover.prevent
    @dragenter.prevent
  >
    <div v-if="blocks.length === 0" class="canvas-empty-state">
      <div class="empty-icon">🧩</div>
      <h3>Drag blocks from the library to start building your ML pipeline</h3>
      <p>Connect data loading → preprocessing → model → training → evaluation</p>
    </div>
    
    <div v-else class="canvas-content">
      <div class="blocks-container">
        <MLBlock
          v-for="(block, index) in blocks"
          :key="block.instanceId"
          :block="block"
          @select="selectBlock(block)"
          @edit="editBlock(block)"
          @run="runBlock(block)"
          @delete="deleteBlock(index)"
          @clear-output="block.output = ''"
        />
      </div>
    </div>
  </div>
</template>

<script>
import MLBlock from './MLBlock.vue';
import {
  desktopAgentHealth,
  getJobLogs,
  getJobStatus,
  submitPythonJob,
} from '../../services/agent/desktopAgentClient';

export default {
  name: 'PipelineCanvas',
  components: {
    MLBlock
  },
  props: {
    currentProject: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      blocks: [],
      selectedBlock: null,
      isRunning: false,
      pipelineStatus: 'idle', // idle, running, success, error
      blockIdCounter: 0,
      agentAvailable: null,
      executionMode: 'auto'
    };
  },
  methods: {
    onDrop(event) {
      event.preventDefault();
      const blockData = JSON.parse(event.dataTransfer.getData('block'));
      this.addBlock(blockData);
    },
    
    addBlock(blockTemplate) {
      const newBlock = {
        ...blockTemplate,
        instanceId: `block_${this.blockIdCounter++}`,
        code: blockTemplate.code || blockTemplate.defaultCode || '',
        output: '',
        packages: Array.isArray(blockTemplate.packages) ? [...blockTemplate.packages] : [],
        status: 'idle',
        position: { x: 50, y: 50 }
      };

      this.blocks.push(newBlock);
      this.$emit('block-added', newBlock);
    },
    
    selectBlock(block) {
      this.selectedBlock = block;
      this.$emit('block-selected', block);
    },
    
    editBlock(block) {
      this.$emit('edit-block', block);
    },
    
    async runBlock(block) {
      if (block.status === 'running') return;

      block.status = 'running';
      block.output = '';
      this.$emit('block-started', block);

      const isAgentReady = await this.ensureAgentAvailable();
      if (!isAgentReady) {
        // Fall back to simulated output when agent is offline
        await this.delay(1800);
        const success = Math.random() > 0.15;
        block.status = success ? 'success' : 'error';
        block.output = this.generateBlockOutput(block, success);
        this.$emit('block-executed', { block, success, output: block.output, executionTime: 1800 });
        return;
      }

      const cumulativeCode = this.buildCumulativeCode(block);
      const result = await this.executeBlockWithAgent(block, cumulativeCode);
      this.$emit('block-executed', result);
    },

    generateBlockOutput(block, success) {
      if (!success) {
        const errors = [
          'Error: Module not found',
          'Error: Invalid data shape',
          'Error: Memory allocation failed',
          'Error: Connection timeout'
        ];
        return errors[Math.floor(Math.random() * errors.length)];
      }
      
      // Generate realistic output based on block type
      switch (block.category) {
        case 'Data':
          if (block.id === 'data_load') {
            return `Loaded dataset with shape (${Math.floor(Math.random() * 900 + 100)}, ${Math.floor(Math.random() * 20 + 5)})\nColumns: ['feature1', 'feature2', ..., 'target']`;
          } else {
            return `Preprocessing completed\nScaled ${Math.floor(Math.random() * 15 + 5)} features\nTrain/Test split: 80/20`;
          }
        case 'Model': {
          if (block.id === 'neural_network') {
            const params = Math.floor(Math.random() * 50000 + 10000);
            return `Neural Network initialized\nTotal params: ${params.toLocaleString()}\nTrainable params: ${params.toLocaleString()}`;
          } else {
            return `Random Forest initialized\n${Math.floor(Math.random() * 80 + 20)} trees created\nMax depth: ${Math.floor(Math.random() * 8 + 5)}`;
          }
        }
        case 'Training': {
          const acc = (Math.random() * 20 + 75).toFixed(2);
          return `Training completed\nFinal accuracy: ${acc}%\nEpochs completed: ${Math.floor(Math.random() * 30 + 20)}`;
        }
        case 'Analysis': {
          if (block.id === 'evaluate') {
            const metrics = {
              accuracy: (Math.random() * 15 + 80).toFixed(2),
              precision: (Math.random() * 15 + 80).toFixed(2),
              recall: (Math.random() * 15 + 75).toFixed(2),
              f1: (Math.random() * 15 + 78).toFixed(2)
            };
            return `Evaluation complete\nAccuracy: ${metrics.accuracy}%\nPrecision: ${metrics.precision}%\nRecall: ${metrics.recall}%\nF1-Score: ${metrics.f1}%`;
          } else {
            return 'Visualizations generated\nPlots saved: 4\nCharts: accuracy, loss, confusion matrix, metrics';
          }
        }
        default:
          return 'Execution completed successfully';
      }
    },
    
    deleteBlock(index) {
      this.blocks.splice(index, 1);
    },
    
    validatePipeline() {
      // Check if blocks are in logical order
      const hasDataLoad = this.blocks.some(b => b.category === 'Data');
      const hasModel = this.blocks.some(b => b.category === 'Model');
      const hasTraining = this.blocks.some(b => b.category === 'Training');
      
      if (!hasDataLoad) {
        this.$flash('Pipeline needs a data loading block', 'warning');
        return false;
      }
      
      if (!hasModel) {
        this.$flash('Pipeline needs a model block', 'warning');
        return false;
      }
      
      if (!hasTraining) {
        this.$flash('Pipeline needs a training block', 'warning');
        return false;
      }
      
      // Only show success notification, don't interrupt user
      this.$flash('Pipeline is valid', 'success', 2000);
      return true;
    },
    
    resetBlocksStatus() {
      // Reset all blocks to idle status before running pipeline
      this.blocks.forEach(block => {
        block.status = 'idle';
      });
    },
    
    async runPipeline() {
      if (!this.validatePipeline()) {
        return;
      }

      // Reset all blocks status before starting
      this.resetBlocksStatus();

      const isAgentReady = await this.ensureAgentAvailable();
      if (!isAgentReady) {
        this.executionMode = 'simulated';
        this.runPipelineSimulated();
        return;
      }

      this.executionMode = 'agent';
      
      this.isRunning = true;
      this.pipelineStatus = 'running';
      this.$emit('pipeline-started', { totalBlocks: this.blocks.length, mode: 'agent' });
      
      // Execute blocks sequentially — each block gets cumulative code (all preceding blocks included)
      for (let i = 0; i < this.blocks.length; i++) {
        const block = this.blocks[i];
        const cumulativeCode = this.buildCumulativeCode(block);
        const result = await this.executeBlockWithAgent(block, cumulativeCode);
        this.$emit('block-executed', result);

        if (!result.success) {
          this.pipelineStatus = 'error';
          this.isRunning = false;
          this.$emit('pipeline-failed', { ...result, mode: 'agent' });
          return;
        }
      }
      
      this.pipelineStatus = 'success';
      this.isRunning = false;
      this.$emit('pipeline-completed', { totalBlocks: this.blocks.length, mode: 'agent' });
    },

    async ensureAgentAvailable() {
      if (this.agentAvailable === true) {
        return true;
      }

      try {
        await desktopAgentHealth();
        this.agentAvailable = true;
        return true;
      } catch (error) {
        this.agentAvailable = false;
        return false;
      }
    },

    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    getBlockPackageName(block) {
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

    buildFolderPathMapForBlock(blockId) {
      let folders = [];
      try {
        folders = JSON.parse(localStorage.getItem('mlsphere-folders') || '[]');
      } catch (error) {
        folders = [];
      }

      const byId = new Map();
      folders
        .filter(folder => folder && folder.blockId === blockId)
        .forEach(folder => byId.set(folder.id, folder));

      const pathMap = new Map();
      byId.forEach((folder, id) => {
        const parts = [];
        let cursor = folder;
        while (cursor) {
          parts.unshift(cursor.name);
          cursor = cursor.parent ? byId.get(cursor.parent) : null;
        }
        pathMap.set(id, parts.join('/'));
      });

      return pathMap;
    },

    buildBlockJobFiles(block) {
      const packageName = this.getBlockPackageName(block);
      const packageRoot = packageName.replace(/\./g, '/');
      const folderPathMap = this.buildFolderPathMapForBlock(block.id);

      let modules = [];
      try {
        modules = JSON.parse(localStorage.getItem('mlsphere-modules') || '[]');
      } catch (error) {
        modules = [];
      }

      let initMap = {};
      try {
        initMap = JSON.parse(localStorage.getItem('mlsphere-init-code-map') || '{}');
      } catch (error) {
        initMap = {};
      }

      const files = [
        {
          path: `${packageRoot}/__init__.py`,
          content: typeof initMap?.[block.id] === 'string' ? initMap[block.id] : ''
        }
      ];

      modules
        .filter(module => module && module.blockId === block.id)
        .forEach(module => {
          const folderPath = module.folder ? folderPathMap.get(module.folder) : '';
          const filePath = folderPath
            ? `${packageRoot}/${folderPath}/${module.name}`
            : `${packageRoot}/${module.name}`;

          files.push({
            path: filePath,
            content: typeof module.code === 'string' ? module.code : ''
          });
        });

      return files;
    },

    buildBlockExecutionCode(block) {
      const base = block.code || block.defaultCode || '';
      if (base && base.trim()) {
        return `${base}\n`;
      }
      return `print('No executable code for block: ${block.name || 'Unnamed'}')\n`;
    },

    // Combine all blocks from the start up to and including targetBlock into one script.
    // This allows variables defined in earlier blocks to be available in later ones,
    // mirroring the Jupyter notebook cell execution model.
    buildCumulativeCode(targetBlock) {
      const targetIdx = this.blocks.findIndex(
        b => b === targetBlock || b.instanceId === targetBlock.instanceId
      );
      if (targetIdx === -1) {
        return this.buildBlockExecutionCode(targetBlock);
      }
      const parts = [];
      for (let i = 0; i <= targetIdx; i++) {
        const b = this.blocks[i];
        const blockCode = (b.code || b.defaultCode || '').trim();
        if (blockCode) {
          parts.push(`# --- ${b.name || b.type || 'Block'} ---\n${blockCode}`);
        }
      }
      return parts.length > 0
        ? parts.join('\n\n') + '\n'
        : `print('No executable code up to block: ${targetBlock.name || 'Unnamed'}')\n`;
    },

    async executeBlockWithAgent(block, executionCode) {
      const start = Date.now();
      block.status = 'running';
      this.$emit('block-started', block);

      try {
        const payload = {
          projectId: this.currentProject?.id,
          entryFile: 'main.py',
          code: executionCode || this.buildBlockExecutionCode(block),
          files: this.buildBlockJobFiles(block),
          args: []
        };

        const submitResult = await submitPythonJob(payload);
        const jobId = submitResult?.job?.id;
        if (!jobId) {
          throw new Error('Agent did not return a job id');
        }

        let cursor = 0;
        let combinedOutput = '';
        let status = submitResult?.job?.status || 'queued';

        while (status === 'queued' || status === 'running') {
          const logResult = await getJobLogs(jobId, cursor);
          const logs = Array.isArray(logResult?.logs) ? logResult.logs : [];
          cursor = Number(logResult?.nextCursor ?? cursor);
          if (logs.length > 0) {
            combinedOutput += logs.map(item => item.message || '').join('');
            // Stream output to block in real-time
            block.output = combinedOutput;
          }

          const jobStatus = await getJobStatus(jobId);
          status = jobStatus?.job?.status || 'failed';

          if (status === 'queued' || status === 'running') {
            await this.delay(400);
          }
        }

        const executionTime = Date.now() - start;
        if (status === 'completed') {
          block.status = 'success';
          block.output = (combinedOutput || 'Execution completed successfully').trim();
          return { block, success: true, output: block.output, executionTime };
        }

        block.status = 'error';
        block.output = (combinedOutput || 'Execution failed').trim();
        return { block, success: false, output: block.output, executionTime };
      } catch (error) {
        block.status = 'error';
        return {
          block,
          success: false,
          output: `Agent execution error: ${error.message}`,
          executionTime: Date.now() - start
        };
      }
    },

    async runPipelineSimulated() {
      // Reset all blocks status before starting simulated run
      this.resetBlocksStatus();
      
      this.isRunning = true;
      this.pipelineStatus = 'running';
      this.$emit('pipeline-started', { totalBlocks: this.blocks.length, mode: 'simulated' });

      for (let i = 0; i < this.blocks.length; i++) {
        const block = this.blocks[i];
        block.status = 'running';
        this.$emit('block-started', block);

        const executionTime = Math.random() * 1000 + 1000;
        await this.delay(executionTime);

        // High success rate for simulated mode (95% success)
        const success = Math.random() > 0.05;

        if (success) {
          block.status = 'success';
          this.$emit('block-executed', {
            block,
            success: true,
            output: this.generateBlockOutput(block, true),
            executionTime
          });
        } else {
          block.status = 'error';
          const result = {
            block,
            success: false,
            output: this.generateBlockOutput(block, false),
            executionTime
          };
          this.$emit('block-executed', result);
          this.pipelineStatus = 'error';
          this.isRunning = false;
          this.$emit('pipeline-failed', result);
          return;
        }
      }

      this.pipelineStatus = 'success';
      this.isRunning = false;
      this.$emit('pipeline-completed', { totalBlocks: this.blocks.length, mode: 'simulated' });
    },
    
    getStatusText() {
      const statusTexts = {
        idle: '○ Ready',
        running: '⏳ Running Pipeline...',
        success: '✓ Pipeline Completed',
        error: '✗ Pipeline Failed'
      };
      return statusTexts[this.pipelineStatus] || '';
    },
    
    clearAll() {
      this.blocks = [];
      this.pipelineStatus = 'idle';
      this.executionMode = 'auto';
      this.isRunning = false;
      this.resetBlocksStatus();
    },

    getExecutionModeText() {
      if (this.executionMode === 'agent') {
        return '🖥 Agent';
      }
      if (this.executionMode === 'simulated') {
        return '🧪 Simulated';
      }
      return '⚙ Auto';
    },
    
    exportPipeline() {
      const pipeline = {
        blocks: this.blocks.map(block => ({
          id: block.id,
          name: block.name,
          code: block.code,
          packages: block.packages || [],
          instanceId: block.instanceId
        })),
        createdAt: new Date().toISOString()
      };
      
      const dataStr = JSON.stringify(pipeline, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `ml-pipeline-${Date.now()}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  }
};
</script>

<style scoped>
.pipeline-canvas {
  flex: 1;
  min-width: 0;
  background: linear-gradient(90deg, color-mix(in srgb, var(--border-color) 70%, transparent) 1px, transparent 1px),
              linear-gradient(color-mix(in srgb, var(--border-color) 70%, transparent) 1px, transparent 1px),
              var(--bg-primary);
  background-size: 20px 20px;
  overflow: auto;
  position: relative;
}

.canvas-empty-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: var(--text-muted);
  max-width: 500px;
}

.empty-icon {
  font-size: 80px;
  margin-bottom: 20px;
    font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif;
    line-height: 1;
}

.canvas-empty-state h3 {
  margin: 0 0 12px 0;
  color: var(--text-secondary);
  font-size: 20px;
}

.canvas-empty-state p {
  margin: 0;
  color: var(--text-muted);
  font-size: 14px;
}

.canvas-content {
  padding: 20px;
  width: 100%;
}

.blocks-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-content: flex-start;
}

@media (max-width: 900px) {
  .canvas-content {
    padding: 12px;
  }
}

@media (max-width: 640px) {
  .canvas-empty-state {
    max-width: 90%;
  }
}
</style>
