# MLSphere Codebase Map

## Directory Structure

```
mlsphere/
├── src/                         # Frontend Vue application
│   ├── main.js                  # Vue app bootstrap and initialization
│   ├── App.vue                  # Root component with routing and global state
│   │
│   ├── components/              # UI Components
│   │   ├── Dashboard.vue        # Project selection and creation interface
│   │   ├── PipelineCanvas.vue   # Visual pipeline builder (drag-drop blocks)
│   │   ├── CodeEditor.vue       # Single-block code editor modal
│   │   ├── CodeEditorWorkspace.vue  # Multi-file code workspace
│   │   ├── BlockLibrary.vue     # Sidebar with draggable blocks
│   │   ├── HelloWorld.vue       # Demo component (unused)
│   │   └── MLBlock.vue          # Individual block component
│   │
│   ├── blocks/                  # Block system architecture
│   │   ├── ARCHITECTURE.md      # Block system documentation
│   │   ├── index.ts             # Block exports
│   │   ├── bootstrap.ts         # Block initialization and registration
│   │   │
│   │   ├── core/                # Block infrastructure
│   │   │   ├── types.ts         # TypeScript type definitions
│   │   │   ├── defineBlock.ts   # Block creation factory
│   │   │   ├── discoverBlocks.ts  # Auto-discovery of blocks
│   │   │   └── registerBlocks.ts  # Block registration system
│   │   │
│   │   ├── AnalyticsBlock/      # Training metrics visualization
│   │   │   ├── block.config.ts  # Block metadata
│   │   │   ├── index.ts         # Block exports
│   │   │   └── components/
│   │   │       └── TrainingPanel.vue  # Metrics dashboard
│   │   │
│   │   ├── AuthBlock/           # User authentication (future)
│   │   │   ├── block.config.ts
│   │   │   ├── index.ts
│   │   │   └── packages/
│   │   │       ├── Permissions/
│   │   │       └── UserManagement/
│   │   │
│   │   └── EditorBlock/         # Code editing features (future)
│   │       ├── block.config.ts
│   │       ├── index.ts
│   │       └── packages/
│   │           └── CustomToolbar/
│   │
│   ├── services/                # API clients and utilities
│   │   ├── desktopAgentClient.js  # Agent HTTP API wrapper
│   │   │   # Functions:
│   │   │   # - desktopAgentHealth()
│   │   │   # - restartDesktopAgent()
│   │   │   # - submitPythonJob()
│   │   │   # - getJobStatus(), getJobLogs()
│   │   │   # - writeProjectFile(), linkProjectFolder()
│   │   │   # - getDesktopAgentDownloadUrl()
│   │   │
│   │   └── projectFileStore.js  # IndexedDB persistence layer
│   │       # Functions:
│   │       # - saveProjectFiles()
│   │       # - loadProjectFiles()
│   │       # - deleteProjectFiles()
│   │
│   ├── data/                    # Static configuration data
│   │   ├── block-catalog.templates.json  # Template→package mappings
│   │   └── blockTypes.js        # Block type definitions (legacy)
│   │
│   └── assets/                  # Static assets (images, styles)
│
├── desktop-agent/               # Local execution agent (Node.js)
│   └── server.js                # HTTP server + job executor
│       # Endpoints:
│       # GET  /health           - Health check
│       # POST /jobs             - Create job
│       # GET  /jobs/:id         - Job status
│       # GET  /jobs/:id/logs    - Job logs
│       # POST /jobs/:id/cancel  - Cancel job
│       # PUT  /projects/:id/file - Write project file
│       # GET  /projects/:id/file - Read project file
│       # POST /projects/:id/link - Link project folder
│       # GET  /projects/:id/link - Get folder link
│       # POST /control/restart  - Restart agent
│
├── scripts/                     # Build and utility scripts
│   └── serve-with-agent.js      # Auto-start agent + web server
│       # Functions:
│       # - isPortOpen()         - Check if port is available
│       # - spawnAgent()         - Start desktop agent
│       # - spawnWeb()           - Start Vue dev server
│
├── public/                      # Static public assets
│   └── index.html               # HTML entry point
│
├── release/                     # Production distribution
│   └── agent/                   # Packaged desktop agent
│       ├── README.md            - Agent user documentation
│       ├── mlsphere-agent-setup.exe    (future)
│       ├── mlsphere-agent-setup.dmg    (future)
│       └── mlsphere-agent-setup.deb    (future)
│
├── .llm-context/                # LLM documentation
│   ├── README.md                - Context folder overview
│   ├── PROJECT_OVERVIEW.md      - High-level project description
│   ├── ARCHITECTURE.md          - System architecture
│   ├── CODEBASE_MAP.md          - This file
│   ├── DESIGN_DECISIONS.md      - Technical decisions
│   ├── API_CONTRACTS.md         - Interface specs
│   └── DEVELOPMENT_GUIDE.md     - Extension guide
│
├── package.json                 # NPM dependencies and scripts
├── vue.config.js                # Vue CLI configuration
├── babel.config.js              # Babel transpiler config
├── jsconfig.json                # JavaScript/TypeScript config
├── .gitignore                   # Git ignore patterns
└── README.md                    # Project README

```

