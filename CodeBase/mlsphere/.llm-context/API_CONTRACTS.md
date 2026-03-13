# MLSphere API Contracts

Complete API specification for all interfaces in the MLSphere system.

---

## Desktop Agent HTTP API

Base URL: `http://127.0.0.1:51751`

All responses use JSON format with CORS enabled.

### Common Headers

```
Content-Type: application/json
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

---

### Health Check

**Endpoint**: `GET /health`

**Description**: Check if agent is running and responsive.

**Request**: No body

**Response**:
```json
{
  "ok": true,
  "host": "127.0.0.1",
  "port": 51751,
  "version": "1.0.0",
  "jobs": 3,
  "uptime": 3600,
  "pythonVersion": "3.9.7",
  "nodeVersion": "16.13.0"
}
```

**Status Codes**:
- `200 OK`: Agent healthy
- `500 Internal Server Error`: Agent error

**Example**:
```javascript
const response = await fetch('http://127.0.0.1:51751/health');
const health = await response.json();
console.log('Agent status:', health.ok);
```

---

### Create Job

**Endpoint**: `POST /jobs`

**Description**: Submit Python code for execution.

**Request Body**:
```json
{
  "projectId": 123,
  "files": [
    {
      "path": "main.py",
      "content": "print('Hello')"
    },
    {
      "path": "utils/helper.py",
      "content": "def helper(): return 42"
    }
  ],
  "entryFile": "main.py",
  "workingDir": null
}
```

**Fields**:
- `projectId` (number, optional): Project ID for linked folder execution
- `files` (array, required): Array of file objects
  - `path` (string): Relative file path
  - `content` (string): File contents
- `entryFile` (string, required): Entry point to execute (e.g., `main.py`)
- `workingDir` (string, optional): Custom working directory

**Response**:
```json
{
  "id": "job-abc123",
  "status": "queued",
  "createdAt": 1678901234000,
  "projectId": 123
}
```

**Status Codes**:
- `201 Created`: Job submitted successfully
- `400 Bad Request`: Invalid payload (missing fields, empty files)
- `500 Internal Server Error`: Server error

**Example**:
```javascript
const job = await fetch('http://127.0.0.1:51751/jobs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    files: [{ path: 'main.py', content: 'import numpy\nprint(numpy.__version__)' }],
    entryFile: 'main.py'
  })
});
const { id } = await job.json();
```

---

### Get Job Status

**Endpoint**: `GET /jobs/:id`

**Description**: Retrieve job execution status.

**Parameters**:
- `id` (path): Job ID (e.g., `job-abc123`)

**Response**:
```json
{
  "id": "job-abc123",
  "status": "running",
  "createdAt": 1678901234000,
  "startedAt": 1678901235000,
  "finishedAt": null,
  "exitCode": null,
  "error": null,
  "projectId": 123
}
```

**Fields**:
- `status` (string): `queued` | `running` | `completed` | `failed` | `cancelled`
- `createdAt` (number): Unix timestamp (ms)
- `startedAt` (number): Unix timestamp when execution began
- `finishedAt` (number): Unix timestamp when execution ended
- `exitCode` (number): Process exit code (0 = success, non-zero = error)
- `error` (string): Error message if failed

**Status Codes**:
- `200 OK`: Job found
- `404 Not Found`: Job ID doesn't exist

**Example**:
```javascript
const response = await fetch(`http://127.0.0.1:51751/jobs/${jobId}`);
const job = await response.json();
if (job.status === 'completed' && job.exitCode === 0) {
  console.log('Job succeeded');
}
```

---

### Get Job Logs

**Endpoint**: `GET /jobs/:id/logs?since=N`

**Description**: Retrieve job output logs (stdout + stderr).

**Parameters**:
- `id` (path): Job ID
- `since` (query, optional): Byte offset to start reading from (default: 0)

**Response**:
```json
{
  "logs": "Installing dependencies...\nTraining epoch 1/10\nLoss: 0.523\n",
  "length": 67,
  "complete": false
}
```

**Fields**:
- `logs` (string): Log content from `since` position
- `length` (number): Number of bytes returned
- `complete` (boolean): Whether job has finished

**Status Codes**:
- `200 OK`: Logs retrieved
- `404 Not Found`: Job doesn't exist

**Polling Pattern**:
```javascript
let lastPosition = 0;
const pollLogs = async () => {
  const response = await fetch(
    `http://127.0.0.1:51751/jobs/${jobId}/logs?since=${lastPosition}`
  );
  const { logs, length, complete } = await response.json();
  
  if (length > 0) {
    console.log('New output:', logs);
    lastPosition += length;
  }
  
  if (!complete) {
    setTimeout(pollLogs, 1000); // Poll every second
  }
};
pollLogs();
```

---

### Cancel Job

**Endpoint**: `POST /jobs/:id/cancel`

**Description**: Terminate running job.

**Parameters**:
- `id` (path): Job ID

**Request**: No body

**Response**:
```json
{
  "success": true,
  "message": "Job cancelled"
}
```

**Status Codes**:
- `200 OK`: Job cancelled
- `404 Not Found`: Job doesn't exist
- `400 Bad Request`: Job already finished

**Example**:
```javascript
await fetch(`http://127.0.0.1:51751/jobs/${jobId}/cancel`, {
  method: 'POST'
});
```

---

### Write Project File

**Endpoint**: `PUT /projects/:id/file`

**Description**: Write file to linked project folder.

**Parameters**:
- `id` (path): Project ID

**Request Body**:
```json
{
  "path": "classification_model/model.py",
  "content": "import torch\n\nclass Model(torch.nn.Module):\n    pass"
}
```

**Fields**:
- `path` (string): Relative file path within project
- `content` (string): File contents (UTF-8 text)

**Response**:
```json
{
  "success": true,
  "absolutePath": "C:/Users/john/Projects/my-ml-project/classification_model/model.py"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Project not linked"
}
```

**Status Codes**:
- `200 OK`: File written
- `400 Bad Request`: Project not linked or invalid path
- `500 Internal Server Error`: File system error

**Example**:
```javascript
await fetch(`http://127.0.0.1:51751/projects/123/file`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    path: 'data_loader/loader.py',
    content: 'import pandas as pd\n\ndef load():\n    return pd.read_csv("data.csv")'
  })
});
```

---

### Link Project Folder

**Endpoint**: `POST /projects/:id/link`

**Description**: Associate project with local folder path.

**Parameters**:
- `id` (path): Project ID

**Request Body**:
```json
{
  "localRootPath": "C:/Users/john/Projects/my-ml-project"
}
```

**Response**:
```json
{
  "linked": true,
  "localRootPath": "C:/Users/john/Projects/my-ml-project",
  "exists": true
}
```

**Error Response**:
```json
{
  "linked": false,
  "error": "Path does not exist"
}
```

**Status Codes**:
- `200 OK`: Project linked
- `400 Bad Request`: Invalid path (doesn't exist, permission denied)

**Example**:
```javascript
await fetch(`http://127.0.0.1:51751/projects/123/link`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    localRootPath: 'C:\\Users\\john\\ml-projects\\classification'
  })
});
```

---

### Unlink Project Folder

**Endpoint**: `DELETE /projects/:id/link`

**Description**: Remove project folder association.

**Parameters**:
- `id` (path): Project ID

**Response**:
```json
{
  "success": true
}
```

**Status Codes**:
- `200 OK`: Project unlinked
- `404 Not Found`: Project not linked

---

### Get Project Link Status

**Endpoint**: `GET /projects/:id/link`

**Description**: Check if project is linked to local folder.

**Response**:
```json
{
  "linked": true,
  "localRootPath": "C:/Users/john/Projects/my-ml-project"
}
```

**Status Codes**:
- `200 OK`: Status retrieved

---

### List All Jobs

**Endpoint**: `GET /jobs`

**Description**: List all jobs (active + recent history).

**Query Parameters**:
- `status` (optional): Filter by status (`running`, `completed`, `failed`)
- `limit` (optional): Max results (default: 50)

**Response**:
```json
{
  "jobs": [
    {
      "id": "job-abc123",
      "status": "running",
      "createdAt": 1678901234000,
      "projectId": 123
    },
    {
      "id": "job-def456",
      "status": "completed",
      "createdAt": 1678900000000,
      "exitCode": 0
    }
  ],
  "total": 2
}
```

**Status Codes**:
- `200 OK`: List retrieved

---

### Restart Agent

**Endpoint**: `POST /control/restart`

**Description**: Gracefully restart agent process.

**Response**:
```json
{
  "restarting": true,
  "message": "Agent will restart in 2 seconds"
}
```

**Status Codes**:
- `200 OK`: Restart initiated

**Note**: Agent will close all connections and restart. Browser should poll `/health` to detect when agent is back online.

---

## Browser ↔ Agent Client Interface

JavaScript client wrapper for agent API.

**File**: `src/services/desktopAgentClient.js`

### Health Check

```javascript
import { desktopAgentHealth } from '@/services/desktopAgentClient';

