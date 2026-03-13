# MLSphere Development Guide

Guide for developers working on MLSphere codebase - how to extend, customize, and contribute.

---

## Development Setup

### Prerequisites
- Node.js 16+ and npm 7+
- Python 3.8+ with pip
- Git
- Code editor (VS Code recommended)

### Initial Setup

```bash
# Clone repository
git clone https://github.com/your-org/mlsphere.git
cd mlsphere

# Install dependencies
npm install

# Install Python dependencies (for agent testing)
pip install torch scikit-learn pandas numpy

# Start development server (runs agent + vue dev server)
npm run serve
```

This starts:
- Desktop agent on `http://127.0.0.1:51751`
- Vue dev server on `http://localhost:8080`

### Project Scripts

```bash
# Development
npm run serve          # Start dev server with agent
npm run build          # Build production bundle
npm run lint           # Lint code

# Testing (future)
npm run test:unit      # Run unit tests
npm run test:e2e       # Run end-to-end tests

# Agent
node desktop-agent/server.js   # Run agent standalone
```

---

## Adding a New Block Type

Blocks are the core building units. Here's how to add one:

### 1. Create Block Definition

Create file: `src/blocks/MyNewBlock/block.config.ts`

```typescript
import { defineBlock } from '../core/defineBlock';

export default defineBlock({
  id: 'my_new_block',
  name: 'My New Block',
  category: 'Processing',
  icon: '🔧',
  description: 'Does something useful',
  
  config: {
    // Block configuration schema
    parameter1: {
      type: 'number',
      default: 10,
      label: 'Parameter 1'
    },
    parameter2: {
      type: 'string',
      default: 'value',
      label: 'Parameter 2'
    }
  },
  
  inputs: ['input_data'],   // Expected input variables
  outputs: ['processed_data'], // Output variables
  
  packages: ['my_new_block'],  // Python package name
  
  dependencies: [
    'numpy>=1.20.0',
    'custom-library==2.1.0'
  ],
  
  code: `
import numpy as np

def process(input_data, parameter1=10, parameter2='value'):
    """
    Process input data using parameters.
    
    Parameters:
    -----------
    input_data : array-like
        Input to process
    parameter1 : int
        First parameter
    parameter2 : str
        Second parameter
    
    Returns:
    --------
    processed_data : array-like
        Processed output
    """
    # Your implementation here
    processed_data = input_data * parameter1
    print(f"Processing with {parameter2}")
    return processed_data
`
});
```

### 2. Create Index File

Create `src/blocks/MyNewBlock/index.ts`:

```typescript
import blockConfig from './block.config';
export default blockConfig;
```

### 3. Block Auto-Discovery

Blocks are auto-discovered by `src/blocks/discoverBlocks.ts`. No manual registration needed!

The discovery process:
1. Scans `src/blocks/*/block.config.ts`
2. Imports each block definition
3. Registers with global block registry

### 4. Test Your Block

Add to a template in `src/data/block-catalog.templates.json`:

```json
{
  "id": "test_template",
  "name": "Test My New Block",
  "blocks": [
    {
      "type": "data_loader",
      "config": {}
    },
    {
      "type": "my_new_block",
      "config": {
        "parameter1": 20,
        "parameter2": "custom_value"
      }
    }
  ]
}
```

### 5. Verify Code Generation

When pipeline executes, your block generates a Python file:

```
project-folder/
  my_new_block/
    __init__.py
    processor.py  ← Contains your code
```

---

## Adding Block Sub-Packages

For complex blocks with multiple modules:

### Directory Structure

```
src/blocks/ComplexBlock/
  block.config.ts
  index.ts
  packages/
    SubPackage1/
      index.ts
      config.ts
    SubPackage2/
      index.ts
      config.ts
```

### Sub-Package Definition

`packages/SubPackage1/index.ts`:

```typescript
export default {
  id: 'sub_package_1',
  name: 'Sub Package 1',
  description: 'Part 1 of complex block',
  code: `
