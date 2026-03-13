# MLSphere System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │          MLSphere Web App (Vue.js)                   │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │  │
│  │  │Dashboard │ │ Pipeline │ │   Code   │ │Analytics│ │  │
│  │  │          │ │  Canvas  │ │  Editor  │ │         │ │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTP (localhost:51751)
                            │
┌───────────────────────────▼──────────────────────────────────┐
│            User's Local Machine                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │     Desktop Agent (Node.js Server)                    │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │  │
│  │  │  HTTP API    │ │ Job Manager  │ │File Manager  │  │  │
│  │  │  (Express)   │ │              │ │              │  │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                  │
│                            │ child_process.spawn()            │
│                            ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Python Runtime                                │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │  │
│  │  │scikit-learn  │ │   PyTorch    │ │ TensorFlow   │  │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘  │  │
│  │           Training Jobs / Inference                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                  │
│                            │ File I/O                         │
│                            ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Local File System                             │  │
│  │  ~/mlsphere-projects/     ~/mlsphere-jobs/            │  │
│  │    project-123/              job-abc/                 │  │
│  │      classification_model/     main.py                │  │
│  │      data_loader/              output.log             │  │
│  │      requirements.txt          model.pkl              │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Web Application (Control Plane)

**Technology**: Vue 3, Vue CLI 5, ES6+

**Responsibilities**:
- User interface and interaction
- Pipeline visual design
- Code editing
- Project management
- Real-time status updates

**Key Components**:

#### App.vue (Root)
- Application shell and routing
- Global state orchestration
- Agent connection lifecycle
- View transitions

#### Dashboard.vue
- Project creation wizard
- Template selection
- Folder linking UI
- Recent projects

#### PipelineCanvas.vue
- Block drag-and-drop
- Pipeline execution orchestration
- Block status visualization
- Sequential job submission

#### CodeEditorWorkspace.vue
- File tree navigation
- Multi-tab code editing
- Auto-save with debouncing
- Syntax highlighting

#### BlockLibrary.vue
- Block search and filter
- Drag sources
- Category organization

#### TrainingPanel.vue
- Real-time metrics charts
- Training progress
- Epoch visualization
- Performance graphs

**State Management**:
```javascript
// App-level State
{
  currentProject: {
    id: number,
    name: string,
    type: 'classification' | 'regression' | ...,
    blocks: Block[],
    config: {
      blockCatalog: CatalogEntry[],
      pythonVersion: string,
      dependencies: string[]
    },
    linkedFolder: string | null
  },
  desktopAgentState: 'online' | 'offline' | 'checking',
  localSyncState: 'linked' | 'unlinked' | 'error'
}
```

### 2. Desktop Agent (Execution Plane)

**Technology**: Node.js v16+, HTTP server, child_process

**Responsibilities**:
- Job queue management
- Python process execution
- File system operations
- Project folder linking
- Log streaming

**Core Modules**:

#### HTTP Server
```javascript
const server = http.createServer((req, res) => {
  // Route handling
  if (req.url === '/health') handleHealth(req, res);
  if (req.url.startsWith('/jobs')) handleJobs(req, res);
  if (req.url.startsWith('/projects')) handleProjects(req, res);
});
```

#### Job Manager
```javascript
const jobs = new Map(); // jobId → JobState

function createJob(payload) {
  const job = {
    id: generateId(),
    status: 'queued',
    files: payload.files,
    entryFile: payload.entryFile,
    projectId: payload.projectId,
    createdAt: Date.now()
  };
  jobs.set(job.id, job);
  runJob(job.id);
  return job;
}

function runJob(jobId) {
  const job = jobs.get(jobId);
  
  if (job.projectId && projectLinks.has(job.projectId)) {
    // Inline execution for linked projects
    const linkedPath = projectLinks.get(job.projectId);
    const pythonCode = buildInlineCode(job);
    const proc = spawn('python', ['-c', pythonCode], { cwd: linkedPath });
  } else {
    // File-based execution
    const jobDir = writeJobFiles(job);
    const proc = spawn('python', [job.entryFile], { cwd: jobDir });
  }
  
  // Stream logs and monitor status
  proc.stdout.on('data', data => appendLog(jobId, data));
  proc.on('close', code => finalizeJob(jobId, code));
}
```

#### File Manager
```javascript
const projectLinks = new Map(); // projectId → localPath

function linkProjectFolder(projectId, localPath) {
  validatePath(localPath);
  ensureDirectory(localPath);
  projectLinks.set(projectId, localPath);
  fs.writeFileSync(projectLinksFile, JSON.stringify([...projectLinks]));
}

function writeProjectFile(projectId, relativePath, content) {
  const linkedPath = projectLinks.get(projectId);
  if (!linkedPath) throw new Error('Project not linked');
  
  const fullPath = path.join(linkedPath, relativePath);
  ensureDirectory(path.dirname(fullPath));
  fs.writeFileSync(fullPath, content, 'utf8');
}
```

