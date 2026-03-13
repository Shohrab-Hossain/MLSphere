<template>
  <div class="training-panel">
    <div class="panel-header">
      <h3>📊 Training Analytics</h3>
      <button v-if="isTraining" @click="stopDemoTraining" class="stop-btn">
        ⏸ Stop
      </button>
    </div>
    
    <div v-if="!hasData" class="empty-state">
      <div class="empty-icon">📈</div>
      <p>Run your pipeline to see training analytics</p>
    </div>
    
    <div v-else class="metrics-container">
      <div v-if="trainingSessions.length > 0" class="session-history">
        <h4>Recent Training Runs</h4>
        <div class="session-list">
          <button
            v-for="session in trainingSessions"
            :key="session.timestamp"
            class="session-item"
            :class="{ active: activeSessionTimestamp === session.timestamp }"
            @click="loadSnapshot(session)"
          >
            <span class="session-time">{{ formatSessionTime(session.timestamp) }}</span>
            <span class="session-status" :class="session.status">{{ session.status }}</span>
          </button>
        </div>
      </div>

      <!-- Current Metrics -->
      <div class="current-metrics">
        <div class="metric-card">
          <div class="metric-label">Accuracy</div>
          <div class="metric-value" :style="{ color: getMetricColor(currentMetrics.accuracy) }">
            {{ formatMetric(currentMetrics.accuracy) }}%
          </div>
          <div class="metric-change" :class="getChangeClass(metricChanges.accuracy)">
            {{ formatChange(metricChanges.accuracy) }}
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Loss</div>
          <div class="metric-value" :style="{ color: getLossColor(currentMetrics.loss) }">
            {{ formatMetric(currentMetrics.loss, 4) }}
          </div>
          <div class="metric-change" :class="getChangeClass(-metricChanges.loss)">
            {{ formatChange(metricChanges.loss) }}
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Epoch</div>
          <div class="metric-value">
            {{ currentMetrics.epoch }} / {{ currentMetrics.totalEpochs }}
          </div>
          <div class="metric-progress">
            <div 
              class="progress-bar" 
              :style="{ width: (currentMetrics.epoch / currentMetrics.totalEpochs * 100) + '%' }"
            ></div>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Time Elapsed</div>
          <div class="metric-value time">
            {{ formatTime(elapsedTime) }}
          </div>
          <div class="metric-label small">
            ~{{ formatTime(estimatedTimeRemaining) }} remaining
          </div>
        </div>
      </div>
      
      <!-- Charts -->
      <div class="charts-container">
        <div class="chart-card">
          <h4>Accuracy Over Time</h4>
          <canvas ref="accuracyChart"></canvas>
        </div>
        
        <div class="chart-card">
          <h4>Loss Over Time</h4>
          <canvas ref="lossChart"></canvas>
        </div>
      </div>
      
      <!-- Confusion Matrix -->
      <div v-if="confusionMatrix" class="confusion-matrix-card">
        <h4>Confusion Matrix</h4>
        <div class="matrix-grid">
          <div 
            v-for="(value, index) in confusionMatrix.flat()" 
            :key="index"
            class="matrix-cell"
            :style="{ 
              backgroundColor: getHeatmapColor(value, Math.max(...confusionMatrix.flat()))
            }"
          >
            {{ value }}
          </div>
        </div>
      </div>
      
      <!-- Console Logs -->
      <div class="console-logs">
        <h4>Console Output</h4>
        <div class="log-container" ref="logContainer">
          <div 
            v-for="(log, index) in logs" 
            :key="index"
            class="log-entry"
            :class="log.type"
          >
            <span class="log-time">{{ log.time }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { markRaw } from 'vue';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

export default {
  name: 'TrainingPanel',
  props: {
    projectKey: {
      type: [String, Number],
      default: 'default-project'
    }
  },
  data() {
    return {
      hasData: false,
      isTraining: false,
      currentMetrics: {
        accuracy: 0,
        loss: 0,
        epoch: 0,
        totalEpochs: 50
      },
      metricChanges: {
        accuracy: 0,
        loss: 0
      },
      history: {
        accuracy: [],
        loss: [],
        valAccuracy: [],
        valLoss: []
      },
      confusionMatrix: null,
      logs: [],
      elapsedTime: 0,
      estimatedTimeRemaining: 0,
      accuracyChart: null,
      lossChart: null,
      updateInterval: null,
      trainingSessions: [],
      activeSessionTimestamp: null
    };
  },
  mounted() {
    this.restoreLatestSnapshot();
  },
  watch: {
    projectKey() {
      this.restoreLatestSnapshot();
    }
  },
  beforeUnmount() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.accuracyChart) {
      this.accuracyChart.destroy();
    }
    if (this.lossChart) {
      this.lossChart.destroy();
    }
  },
  methods: {
    initCharts() {
      try {
        // Check if refs exist before initializing
        if (!this.$refs.accuracyChart || !this.$refs.lossChart) {
          return;
        }

        // Destroy existing charts if they exist
        if (this.accuracyChart) {
          this.accuracyChart.destroy();
          this.accuracyChart = null;
        }
        if (this.lossChart) {
          this.lossChart.destroy();
          this.lossChart = null;
        }

        // Accuracy Chart
        const accCtx = this.$refs.accuracyChart.getContext('2d');
        if (!accCtx) {
          console.warn('Failed to get accuracy chart context');
          return;
        }

        // Use markRaw to prevent Vue from making Chart.js instance reactive
        this.accuracyChart = markRaw(new Chart(accCtx, {
          type: 'line',
          data: {
            labels: [],
            datasets: [
              {
                label: 'Training Accuracy',
                data: [],
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.4,
                fill: true
              },
              {
                label: 'Validation Accuracy',
                data: [],
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                tension: 0.4,
                fill: true
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top'
              },
              tooltip: {
                enabled: true
              }
            },
            scales: {
              y: {
                min: 0,
                max: 100,
                ticks: {
                  callback: (value) => value + '%'
                }
              }
            }
          }
        }));
        
        // Loss Chart
        const lossCtx = this.$refs.lossChart.getContext('2d');
        if (!lossCtx) {
          console.warn('Failed to get loss chart context');
          return;
        }

        // Use markRaw to prevent Vue from making Chart.js instance reactive
        this.lossChart = markRaw(new Chart(lossCtx, {
          type: 'line',
          data: {
            labels: [],
            datasets: [
              {
                label: 'Training Loss',
                data: [],
                borderColor: '#F44336',
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                tension: 0.4,
                fill: true
              },
              {
                label: 'Validation Loss',
                data: [],
                borderColor: '#FF9800',
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                tension: 0.4,
                fill: true
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top'
              },
              tooltip: {
                enabled: true
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: (value) => value.toFixed(2)
                }
              }
            }
          }
        }));
      } catch (error) {
        console.error('Error initializing charts:', error);
      }
    },
    
    addLog(type, message) {
      const time = new Date().toLocaleTimeString();
      this.logs.push({ type, message, time });
      this.$nextTick(() => {
        if (this.$refs.logContainer) {
          this.$refs.logContainer.scrollTop = this.$refs.logContainer.scrollHeight;
        }
      });
    },
    
    startPipeline(totalBlocks) {
      // Stop any existing training animation
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
      
      // Reset all state for a fresh pipeline run
      this.hasData = true;
      this.isTraining = false;
      this.logs = [];
      this.currentMetrics = {
        accuracy: 0,
        loss: 0,
        epoch: 0,
        totalEpochs: 50
      };
      this.metricChanges = {
        accuracy: 0,
        loss: 0
      };
      this.history = {
        accuracy: [],
        loss: [],
        valAccuracy: [],
        valLoss: []
      };
      this.confusionMatrix = null;
      this.elapsedTime = 0;
      this.estimatedTimeRemaining = 0;
      
      this.addLog('info', `Starting pipeline execution with ${totalBlocks} blocks...`);
      
      // Initialize charts after hasData is true and DOM has updated
      this.$nextTick(() => {
        this.initCharts();
      });
    },
    
    blockStarted(block) {
      this.addLog('info', `[${block.icon} ${block.name}] Starting execution...`);
    },
    
    blockExecuted(result) {
      const { block, success, output, executionTime } = result;
      const timeStr = (executionTime / 1000).toFixed(2);
      
      if (success) {
        this.addLog('success', `[${block.icon} ${block.name}] Completed in ${timeStr}s`);
        // Log each line of output
        output.split('\n').forEach(line => {
          if (line.trim()) {
            this.addLog('info', `  ${line}`);
          }
        });
      } else {
        this.addLog('error', `[${block.icon} ${block.name}] Failed after ${timeStr}s`);
        this.addLog('error', `  ${output}`);
      }
    },
    
    pipelineCompleted(data) {
      this.addLog('success', `Pipeline completed successfully! Executed ${data.totalBlocks} blocks.`);
      // Start demo training animation for visualization
      if (!this.isTraining) {
        this.startDemoTraining();
      }
    },
    
    pipelineFailed(result) {
      this.addLog('error', `Pipeline failed at block: ${result.block.name}`);
      this.persistSnapshot('failed');
    },
    
    startDemoTraining() {
      this.hasData = true;
      this.isTraining = true;
      let epoch = 0;
      const totalEpochs = 30;
      this.currentMetrics.totalEpochs = totalEpochs;
      
      this.addLog('info', 'Starting model training visualization...');
      
      // Initialize charts after hasData is set and DOM is updated
      this.$nextTick(() => {
        this.initCharts();
        
        this.updateInterval = setInterval(() => {
          if (epoch >= totalEpochs) {
            this.stopDemoTraining(false);
            return;
          }
          
          epoch++;
          const oldAccuracy = this.currentMetrics.accuracy;
          const oldLoss = this.currentMetrics.loss;
          
          // Simulate improving metrics
          this.currentMetrics.epoch = epoch;
          this.currentMetrics.accuracy = Math.min(98, 50 + epoch * 1.2 + Math.random() * 3);
          this.currentMetrics.loss = Math.max(0.05, 2 - epoch * 0.05 + Math.random() * 0.08);
          
          this.metricChanges.accuracy = this.currentMetrics.accuracy - oldAccuracy;
          this.metricChanges.loss = this.currentMetrics.loss - oldLoss;
          
          this.elapsedTime += 1000;
          this.estimatedTimeRemaining = (totalEpochs - epoch) * 1000;
          
          // Update history
          this.history.accuracy.push(this.currentMetrics.accuracy);
          this.history.loss.push(this.currentMetrics.loss);
          this.history.valAccuracy.push(this.currentMetrics.accuracy - Math.random() * 5);
          this.history.valLoss.push(this.currentMetrics.loss + Math.random() * 0.1);
          
          // Update charts
          if (this.accuracyChart && this.lossChart) {
            // Convert reactive values to plain numbers to avoid Chart.js recursion
            const accuracy = Number(this.currentMetrics.accuracy);
            const loss = Number(this.currentMetrics.loss);
            const valAccuracy = Number(accuracy - Math.random() * 5);
            const valLoss = Number(loss + Math.random() * 0.1);
            
            this.accuracyChart.data.labels.push(epoch);
            this.accuracyChart.data.datasets[0].data.push(accuracy);
            this.accuracyChart.data.datasets[1].data.push(valAccuracy);
            this.accuracyChart.update('none'); // Use 'none' mode for better performance
            
            this.lossChart.data.labels.push(epoch);
            this.lossChart.data.datasets[0].data.push(loss);
            this.lossChart.data.datasets[1].data.push(valLoss);
            this.lossChart.update('none'); // Use 'none' mode for better performance
          }
          
          // Add log every 5 epochs
          if (epoch % 5 === 0) {
            this.addLog('info', `Epoch ${epoch}/${totalEpochs} - Accuracy: ${this.formatMetric(this.currentMetrics.accuracy)}% - Loss: ${this.formatMetric(this.currentMetrics.loss, 4)}`);
          }
          
          if (epoch === totalEpochs) {
            this.confusionMatrix = [[85, 5], [3, 92]];
            this.addLog('success', 'Training visualization completed!');
          }
        }, 400);
      });
    },
    
    stopDemoTraining(isUserInitiated = true) {
      this.isTraining = false;
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
      if (isUserInitiated) {
        this.addLog('warning', 'Training visualization stopped by user');
        this.persistSnapshot('stopped');
      } else {
        this.addLog('success', 'Training visualization completed');
        this.persistSnapshot('completed');
      }
    },

    getStorageKey() {
      return `mlsphere-training-sessions-${String(this.projectKey || 'default-project')}`;
    },

    getSerializableState() {
      return {
        hasData: this.hasData,
        currentMetrics: JSON.parse(JSON.stringify(this.currentMetrics)),
        metricChanges: JSON.parse(JSON.stringify(this.metricChanges)),
        history: JSON.parse(JSON.stringify(this.history)),
        confusionMatrix: JSON.parse(JSON.stringify(this.confusionMatrix)),
        logs: JSON.parse(JSON.stringify(this.logs)),
        elapsedTime: Number(this.elapsedTime || 0),
        estimatedTimeRemaining: Number(this.estimatedTimeRemaining || 0)
      };
    },

    persistSnapshot(status = 'completed') {
      if (!this.hasData) {
        return;
      }

      let existingSessions = [];
      try {
        existingSessions = JSON.parse(localStorage.getItem(this.getStorageKey()) || '[]');
      } catch (error) {
        existingSessions = [];
      }

      const session = {
        timestamp: new Date().toISOString(),
        status,
        snapshot: this.getSerializableState()
      };

      const nextSessions = [session, ...existingSessions].slice(0, 20);
      localStorage.setItem(this.getStorageKey(), JSON.stringify(nextSessions));
      this.trainingSessions = nextSessions;
      this.activeSessionTimestamp = session.timestamp;
    },

    restoreLatestSnapshot() {
      let storedSessions = [];
      try {
        storedSessions = JSON.parse(localStorage.getItem(this.getStorageKey()) || '[]');
      } catch (error) {
        storedSessions = [];
      }

      this.trainingSessions = Array.isArray(storedSessions) ? storedSessions : [];
      if (this.trainingSessions.length === 0) {
        return;
      }

      this.loadSnapshot(this.trainingSessions[0]);
    },

    loadSnapshot(session) {
      if (!session || !session.snapshot) {
        return;
      }

      const snapshot = session.snapshot;
      this.hasData = !!snapshot.hasData;
      this.currentMetrics = {
        accuracy: Number(snapshot?.currentMetrics?.accuracy || 0),
        loss: Number(snapshot?.currentMetrics?.loss || 0),
        epoch: Number(snapshot?.currentMetrics?.epoch || 0),
        totalEpochs: Number(snapshot?.currentMetrics?.totalEpochs || 50)
      };
      this.metricChanges = {
        accuracy: Number(snapshot?.metricChanges?.accuracy || 0),
        loss: Number(snapshot?.metricChanges?.loss || 0)
      };
      this.history = {
        accuracy: Array.isArray(snapshot?.history?.accuracy) ? snapshot.history.accuracy.map(Number) : [],
        loss: Array.isArray(snapshot?.history?.loss) ? snapshot.history.loss.map(Number) : [],
        valAccuracy: Array.isArray(snapshot?.history?.valAccuracy) ? snapshot.history.valAccuracy.map(Number) : [],
        valLoss: Array.isArray(snapshot?.history?.valLoss) ? snapshot.history.valLoss.map(Number) : []
      };
      this.confusionMatrix = Array.isArray(snapshot?.confusionMatrix)
        ? JSON.parse(JSON.stringify(snapshot.confusionMatrix))
        : null;
      this.logs = Array.isArray(snapshot?.logs) ? JSON.parse(JSON.stringify(snapshot.logs)) : [];
      this.elapsedTime = Number(snapshot?.elapsedTime || 0);
      this.estimatedTimeRemaining = Number(snapshot?.estimatedTimeRemaining || 0);
      this.activeSessionTimestamp = session.timestamp;
      this.isTraining = false;

      this.$nextTick(() => {
        this.initCharts();
        if (this.accuracyChart && this.lossChart) {
          const labels = this.history.accuracy.map((_, index) => index + 1);

          this.accuracyChart.data.labels = [...labels];
          this.accuracyChart.data.datasets[0].data = [...this.history.accuracy];
          this.accuracyChart.data.datasets[1].data = [...this.history.valAccuracy];
          this.accuracyChart.update('none');

          this.lossChart.data.labels = [...labels];
          this.lossChart.data.datasets[0].data = [...this.history.loss];
          this.lossChart.data.datasets[1].data = [...this.history.valLoss];
          this.lossChart.update('none');
        }
      });
    },

    formatSessionTime(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleString();
    },
    
    formatMetric(value, decimals = 2) {
      return value ? value.toFixed(decimals) : '0.00';
    },
    
    formatChange(value) {
      if (!value || Math.abs(value) < 0.01) return '';
      return (value > 0 ? '+' : '') + value.toFixed(2);
    },
    
    formatTime(ms) {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
      } else {
        return `${seconds}s`;
      }
    },
    
    getMetricColor(value) {
      if (value >= 90) return '#4CAF50';
      if (value >= 70) return '#FF9800';
      return '#F44336';
    },
    
    getLossColor(value) {
      if (value <= 0.3) return '#4CAF50';
      if (value <= 0.7) return '#FF9800';
      return '#F44336';
    },
    
    getChangeClass(value) {
      if (value > 0) return 'positive';
      if (value < 0) return 'negative';
      return '';
    },
    
    getHeatmapColor(value, max) {
      const intensity = value / max;
      return `rgba(33, 150, 243, ${intensity})`;
    }
  }
};
</script>