const isOnline = await desktopAgentHealth();
// Returns: true if agent responding, false otherwise
```

### Submit Job

```javascript
import { createAgentJob } from '@/services/desktopAgentClient';

const job = await createAgentJob({
  projectId: 123,
  files: [
    { path: 'main.py', content: 'print("Hello")' }
  ],
  entryFile: 'main.py'
});
// Returns: { id: 'job-abc', status: 'queued', ... }
```

### Poll Job Status

```javascript
import { getJobStatus } from '@/services/desktopAgentClient';

const job = await getJobStatus('job-abc123');
// Returns: { id, status, exitCode, ... }
```

### Stream Job Logs

```javascript
import { streamJobLogs } from '@/services/desktopAgentClient';

await streamJobLogs('job-abc123', (newLogs) => {
  console.log('New output:', newLogs);
});
// Callback invoked with new log chunks until job completes
```

### Write Project File

```javascript
import { writeProjectFile } from '@/services/desktopAgentClient';

await writeProjectFile(123, 'model.py', 'import torch...');
// Returns: void (throws on error)
```

### Link Project

```javascript
import { linkProjectFolder } from '@/services/desktopAgentClient';

await linkProjectFolder(123, 'C:\\Users\\john\\my-project');
// Returns: { linked: true, localRootPath: '...' }
```

---

## Block System Interface

### Block Definition Schema

```typescript
interface BlockDefinition {
  id: string;                    // Unique identifier (e.g., 'data_loader')
  name: string;                  // Display name (e.g., 'Data Loader')
  category: string;              // Category (e.g., 'Data', 'Model', 'Training')
  icon: string;                  // Emoji or icon string
  description: string;           // Help text
  