**Agent API**:

```
GET  /health
Response: { ok: true, host: "127.0.0.1", port: 51751, jobs: 3 }

POST /jobs
Request: { projectId?, files: [ { path, content } ], entryFile }
Response: { id, status: "queued" }

GET  /jobs/:id
Response: { id, status: "running", exitCode: null, createdAt, startedAt }

GET  /jobs/:id/logs?since=0
Response: { logs: "output text...", length: 1234 }

POST /jobs/:id/cancel
Response: { success: true }

PUT  /projects/:id/file
Request: { path: "data_loader/loader.py", content: "import pandas..." }
Response: { success: true }

POST /projects/:id/link
Request: { localRootPath: "C:/Users/.../my-project" }
Response: { linked: true, localRootPath }

POST /control/restart
Response: { restarting: true }
```

### 3. Block System

**Architecture Pattern**: Plugin system with discovery and registration

```
Block Definition
  ↓
Block Registry (Map<string, BlockDefinition>)
  ↓
Block Library UI
  ↓
Pipeline Canvas (Block Instances)
  ↓
Code Generation
  ↓
File System (Python modules)
```

**Block Structure**:
```typescript
interface Block {
  id: string;              // Unique block type ID
  name: string;            // Display name
  category: string;        // Data, Model, Training, etc.
  icon: string;            // Emoji or icon
  config: Record<string, any>;  // Configuration schema
  packages: string[];      // Python package path (e.g., "classification_model")
  code: string;            // Python code template
  inputs: string[];        // Expected input variables
  outputs: string[];       // Output variables
}
```

**Block Lifecycle**:
1. **Definition** (`block.config.ts`): Metadata and structure
2. **Discovery** (`discoverBlocks.ts`): Auto-scan block folders
3. **Registration** (`registerBlocks.ts`): Add to global registry
4. **Instantiation**: User adds to canvas (gets unique instanceId)
5. **Customization**: User edits code in code editor
6. **Code Generation**: Convert block → Python file
7. **Execution**: Agent runs Python with imports
8. **Status Update**: Block shows running/success/error state

### 4. File Synchronization Architecture

**Problem**: Browser cannot write to filesystem directly
**Solution**: Agent acts as filesystem proxy

**Sync Flow**:

```
┌─────────────┐
│   Browser   │
│  Edit Code  │
└──────┬──────┘
       │ 1. User edits file
       ▼
┌─────────────────────┐
│ CodeEditorWorkspace │
│  Auto-save (500ms)  │
└──────┬───────────────┘
       │ 2. Debounced save
       ▼
┌──────────────────────────┐
│ desktopAgentClient.js    │
│ writeProjectFile(id,     │
│   path, content)         │
└──────┬────────────────────┘
       │ 3. PUT /projects/:id/file
       ▼
┌──────────────────────────┐
│  Desktop Agent           │
│  Resolve linked folder   │
└──────┬────────────────────┘
       │ 4. fs.writeFileSync()
       ▼
┌──────────────────────────┐
│  Local File System       │
│  ~/projects/my-ml-app/   │
│    classification_model/ │
│      model.py ← updated  │
└──────────────────────────┘
```

**Key Mechanisms**:
- **Project Linking**: One-time folder selection, stored in agent
- **Path Resolution**: Browser sends relative paths, agent resolves absolute
- **Canonical Naming**: Catalog maps blocks → package names consistently
- **Conflict Avoidance**: Single source of truth for package naming

### 5. Job Execution Architecture

**Two Execution Modes**:

#### Mode 1: Inline Execution (Linked Projects)
```python
# Agent constructs inline Python
python -c """
import sys
sys.path.insert(0, '/user/project/folder')

from classification_model.model import train
from data_loader.loader import load_data

data = load_data()
model = train(data)
"""
```

**Advantages**:
- No duplicate files
- Uses actual project files on disk
- Changes immediately reflected

#### Mode 2: Job Directory Execution (Non-linked or temporary)
```
agent/jobs/job-abc123/
  main.py
  classification_model/
    model.py
  data_loader/
    loader.py
```

**Advantages**:
- Isolated execution
- No cross-contamination
- Preserved artifacts

### 6. Training Analytics Architecture

**Real-time Metrics Flow**:

```
Python Training Script
  ↓ print(json.dumps({ "epoch": 1, "loss": 0.5 }))
Agent captures stdout
  ↓ Stores in job.logs
Browser polls GET /jobs/:id/logs?since=N
  ↓ Receives new log lines
TrainingPanel.vue
  ↓ Parses JSON metrics
  ↓ Updates chart data
Chart.js renders visualization
```

**Metrics Storage**:
- In-memory: Agent keeps recent logs in RAM
- Disk: Full logs written to `jobs/{id}/output.log`
- Persistence: Browser doesn't store metrics (fetches on-demand)