def sub_function_1():
    return "result"
`
};
```

### Reference in Main Block

```typescript
// block.config.ts
export default defineBlock({
  id: 'complex_block',
  packages: [
    'complex_block',
    'complex_block/sub_package_1',
    'complex_block/sub_package_2'
  ],
  code: `
from .sub_package_1 import sub_function_1
from .sub_package_2 import sub_function_2

def main_function():
    result1 = sub_function_1()
    result2 = sub_function_2()
    return result1 + result2
`
});
```

---

## Adding Templates

Templates provide starting points for users.

### Template Definition

Edit `src/data/block-catalog.templates.json`:

```json
{
  "id": "my_new_template",
  "name": "My ML Pipeline",
  "description": "Build a custom ML pipeline for X",
  "category": "Machine Learning",
  "icon": "🤖",
  "difficulty": "intermediate",
  "estimatedTime": "30 minutes",
  "blocks": [
    {
      "type": "data_loader",
      "config": {
        "dataPath": "./data",
        "splitRatio": 0.8
      }
    },
    {
      "type": "preprocessing",
      "config": {
        "normalize": true,
        "removeOutliers": true
      }
    },
    {
      "type": "classification_model",
      "config": {
        "modelType": "random_forest",
        "numEstimators": 100
      }
    },
    {
      "type": "training",
      "config": {
        "epochs": 10,
        "batchSize": 32
      }
    },
    {
      "type": "evaluation",
      "config": {
        "metrics": ["accuracy", "f1_score"]
      }
    }
  ],
  "dependencies": [
    "scikit-learn>=1.0.0",
    "pandas>=1.3.0",
    "numpy>=1.20.0"
  ],
  "tags": ["classification", "supervised", "beginner-friendly"]
}
```

### Template Fields

- **id**: Unique identifier (lowercase, underscores)
- **name**: Display name in UI
- **description**: Help text shown to users
- **category**: Grouping (Classification, Regression, etc.)
- **icon**: Emoji or icon string
- **difficulty**: beginner | intermediate | advanced
- **estimatedTime**: Human-readable duration
- **blocks**: Array of block instances with config
- **dependencies**: Python packages required
- **tags**: Searchable keywords

---

## Extending the Agent API

Add new endpoints to the desktop agent.

### 1. Add Route Handler

Edit `desktop-agent/server.js`:

```javascript
function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // Existing routes...
  
  // New route
  if (url.pathname === '/custom-endpoint' && req.method === 'POST') {
    return handleCustomEndpoint(req, res);
  }
}

function handleCustomEndpoint(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const payload = JSON.parse(body);
      
      // Your logic here
      const result = processCustomRequest(payload);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, result }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

function processCustomRequest(payload) {
  // Implementation
  return { data: 'processed' };
}
```

### 2. Add Client Wrapper

Edit `src/services/desktopAgentClient.js`:

```javascript
export async function callCustomEndpoint(payload) {
  const response = await fetch(`${AGENT_BASE_URL}/custom-endpoint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`Custom endpoint failed: ${response.statusText}`);
  }
  
  return response.json();
}
```

### 3. Use in Component

```vue
<script>
import { callCustomEndpoint } from '@/services/desktopAgentClient';

export default {
  methods: {
    async handleCustomAction() {
      try {
        const result = await callCustomEndpoint({ param: 'value' });
        console.log('Result:', result);
      } catch (error) {
        console.error('Custom action failed:', error);
      }
    }
  }
};
</script>
```

---

## Adding UI Components

### Component Structure

```vue
<template>
  <div class="my-component">
    <h2>{{ title }}</h2>
    <button @click="handleClick">{{ buttonText }}</button>
  </div>
</template>

<script>
export default {
  name: 'MyComponent',
  
  props: {
    title: {
      type: String,
      required: true
    },
    buttonText: {
      type: String,
      default: 'Click Me'
    }
  },
  
  data() {
    return {
      internalState: null
    };
  },
  
  methods: {
    handleClick() {
      this.$emit('action', { data: this.internalState });
    }
  }
};
</script>

