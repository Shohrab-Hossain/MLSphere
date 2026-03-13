# MLSphere - Project Overview

## What is MLSphere?

MLSphere is a **visual machine learning pipeline builder** that enables users to create, customize, and execute ML workflows through an intuitive browser-based interface while leveraging their own computational resources.

## Core Philosophy

**Control Plane (Browser) + Execution Plane (User Infrastructure)**

- Users design pipelines in a web app (Vue.js)
- Training executes on user's own machine/GPU via desktop agent
- Offloads GPU costs to users while providing SaaS experience
- Privacy-focused: data and models stay on user's hardware

## Target Users

1. **ML Engineers**: Who want rapid prototyping without infrastructure setup
2. **Data Scientists**: Who prefer visual workflows over pure scripting
3. **Students/Learners**: Who need an accessible ML experimentation platform
4. **Enterprises**: Who require data privacy and on-premise execution

## Key Features

### 1. Visual Pipeline Builder
- Drag-and-drop block-based interface
- Pre-built templates (Classification, Regression, Clustering, NLP, Time Series)
- Real-time pipeline validation
- Block customization with embedded code editor

### 2. Code Generation & Execution
- Automatic Python code generation from blocks
- Template-based project scaffolding
- Local file synchronization
- Desktop agent executes Python jobs on user hardware

### 3. Block System
- Modular architecture with standardized blocks
- Categories: Data, Processing, Feature, Model, Training, Evaluation, Visualization
- Package-to-block mapping via catalogs
- Extensible block library

### 4. Project Management
- Template projects with predefined structures
- Import existing Python projects
- Local folder synchronization
- Package catalog configuration

### 5. Training Analytics
- Real-time metrics visualization
- Training progress monitoring
- Performance charts and graphs
- Artifact management

## Technical Stack

### Frontend (Control Plane)
- **Framework**: Vue 3 (Composition API)
- **Build**: Vue CLI 5
- **Deployment**: Static hosting (Vercel/Netlify/CDN)
- **Storage**: Browser localStorage + IndexedDB

### Backend (Execution Plane)
- **Desktop Agent**: Node.js HTTP server (localhost:51751)
- **API**: RESTful endpoints for job management
- **Python Execution**: subprocess spawning with isolated environments
- **File Management**: Direct filesystem operations

### Development Tools
- **Auto-start**: Unified serve command (agent + web)
- **Health Monitoring**: 5-second polling
- **Hot Reload**: Vue dev server with fast refresh

## Project Structure

```
mlsphere/
├── src/                    # Vue frontend application
│   ├── App.vue            # Main app shell with routing
│   ├── components/        # UI components
│   │   ├── Dashboard.vue  # Project selector and templates
│   │   ├── PipelineCanvas.vue  # Visual pipeline builder
│   │   ├── CodeEditorWorkspace.vue  # Code editing interface
│   │   └── BlockLibrary.vue  # Draggable block list
│   ├── blocks/            # Block system implementation
│   │   ├── core/          # Block architecture (defineBlock, discoverBlocks)
│   │   ├── AnalyticsBlock/  # Training metrics visualization
│   │   └── [other blocks]/
│   ├── services/          # API clients and utilities
│   │   ├── desktopAgentClient.js  # Agent communication
│   │   └── projectFileStore.js    # IndexedDB persistence
│   └── data/              # Static data and templates
│       └── block-catalog.templates.json  # Template mappings
├── desktop-agent/         # Local execution agent
│   └── server.js          # HTTP API + job executor
├── scripts/               # Build and dev scripts
│   └── serve-with-agent.js  # Auto-start orchestration
├── release/               # Production packages
│   └── agent/             # Packaged desktop agent
└── .llm-context/          # LLM documentation (this folder)
```

## User Workflows

### Workflow 1: Quick Start with Template
1. User opens web app (hosted or local)
2. Selects a template (e.g., "Classification")
3. Specifies local folder for project files
4. System generates template files and syncs to disk
5. User customizes blocks in pipeline canvas
6. Clicks "Run" → agent executes on user's machine
7. Views real-time training metrics