## Key File Responsibilities

### Frontend Core

#### `src/App.vue` (Main Application Shell)
**Responsibilities:**
- Application routing (dashboard, pipeline, code-editor, analytics views)
- Global state management (currentProject, desktopAgentState, localSyncState)
- Desktop agent connection management (health polling, restart)
- Toast notifications
- Modal management (help, home, catalog editor)
- Canvas ↔ project state synchronization

**Key Methods:**
- `handleProjectSelected()` - Load project into workspace
- `toggleView()` - Switch between pipeline and code editor
- `refreshDesktopAgentStatus()` - Poll agent health
- `syncCanvasBlocksToProject()` - Save canvas state
- `restoreCanvasBlocksFromProject()` - Load canvas state
- `runPipeline()` - Execute full pipeline

**Key State:**
```javascript
{
  currentView: 'dashboard' | 'pipeline' | 'code-editor' | 'analytics',
  currentProject: { id, name, type, blocks, config },
  desktopAgentState: 'online' | 'offline' | 'checking',
  localSyncState: 'linked' | 'unlinked' | 'checking' | 'error'
}
```

#### `src/components/Dashboard.vue` (Project Selector)
**Responsibilities:**
- Display project templates
- Recent projects list
- Create new projects from templates
- Import existing Python projects
- Folder selection and linking
- Catalog editor (package → block mapping)

**Key Methods:**
- `selectTemplate()` - Create project from template
- `loadFromPythonProject()` - Import existing folder
- `syncTemplateFilesToDisk()` - Generate initial project files
- `ensureProjectFolderLink()` - Link project to local folder

#### `src/components/PipelineCanvas.vue` (Visual Builder)
**Responsibilities:**
- Render blocks as visual nodes
- Drag-and-drop block management
- Pipeline execution
- Block status visualization (idle, running, success, error)
- Execute blocks sequentially or individually

**Key Methods:**
- `addBlock()` - Add block to canvas
- `runEntirePipeline()` - Execute all blocks in order
- `executeBlockWithAgent()` - Run single block via agent
- `getBlockPackageName()` - Resolve package from catalog

**Key State:**
```javascript
{
  blocks: [ /* block objects with status */ ],
  isRunning: boolean,
  pipelineStatus: 'idle' | 'running' | 'success' | 'error'
}
```

#### `src/components/CodeEditorWorkspace.vue` (Multi-File Editor)
**Responsibilities:**
- Display project file tree
- Multi-file code editing
- Auto-save to local filesystem via agent
- Module file path resolution
- Package structure navigation

**Key Methods:**
- `loadProjectFiles()` - Build file tree from project
- `saveBlockCodeFromWorkspace()` - Auto-save on edit
- `getModuleFilePathForSync()` - Compute canonical file paths
- `buildModuleTargetTail()` - Construct package/folder/file paths