  config: {                      // Configuration schema
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'select' | 'file';
      default: any;
      label: string;
      options?: any[];           // For 'select' type
      min?: number;              // For 'number' type
      max?: number;
      placeholder?: string;
    }
  };
  
  inputs: string[];              // Input variable names
  outputs: string[];             // Output variable names
  
  packages: string[];            // Python package paths
  dependencies: string[];        // PyPI package specs
  
  code: string;                  // Python code template
}
```

### Block Registration

```typescript
import { registerBlock } from '@/blocks/core/registerBlocks';

registerBlock(blockDefinition);
// Adds block to global registry
```

### Block Retrieval

```typescript
import { getBlock, getAllBlocks } from '@/blocks/core/registerBlocks';

const block = getBlock('data_loader');
// Returns: BlockDefinition | undefined

const allBlocks = getAllBlocks();
// Returns: BlockDefinition[]
```

### Block Discovery

```typescript
import { discoverAndRegisterBlocks } from '@/blocks/bootstrap';

await discoverAndRegisterBlocks();
// Scans src/blocks/**/block.config.ts and registers all blocks
```

---

## Project Storage Interface

Projects stored in browser `localStorage`.

### Schema

```typescript
interface Project {
  id: number;                    // Unique project ID
  name: string;                  // Project name
  type: string;                  // Template type (e.g., 'classification')
  createdAt: number;             // Unix timestamp
  updatedAt: number;
  