<style scoped>
.my-component {
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
}

.my-component h2 {
  margin-bottom: 16px;
  color: #333;
}
</style>
```

### Using Component

```vue
<template>
  <MyComponent 
    title="Hello World" 
    button-text="Do Something"
    @action="handleCustomAction"
  />
</template>

<script>
import MyComponent from '@/components/MyComponent.vue';

export default {
  components: { MyComponent },
  
  methods: {
    handleCustomAction(payload) {
      console.log('Action triggered:', payload);
    }
  }
};
</script>
```

---

## State Management Patterns

### Component-Level State

```vue
<script>
export default {
  data() {
    return {
      // Local to this component
      projects: [],
      selectedProject: null,
      loading: false
    };
  }
};
</script>
```

### App-Level State (Props Down, Events Up)

```vue
<!-- App.vue -->
<template>
  <Dashboard 
    :projects="projects"
    :agent-status="agentStatus"
    @project-created="handleProjectCreated"
  />
</template>

<script>
export default {
  data() {
    return {
      projects: [],
      agentStatus: 'offline'
    };
  },
  
  methods: {
    handleProjectCreated(project) {
      this.projects.push(project);
    }
  }
};
</script>
```

### Persistent State (localStorage)

```javascript
// Save
localStorage.setItem('mlsphere:projects', JSON.stringify(projects));

// Load
const projects = JSON.parse(localStorage.getItem('mlsphere:projects') || '[]');
```

---

## Code Style Guidelines

### JavaScript/Vue

```javascript
// Use const/let, not var
const immutableValue = 10;
let mutableValue = 20;

// Async/await over callbacks
async function fetchData() {
  const response = await fetch('/api/data');
  return response.json();
}

// Destructuring
const { id, name } = project;
const [first, second] = array;

// Template literals
const message = `Project ${name} created`;

// Arrow functions
const double = (x) => x * 2;
projects.filter(p => p.status === 'active');
```

### Vue Component Naming

```
PascalCase for components: MyComponent.vue
kebab-case in templates: <my-component />
Descriptive names: DataLoader not DL
```

### CSS

```css
/* BEM-like naming */
.block-library { }
.block-library__item { }
.block-library__item--selected { }

/* Scoped styles in components */
<style scoped>
.component-specific { }
</style>

/* Use CSS variables for colors */
:root {
  --primary-color: #007bff;
  --background: #1e1e1e;
}
```

---

## Debugging Tips

### Browser DevTools

```javascript
// Component inspection
console.log('Component state:', this.$data);
console.log('Props:', this.$props);

// Watch API calls
// Network tab → filter by "127.0.0.1:51751"

// Vue DevTools extension
// Shows component tree, state, events
```

### Agent Debugging

```javascript
// desktop-agent/server.js
console.log('[DEBUG] Received request:', req.url, req.method);
console.log('[DEBUG] Job payload:', JSON.stringify(payload, null, 2));

// Enable verbose logging
const DEBUG = process.env.DEBUG === 'true';
if (DEBUG) console.log('[DEBUG]', ...args);
```

### Python Debugging

```python
# In generated Python code
import sys
print(f"[DEBUG] Python version: {sys.version}", file=sys.stderr)
print(f"[DEBUG] Data shape: {data.shape}", file=sys.stderr)

# Agent captures stdout/stderr → visible in job logs
```

---

## Testing Strategy

### Unit Tests (Future)

```javascript
// tests/unit/blockRegistry.spec.js
import { registerBlock, getBlock } from '@/blocks/core/registerBlocks';