### Backend (Desktop Agent)

#### `desktop-agent/server.js` (Execution Agent)
**Responsibilities:**
- HTTP API server (localhost:51751)
- Job queue management
- Python subprocess execution
- File operations (read/write project files)
- Project folder linking
- Health monitoring

**Key Endpoints:**
```javascript
GET  /health                - { ok, host, port, jobs }
POST /jobs                  - Create and execute job
GET  /jobs/:id              - Job status
GET  /jobs/:id/logs         - Stream logs
POST /jobs/:id/cancel       - Terminate job
PUT  /projects/:id/file     - Write file to linked folder
GET  /projects/:id/file     - Read file from linked folder
POST /projects/:id/link     - Link project to local path
GET  /projects/:id/link     - Get linked folder info
POST /control/restart       - Restart agent process
```

**Job Execution Flow:**
1. Receive POST /jobs with files or projectId
2. If projectId linked → use inline code execution
3. If files provided → write to job directory
4. Spawn Python subprocess
5. Stream stdout/stderr to logs
6. Store exit code and status

### Services & Utilities

#### `src/services/desktopAgentClient.js`
**Responsibilities:**
- HTTP client for desktop agent API
- Request timeout handling
- Error normalization
- Platform detection
- Download URL resolution

**Key Functions:**
```javascript
desktopAgentHealth()           // GET /health
submitPythonJob(payload)       // POST /jobs
getJobStatus(jobId)            // GET /jobs/:id
getJobLogs(jobId, since)       // GET /jobs/:id/logs
writeProjectFile(projectId, path, content)  // PUT /projects/:id/file
linkProjectFolder(projectId, path)  // POST /projects/:id/link
getDesktopAgentDownloadUrl()   // Platform-aware download URL
```

#### `src/services/projectFileStore.js`
**Responsibilities:**
- IndexedDB persistence for project files
- Store large file contents (code, datasets)
- Retrieve files for imported projects

**Key Functions:**
```javascript
saveProjectFiles(projectId, files)  // Save to IndexedDB
loadProjectFiles(projectId)         // Retrieve from IndexedDB
deleteProjectFiles(projectId)       // Clear project data
```

### Block System

#### `src/blocks/core/defineBlock.ts`
**Purpose:** Factory function for creating standardized block definitions

#### `src/blocks/core/discoverBlocks.ts`
**Purpose:** Auto-discovery of blocks in folders (future extensibility)

#### `src/blocks/core/registerBlocks.ts`
**Purpose:** Register blocks into global registry

#### `src/blocks/core/types.ts`
**Purpose:** TypeScript interfaces for blocks, packages, components

### Configuration & Data

#### `src/data/block-catalog.templates.json`
**Purpose:** Maps template names → package names for file generation

**Structure:**
```json
{
  "classification": [
    { "package": "classification_model", "blockName": "Model", "section": "Model" },
    { "package": "data_loader", "blockName": "Load Data", "section": "Data" }
  ]
}
```

#### Package Naming Resolution Flow:
1. User creates project from "Classification" template
2. System reads `block-catalog.templates.json["classification"]`
3. Assigns package names to blocks in `project.config.blockCatalog`
4. When syncing files: uses catalog to get canonical package name
5. When running: uses catalog to resolve import paths

### Scripts

#### `scripts/serve-with-agent.js`
**Purpose:** Unified development startup

**Flow:**
1. Check if port 51751 is open
2. If open, assume agent running
3. If closed, spawn `node desktop-agent/server.js`
4. Spawn Vue CLI dev server
5. Handle shutdown signals (SIGINT, SIGTERM)

## Data Flow Patterns

### Pattern 1: Project Creation
```
Dashboard.selectTemplate(template)
  ↓
Generate blocks with catalog package names
  ↓
Dashboard.ensureProjectFolderLink(project)
  ↓
User enters folder path
  ↓
linkProjectFolder(projectId, path) → Agent
  ↓
Agent stores mapping: projectId → local path
  ↓
Dashboard.syncTemplateFilesToDisk(project)
  ↓
For each block: writeProjectFile(projectId, path, content)
  ↓
Agent writes to linked folder: {localPath}/{package}/{file}.py
```