  blocks: BlockInstance[];       // Pipeline blocks
  
  config: {
    pythonVersion: string;       // e.g., '3.9'
    dependencies: string[];      // PyPI packages
    blockCatalog: CatalogEntry[]; // Block-to-package mapping
  };
  
  linkedFolder: string | null;   // Local folder path (if linked)
}

interface BlockInstance {
  id: string;                    // Instance ID (unique per instance)
  type: string;                  // Block type ID (e.g., 'data_loader')
  config: Record<string, any>;   // User configuration
  customCode?: string;           // User-edited code
  position?: { x: number, y: number }; // Canvas position
}

interface CatalogEntry {
  blockId: string;               // Block type ID
  packageName: string;           // Python package name
}
```

### Storage Operations

```javascript
// Load all projects
const projects = JSON.parse(localStorage.getItem('mlsphere:projects') || '[]');

// Save projects
localStorage.setItem('mlsphere:projects', JSON.stringify(projects));

// Add project
const newProject = { id: Date.now(), name: 'My Project', ... };
projects.push(newProject);
localStorage.setItem('mlsphere:projects', JSON.stringify(projects));

// Update project
const index = projects.findIndex(p => p.id === projectId);
projects[index] = updatedProject;
localStorage.setItem('mlsphere:projects', JSON.stringify(projects));

// Delete project
const filtered = projects.filter(p => p.id !== projectId);
localStorage.setItem('mlsphere:projects', JSON.stringify(filtered));
```

---

## Code Generation Interface

### Pipeline to Python Conversion

```typescript
interface GeneratedPipeline {
  mainScript: string;            // main.py content
  modules: {                     // Package modules
    [packageName: string]: {
      [fileName: string]: string; // File content
    }
  };
  requirements: string;          // requirements.txt content
}

function generatePipelineCode(project: Project): GeneratedPipeline {
  // Implementation generates Python code from blocks
}
```

### Example Output

```javascript
const pipeline = generatePipelineCode(project);

// pipeline.mainScript
`
from data_loader.loader import load_data
from classification_model.model import train_model

data = load_data(path='./data')
model = train_model(data, epochs=10)
`

// pipeline.modules
{
  'data_loader': {
    '__init__.py': '',
    'loader.py': 'import pandas as pd\n\ndef load_data(path):\n    return pd.read_csv(...)'
  },
  'classification_model': {
    '__init__.py': '',
    'model.py': 'import sklearn\n\ndef train_model(data, epochs):\n    ...'
  }
}

// pipeline.requirements
`
pandas>=1.3.0
scikit-learn>=1.0.0
numpy>=1.20.0
`
```

---

## Event System

### Application Events

Components communicate via Vue's event system.

#### Project Selected

```javascript
// Emitter (Dashboard.vue)
this.$emit('project-selected', { projectId: 123 });

// Listener (App.vue)
<Dashboard @project-selected="handleProjectSelected" />

methods: {
  handleProjectSelected({ projectId }) {
    this.currentProject = this.projects.find(p => p.id === projectId);
  }
}
```

#### Agent Status Changed

```javascript
// Emitter (App.vue)
this.agentStatus = 'online';
// Status propagated via props to child components

// Consumer (Dashboard.vue)
props: ['agentStatus'],
computed: {
  canExecute() {
    return this.agentStatus === 'online';
  }
}
```

#### Pipeline Execution Started

```javascript
// Emitter (PipelineCanvas.vue)
this.$emit('pipeline-started', { projectId: 123, jobId: 'job-abc' });