<style scoped>
.training-panel {
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  height: 100vh;
  overflow-y: auto;
  width: 400px;
}

.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-elevated);
  position: sticky;
  top: 0;
  z-index: 10;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}

.stop-btn {
  padding: 6px 12px;
  background: #d14352;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
}

.stop-btn:hover {
  background: #be3343;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.metrics-container {
  padding: 20px;
}

.session-history {
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 16px;
}

.session-history h4 {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 160px;
  overflow-y: auto;
}

.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 12px;
}

.session-item:hover {
  border-color: var(--border-strong);
}

.session-item.active {
  border-color: var(--header-start);
  background: color-mix(in srgb, var(--header-start) 12%, var(--bg-secondary));
}

.session-time {
  color: var(--text-secondary);
  text-align: left;
}

.session-status {
  text-transform: uppercase;
  font-weight: 700;
  font-size: 10px;
}

.session-status.completed {
  color: #4CAF50;
}

.session-status.failed,
.session-status.stopped {
  color: #F44336;
}

.current-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 24px;
}

.metric-card {
  background: var(--bg-elevated);
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
}

.metric-label {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.metric-label.small {
  font-size: 10px;
  margin-top: 4px;
  margin-bottom: 0;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.metric-value.time {
  font-size: 20px;
}

.metric-change {
  font-size: 12px;
  font-weight: 600;
  margin-top: 4px;
}

.metric-change.positive {
  color: #4CAF50;
}

.metric-change.negative {
  color: #F44336;
}

.metric-progress {
  margin-top: 8px;
  height: 4px;
  background: var(--border-color);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #2196F3);
  transition: width 0.3s ease;
}

.charts-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 24px;
}

.chart-card {
  background: var(--bg-elevated);
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.chart-card h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.chart-card canvas {
  height: 200px !important;
}

.confusion-matrix-card {
  background: var(--bg-elevated);
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  margin-bottom: 24px;
}

.confusion-matrix-card h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.matrix-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
}

.matrix-cell {
  padding: 20px;
  text-align: center;
  font-weight: 700;
  font-size: 18px;
  color: white;
  border-radius: 4px;
}

.console-logs {
  background: color-mix(in srgb, var(--bg-elevated) 50%, #111111);
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.console-logs h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #c9d4e3;
}

.log-container {
  max-height: 200px;
  overflow-y: auto;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
}

.log-entry {
  padding: 4px 0;
  color: #c9d4e3;
  display: flex;
  gap: 8px;
}

.log-entry.info {
  color: #61afef;
}

.log-entry.success {
  color: #98c379;
}

.log-entry.warning {
  color: #e5c07b;
}

.log-entry.error {
  color: #e06c75;
}

.log-time {
  color: #89a0bf;
  flex-shrink: 0;
}
</style>