### Workflow 2: Import Existing Project
1. User selects "Load from Local"
2. Chooses existing Python project folder
3. System scans files and suggests block mappings
4. User configures package-to-block catalog
5. Opens code editor to modify files
6. Executes pipeline using existing code

### Workflow 3: Build from Scratch
1. User creates blank project
2. Drags blocks from library to canvas
3. Edits each block's Python code
4. Arranges blocks in execution order
5. Runs and iterates

## Data Flow

### Project Creation → Execution
```
User Action (Browser)
    ↓
Vue App State Update
    ↓
Generate Python Files
    ↓
Desktop Agent PUT /projects/{id}/file
    ↓
Write to Linked Folder
    ↓
User Clicks "Run"
    ↓
POST /jobs (with project files or inline code)
    ↓
Agent Creates Job Directory
    ↓
Python subprocess.spawn()
    ↓
Stream logs/metrics back
    ↓
Vue App Updates UI
```

### File Synchronization
```
Browser Edit
    ↓
Auto-save Trigger (debounced)
    ↓
writeProjectFile(projectId, path, content)
    ↓
Agent Writes to Disk
    ↓
User's Folder Updated
```

## Key Design Decisions

### 1. BYO-Compute Model
**Why**: Offloads expensive GPU training costs, enables enterprise privacy, scales better

### 2. Localhost Agent (Not Cloud Backend)
**Why**: Avoids infra costs, faster iteration, works offline, data privacy

### 3. Template-Based Projects
**Why**: Reduces onboarding friction, demonstrates best practices, ensures structure

### 4. Package Catalog Mapping
**Why**: Bridges visual blocks ↔ Python packages, enables code import, reduces naming conflicts

### 5. No Database (localStorage + Files)
**Why**: Simpler deployment, no backend hosting, portable projects

## Current Deployment Model

**Development Mode**:
- Run `npm run serve` → auto-starts agent + web
- Agent at localhost:51751
- Web at localhost:8080/8081

**Production Vision**:
- Web app hosted on CDN (e.g., mlsphere.app)
- Users download agent installer (`.exe`, `.dmg`, `.AppImage`)
- Agent registers protocol handler (`mlsphere-agent://start`)
- Browser triggers agent launch
- Agent connects to user account/workspace (future: auth token)

## Future Enhancements

1. **Cloud Execution Option**: Managed GPU nodes for users without local GPUs
2. **Collaboration**: Share pipelines, version control integration
3. **Package Management**: Per-project virtual environments, dependency resolution
4. **Marketplace**: Community block library
5. **Remote Runners**: K8s clusters, cloud VMs
6. **Mobile Companion**: Monitor runs, view metrics (read-only)

## Technical Constraints

- **Browser Security**: No direct file system access (requires agent)
- **Python Dependencies**: User must install ML packages
- **GPU Setup**: User responsible for CUDA/drivers
- **Network**: Agent must be reachable at localhost

## Success Metrics

- **Time to First Run**: < 5 minutes from download
- **Agent Uptime**: > 99% when user machine is on
- **File Sync Latency**: < 1 second for code changes
- **Pipeline Execution**: No browser overhead vs. direct Python

## Glossary

- **Block**: A visual node representing a Python module/function
- **Pipeline**: A DAG (directed acyclic graph) of connected blocks
- **Canvas**: The visual workspace where users arrange blocks
- **Agent**: The localhost Node.js server that executes jobs
- **Project**: A collection of blocks + files + configuration
- **Template**: A predefined project structure with sample blocks
- **Catalog**: Mapping between package names and block display names
- **Job**: A single execution instance of a pipeline
- **Artifact**: Output files from a job (models, logs, plots)

## Version History

- **v1.0.0** (March 2026): Initial release
  - Visual pipeline builder
  - Desktop agent with local execution
  - Template projects
  - Real-time training analytics
  - Auto-start workflow