**Chart Types**:
- Line charts: Loss over epochs
- Bar charts: Accuracy comparison
- Confusion matrices: Classification results
- Learning curves: Training vs. validation

### 7. Security Architecture

**Threat Model**:
- Trust: User trusts their own machine
- Boundary: No external network access for agent
- Isolation: Jobs run in sandboxed directories

**Security Layers**:

1. **Network Binding**:
   ```javascript
   server.listen(51751, '127.0.0.1'); // Localhost only
   ```

2. **Path Validation**:
   ```javascript
   function validatePath(userPath) {
     const normalized = path.normalize(userPath);
     if (normalized.includes('..')) throw new Error('Invalid path');
     return normalized;
   }
   ```

3. **Job Isolation**:
   - Each job gets unique directory
   - No shared state between jobs
   - Process cleanup on termination

4. **File Permissions**:
   - Agent inherits user's OS permissions
   - Cannot access system files outside allowed paths
   - Respects folder permissions

**Future Security Enhancements**:
- Code sandboxing (Docker containers)
- Resource limits (CPU, memory, disk)
- Signed job payloads
- User authentication tokens

### 8. Error Handling Architecture

**Error Types & Strategies**:

#### Connection Errors
```javascript
// Browser
try {
  await desktopAgentHealth();
} catch (error) {
  desktopAgentState = 'offline';
  showToast('Agent offline. Click Start to reconnect');
}
```

#### Job Execution Errors
```javascript
// Agent
proc.on('close', (code) => {
  if (code !== 0) {
    job.status = 'failed';
    job.error = `Process exited with code ${code}`;
  }
});
```

#### File Sync Errors
```javascript
// Agent
try {
  fs.writeFileSync(fullPath, content);
} catch (error) {
  return { success: false, error: error.message };
}
```

**Error Recovery**:
- Auto-retry: Agent health polling retries every 5 seconds
- User-initiated: "Restart Agent" button in UI
- Fallback: Manual agent restart via terminal

### 9. Deployment Architecture

#### Development:
```
User Machine
├── npm run serve
│   ├── scripts/serve-with-agent.js
│   │   ├── Spawn: node desktop-agent/server.js
│   │   └── Spawn: vue-cli-service serve
│   ├── Agent: http://127.0.0.1:51751
│   └── Web: http://localhost:8080
```

#### Production (Current Vision):
```
                         CDN (Vercel/Netlify)
                              │
                              │ HTTPS
                              ▼
┌──────────────────────────────────────────┐
│  MLSphere Web App (Static)               │
│  https://mlsphere.app                    │
└──────────────────────────────────────────┘
                              │
                              │ Users visit
                              ▼
                      User's Browser
                              │
                              │ Downloads once
                              ▼
                      Desktop Agent Installer
                       (.exe / .dmg / .deb)
                              │
                              │ Installs
                              ▼
                      localhost:51751 (running)
                              │
                              │ Reconnects on browser reload
                              └─────────────────────┐
                                                    │
                    Browser ←─────HTTP───────┐     │
                                             │     │
                                     Agent remains local
```

**Installer Requirements** (Future):
- Bundle Node.js runtime
- Register protocol handler (`mlsphere-agent://start`)
- Create system service (auto-start on boot)
- Add to system tray
- Update mechanism

### 10. Scalability Considerations

**Current Limits**:
- Single-user (localhost only)
- Sequential pipeline execution (one block at a time)
- In-memory job logs (limited retention)
- No distributed execution

**Future Scaling**:
- Multi-user: Cloud backend + agent authentication
- Parallel execution: DAG-based scheduling
- Remote agents: K8s clusters, cloud VMs
- Persistent storage: Database for job history
- Load balancing: Multiple agent instances

### 11. Extension Architecture

**Plugin Points**:

1. **New Block Types**: 
   - Implement `defineBlock()` interface
   - Add to `src/blocks/` folder
   - Auto-discovered on build

2. **Custom Templates**:
   - Add entry to `block-catalog.templates.json`
   - Define block structure
   - Generate Python scaffolding

3. **Agent Endpoints**:
   - Add route handler in `desktop-agent/server.js`
   - Implement client wrapper in `desktopAgentClient.js`

4. **UI Themes**:
   - CSS variables in `App.vue`
   - Dark/light mode toggle (future)

## Technology Choices Rationale

### Why Vue 3?
- Lightweight, fast
- Great developer experience
- Good ecosystem (Vue CLI, Vite)
- Reactive state management

### Why Node.js for Agent?
- Cross-platform
- Easy HTTP server
- Good subprocess management
- Familiar to web developers

### Why Localhost Agent (Not Cloud)?
- Zero infrastructure cost
- Works offline
- Data privacy (no cloud storage)
- GPU access (user's hardware)
- No scaling limits (user provides compute)

### Why No Database?
- Simpler deployment (static frontend)
- localStorage for small data
- IndexedDB for large files
- Agent manages file system directly