describe('Block Registry', () => {
  it('registers and retrieves block', () => {
    const block = { id: 'test_block', name: 'Test' };
    registerBlock(block);
    expect(getBlock('test_block')).toEqual(block);
  });
});
```

### Integration Tests (Future)

```javascript
// tests/integration/agent.spec.js
describe('Desktop Agent', () => {
  it('creates and runs job', async () => {
    const response = await fetch('http://127.0.0.1:51751/jobs', {
      method: 'POST',
      body: JSON.stringify({ files: [...], entryFile: 'main.py' })
    });
    
    const job = await response.json();
    expect(job.status).toBe('queued');
  });
});
```

### Manual Testing Checklist

- [ ] Create project from template
- [ ] Add/remove blocks on canvas
- [ ] Edit block code in editor
- [ ] Execute pipeline
- [ ] View job logs
- [ ] Link project to local folder
- [ ] Auto-save verification
- [ ] Agent restart handling
- [ ] Error handling (offline agent, failed jobs)

---

## Performance Optimization

### Bundle Size

```javascript
// Lazy load components
const Dashboard = () => import('@/components/Dashboard.vue');
const PipelineCanvas = () => import('@/components/PipelineCanvas.vue');

// Tree-shaking friendly imports
import { specificFunction } from 'library'; // ✓
import library from 'library'; // ✗ (imports everything)
```

### Rendering Performance

```vue
<template>
  <!-- Use v-show for frequently toggled -->
  <div v-show="isVisible">Heavy component</div>
  
  <!-- Use v-if for rarely shown -->
  <HeavyComponent v-if="showOnce" />
  
  <!-- Key for list items -->
  <div v-for="block in blocks" :key="block.id">
    {{ block.name }}
  </div>
</template>
```

### API Call Optimization

```javascript
// Debounce auto-save
let saveTimer = null;
function debouncedSave(content) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    actualSave(content);
  }, 500);
}

// Cancel pending requests
const abortController = new AbortController();
fetch('/api', { signal: abortController.signal });
// Later: abortController.abort();
```

---

## Deployment

### Build for Production

```bash
npm run build
```

Generates `dist/` folder with optimized assets:
- Minified JS bundles
- Optimized CSS
- Compressed images
- Service worker (PWA)

### Deploy to CDN

```bash
# Vercel
vercel --prod

# Netlify
netlify deploy --prod

# Manual
# Upload dist/ contents to any static hosting
# S3, CloudFlare Pages, GitHub Pages, etc.
```

### Environment Variables

Create `.env.production`:

```
VUE_APP_AGENT_PORT=51751
VUE_APP_AGENT_HOST=127.0.0.1
VUE_APP_VERSION=1.0.0
```

Access in code:

```javascript
const agentPort = process.env.VUE_APP_AGENT_PORT;
```

---

## Contributing

### Workflow

1. Fork repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Make changes
4. Run linter: `npm run lint`
5. Test manually
6. Commit: `git commit -m "Add my feature"`
7. Push: `git push origin feature/my-feature`
8. Open Pull Request

### Commit Message Format

```
type(scope): short description

Longer description if needed.

Fixes #123
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
```
feat(blocks): add text processing block
fix(agent): resolve file path on Windows
docs(readme): update installation instructions
```

---

## Common Issues

### Agent Won't Start

```bash
# Check if port in use
netstat -an | grep 51751

# Start agent manually
node desktop-agent/server.js

# Check Python version
python --version  # Must be 3.8+
```

### Build Fails

```bash
# Clear cache
rm -rf node_modules
npm install

# Clear Vue CLI cache
npm run clean  # If command exists
```

### Code Changes Not Reflected

```bash
# Hard refresh browser
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (macOS)

# Restart dev server
# Ctrl+C then npm run serve
```

---

## Additional Resources

- Vue 3 Docs: https://v3.vuejs.org
- Node.js Docs: https://nodejs.org/docs
- Python Docs: https://docs.python.org
- Monaco Editor: https://microsoft.github.io/monaco-editor

## Support

- GitHub Issues: [Repository URL]
- Discord: [Community Link]
- Email: support@mlsphere.app