### Pattern 2: Pipeline Execution
```
User clicks "Run" in PipelineCanvas
  ↓
PipelineCanvas.runEntirePipeline()
  ↓
For each block in sequence:
  ↓
  executeBlockWithAgent(block)
    ↓
    Build job files list
      ↓
      Resolve package name via getBlockPackageName() (checks catalog)
      ↓
      submitPythonJob({ projectId, files, entryFile })
        ↓
        Agent: if projectId linked → inline execution
        Agent: if files → write to job dir
        ↓
        Spawn Python subprocess
        ↓
        Poll getJobStatus() and getJobLogs()
        ↓
        Update block.status (running → success | error)
```

### Pattern 3: Auto-Save Code Changes
```
User edits code in CodeEditorWorkspace
  ↓
Debounced auto-save triggers
  ↓
CodeEditorWorkspace.saveBlockCodeFromWorkspace(payload)
  ↓
App.saveBlockCodeFromWorkspace(payload)
  ↓
Update block.code in canvas blocks array
  ↓
(Optional) Write to disk via writeProjectFile()
```

## Import Hierarchy

### Visual Dependencies
```
App.vue
  ├─ Dashboard.vue
  ├─ PipelineCanvas.vue
  │   └─ MLBlock.vue
  ├─ CodeEditorWorkspace.vue
  │   └─ CodeEditor.vue
  ├─ BlockLibrary.vue
  └─ TrainingPanel.vue (async)
```

### Service Dependencies
```
Components
  ↓ import
desktopAgentClient.js
  ↓ HTTP fetch
desktop-agent/server.js
  ↓ child_process.spawn
Python Runtime
```

## State Management

### Global State (App.vue)
- Current project metadata and blocks
- View routing state
- Desktop agent connection status
- Local folder sync status
- Toast notifications

### Component State
- **PipelineCanvas**: blocks array, running status, pipeline status
- **Dashboard**: templates, recent projects, catalog editor
- **CodeEditorWorkspace**: file tree, open files, code content

### Persistent State
- **localStorage**: recent projects list, agent installed flag
- **IndexedDB**: imported project files (large content)
- **Agent Disk**: project links, job artifacts

## Build & Deploy

### Development
- `npm run serve` → Auto-starts agent + Vue dev server
- `npm run serve:web` → Vue dev server only (manual agent start)

### Production
- `npm run build` → Static dist/ folder (deployable to CDN)
- Agent: Separate installer package (future: Electron/pkg)

## Testing Considerations

- **Unit Tests**: Block logic, utility functions
- **Integration Tests**: Agent API endpoints
- **E2E Tests**: Full pipeline creation → execution → visualization
- **Manual Tests**: Agent reconnect, folder sync, GPU execution

## Performance Hotspots

- **File writes**: Debounced auto-save reduces API calls
- **Health polling**: 5-second interval (not user-initiated)
- **Job logs**: Incremental fetch with `since` parameter
- **IndexedDB**: Only for imported projects with large files

## Security Considerations

- **Agent**: Localhost-only binding (127.0.0.1)
- **File paths**: Agent validates and sandboxes operations
- **Job execution**: Isolated directories per job
- **CORS**: Not an issue (agent is localhost)

## Extension Points

### Adding a New Block Type
1. Create folder in `src/blocks/MyBlock/`
2. Add `block.config.ts` with metadata
3. Implement `index.ts` with block definition
4. Export from `src/blocks/index.ts`

### Adding a Template
1. Add entry to `src/data/block-catalog.templates.json`
2. Add template metadata to `Dashboard.vue` templates array
3. Define blocks and config in `getTemplateBlocks()` and `getTemplateConfig()`

### Adding Agent Endpoint
1. Add route handler in `desktop-agent/server.js`
2. Add client function in `src/services/desktopAgentClient.js`
3. Call from component as needed