// Listener (App.vue)
<PipelineCanvas @pipeline-started="handlePipelineStarted" />
```

---

## File System Conventions

### Project Structure on Disk

```
~/mlsphere-projects/
  project-123/                   # Project ID as folder name
    main.py                      # Entry point
    requirements.txt             # Dependencies
    data_loader/                 # Block package
      __init__.py
      loader.py
    classification_model/        # Block package
      __init__.py
      model.py
    training/
      __init__.py
      trainer.py
```

### Agent Job Structure

```
~/.mlsphere-agent/
  jobs/
    job-abc123/                  # Job ID as folder name
      main.py                    # Entry script
      output.log                 # Stdout + stderr
      error.log                  # Stderr only
      status.json                # Job metadata
      data_loader/               # Copied packages
        loader.py
      classification_model/
        model.py
```

### Agent Config

```
~/.mlsphere-agent/
  config.json                    # Agent settings
  {
    "port": 51751,
    "host": "127.0.0.1",
    "pythonPath": "/usr/bin/python3",
    "jobRetentionDays": 7
  }
  
  project-links.json             # Project → folder mappings
  {
    "123": "C:/Users/john/my-ml-project",
    "456": "/home/john/another-project"
  }
```

---

## Error Codes and Messages

### Agent Errors

| Code | Message | Cause |
|------|---------|-------|
| `AGENT_OFFLINE` | Desktop Agent is offline | Health check failed |
| `JOB_FAILED` | Job execution failed | Python process exited non-zero |
| `PROJECT_NOT_LINKED` | Project not linked to folder | Tried to write file without linking |
| `FILE_WRITE_ERROR` | Cannot write file | Permission denied or invalid path |
| `INVALID_PATH` | Path validation failed | Path contains `..` or invalid chars |
| `PORT_IN_USE` | Agent port already bound | Another process using 51751 |
| `PYTHON_NOT_FOUND` | Python executable not found | Python not installed or not in PATH |

### Browser Errors

```javascript
class AgentError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

// Usage
throw new AgentError(
  'PROJECT_NOT_LINKED',
  'Cannot save file: project not linked to folder',
  { projectId: 123 }
);
```

---

## Versioning and Compatibility

### API Version

Current: `v1`

Future versions will use URL prefix: `/v2/jobs`, `/v2/projects`

### Backward Compatibility

- Agent maintains compatibility with browser for same major version
- Breaking changes increment major version (v1 → v2)
- Non-breaking additions don't increment version

### Feature Detection

```javascript
// Check agent capabilities
const health = await fetch('http://127.0.0.1:51751/health').then(r => r.json());

if (health.version >= '2.0.0') {
  // Use new features
}
```

---

## Security Considerations

### Input Validation

All agent endpoints validate:
- Path traversal attempts (`..` in paths)
- JSON structure (required fields present)
- File size limits (default: 10MB per file)

### CORS Policy

Agent allows all origins (`Access-Control-Allow-Origin: *`) because:
- Runs on localhost only (not accessible externally)
- Simplifies development
- No sensitive data (user's own machine)

### Future Enhancements

- Authentication tokens for cloud sync
- Code sandboxing (Docker containers)
- Resource limits (CPU, memory, time)
- Digital signatures for job payloads

---

## Performance Characteristics

### Agent Limits

- Max concurrent jobs: 4 (configurable)
- Max job history retained: 100 jobs
- Log retention: 7 days
- File size limit: 10MB per file
- Request timeout: 30 seconds

### Expected Latencies

- Health check: <5ms
- Job creation: 50-100ms
- File write: 10-50ms
- Log fetch: 5-20ms

### Optimization Tips

- Use `since` parameter for log polling to avoid re-fetching
- Link projects to avoid file copying overhead
- Cancel jobs when no longer needed
- Clear old jobs periodically
