# MLSphere Design Decisions

This document explains key architectural and implementation decisions made during development, including rationale, alternatives considered, and trade-offs.

---

## 1. BYO-Compute Model (Bring Your Own Compute)

**Decision**: Users run ML training on their own hardware, not cloud servers.

**Rationale**:
- **Cost**: Zero infrastructure costs for hosting expensive GPU compute
- **Privacy**: User data never leaves their machine
- **Performance**: Users leverage their own GPU hardware (RTX 3090, A100, etc.)
- **Accessibility**: Democratizes ML development (no credit card required)
- **Offline**: Works without internet connection

**Alternatives Considered**:
- Cloud compute with credits: High operational cost, requires billing system
- Serverless functions: Too slow for training, cold start issues
- Hybrid model: Complexity without clear benefits

**Trade-offs**:
- ❌ Users need to install desktop agent (friction)
- ❌ Cannot guarantee compute availability
- ✅ No server costs, unlimited scaling
- ✅ Better privacy and performance

---

## 2. Localhost Agent (Not Cloud Backend)

**Decision**: Desktop agent runs on `127.0.0.1:51751`, not remote server.

**Rationale**:
- **Security**: No API keys, tokens, or authentication needed
- **Latency**: Instant communication (no network roundtrip)
- **Reliability**: No server outages or downtime
- **Simplicity**: No database, no sessions, no user management

**Alternatives Considered**:
- Cloud agent with WebSockets: Required authentication, more complexity
- Remote execution API: Slower, security risks, operational costs
- Hybrid (cloud + local): Confusing user experience

**Trade-offs**:
- ❌ Requires agent installation
- ❌ Browser and agent must be on same machine
- ✅ Zero latency, maximum privacy
- ✅ No authentication complexity

**Implementation Details**:
```javascript
// Agent binds to localhost only
server.listen(51751, '127.0.0.1', () => {
  console.log('Agent running on http://127.0.0.1:51751');
});

// Browser checks health via local fetch
const health = await fetch('http://127.0.0.1:51751/health');
```

---

## 3. Static Frontend Deployment (No Backend Server)

**Decision**: Web app is pure static files (HTML/CSS/JS), deployed to CDN.

**Rationale**:
- **Scale**: Serves infinite users via CDN (Vercel, Netlify, Cloudflare)
- **Cost**: $0/month for hosting
- **Speed**: Global edge deployment, sub-100ms load times
- **Simplicity**: No backend to maintain, no database migrations

**Alternatives Considered**:
- Node.js backend: Unnecessary complexity for our use case
- Server-side rendering (SSR): Not needed, app is highly interactive
- Firebase backend: Still requires backend logic, costs add up

**Trade-offs**:
- ❌ Cannot store user data server-side
- ❌ All state in browser (localStorage/IndexedDB)
- ✅ Infinite scalability, zero cost
- ✅ Fast load times worldwide

---

## 4. Template-Based Project Initialization

**Decision**: Users start from predefined templates (classification, regression, etc.).

**Rationale**:
- **Onboarding**: Reduces friction for beginners (working pipeline in 1 click)
- **Best Practices**: Templates encode ML conventions (train/test split, metrics)
- **Learning**: Users see working examples before customizing

**Alternatives Considered**:
- Blank project: Too overwhelming for beginners
- AI-generated projects: Unpredictable, not reliable yet
- Wizard-based: Good but more complex to implement

**Trade-offs**:
- ❌ Advanced users may feel constrained
- ✅ Faster time-to-value
- ✅ Consistency in project structure

**Template Structure**:
```json
{
  "id": "classification",
  "name": "Image Classification",
  "blocks": [
    { "type": "data_loader", "config": {...} },
    { "type": "classification_model", "config": {...} },
    { "type": "training", "config": {...} }
  ],
  "dependencies": ["torch", "torchvision", "pandas"]
}
```

---

## 5. Visual Block-Based Pipeline Design

**Decision**: Pipelines are designed visually with draggable blocks, not code-first.

**Rationale**:
- **Accessibility**: Non-programmers can build ML pipelines
- **Visualization**: Clear data flow understanding
- **Modular**: Encourages reusable components
- **Debugging**: Easier to identify failing stages

**Alternatives Considered**:
- YAML configuration: Less intuitive, requires learning syntax
- Pure code: Excludes non-programmers
- Notebook-based (Jupyter): Good for exploration, bad for production

**Trade-offs**:
- ❌ Power users may prefer pure code
- ❌ Visual layout can become cluttered (100+ blocks)
- ✅ Lower barrier to entry
- ✅ Clear mental model

**Implementation**: Blocks are Vue components with config schemas, rendered on HTML5 Canvas with draggable connections.

---

## 6. File Synchronization via Agent (Not Git)

**Decision**: Browser sends file updates to agent via HTTP PUT, agent writes to disk.

**Rationale**:
- **Real-time**: Changes save instantly (500ms debounce)
- **Simplicity**: No Git learning curve
- **UX**: Auto-save like Google Docs, not manual commits
- **Compatibility**: Works with any local folder (existing Git repos OK)

**Alternatives Considered**:
- Git integration: Complex, requires user to learn Git, slower
- Cloud sync (Dropbox-style): Requires backend, sync conflicts
- File watchers: Browser cannot watch filesystem directly

**Trade-offs**:
- ❌ No version history (user can add Git manually)
- ❌ Single source of truth is local disk
- ✅ Fast, intuitive, works immediately

**Implementation**:
```javascript
// Browser → Agent
await desktopAgentClient.writeProjectFile(projectId, 'model.py', newCode);

// Agent → Disk
const linkedPath = projectLinks.get(projectId);
fs.writeFileSync(path.join(linkedPath, 'model.py'), newCode);
```

---

## 7. Sequential Pipeline Execution (Not Parallel)

**Decision**: Blocks execute one-at-a-time in order, not parallel.

**Rationale**:
- **Simplicity**: Easier to reason about execution order
- **Dependencies**: Most ML pipelines are sequential (data → train → eval)
- **Debugging**: Clearer error propagation
- **Resource Management**: Avoids GPU oversubscription

**Alternatives Considered**:
- Parallel execution (DAG): Complex scheduling, premature optimization
- Conditional branching: Not needed for current use cases
- Lazy evaluation: Hard to debug, unclear when code runs

**Trade-offs**:
- ❌ Cannot run independent branches in parallel
- ❌ Slower for embarrassingly parallel tasks
- ✅ Predictable execution flow
- ✅ Simpler error handling

**Future Enhancement**: Detect independent blocks and parallelize (future feature).

---

## 8. Python Code Generation (Not Domain-Specific Language)

**Decision**: Blocks generate actual Python code, not DSL or YAML.

**Rationale**:
- **Transparency**: Users see real code, not abstraction layer
- **Editability**: Users can customize generated code freely
- **Debugging**: Standard Python errors, stack traces
- **Interoperability**: Works with any Python library

**Alternatives Considered**:
- Custom DSL: Limits flexibility, requires custom interpreter
- YAML configs: Not expressive enough for ML logic
- JSON pipelines: Hard to represent complex logic

**Trade-offs**:
- ❌ Code generation can be verbose
- ✅ Maximum flexibility
- ✅ Standard Python debugging tools work

**Example Generated Code**:
```python
# Generated from blocks
from data_loader.loader import load_data
from classification_model.model import train_model

data = load_data(path='./data', split=0.8)
model = train_model(data, epochs=10, lr=0.001)
```

---

## 9. Block Catalog as Single JSON File

**Decision**: All block definitions in `block-catalog.templates.json`, not database.

**Rationale**:
- **Version Control**: Easy Git diffs, branch merging
- **Deployment**: No database migrations
- **Portability**: Copy file → copy catalog
- **Speed**: Loaded once at app startup

**Alternatives Considered**:
- Database (PostgreSQL): Overkill, requires backend server
- Individual JSON files: Harder to manage consistency
- API endpoint: Adds network dependency

**Trade-offs**:
- ❌ Large file can be hard to edit manually
- ❌ No validation beyond JSON schema
- ✅ Simple, fast, portable
- ✅ Works with static hosting

---

## 10. Auto-Save with Debouncing (500ms)

**Decision**: Code editor auto-saves 500ms after typing stops.

**Rationale**:
- **UX**: Google Docs-style experience (no save button)
- **Safety**: No lost work from browser crash
- **Performance**: Debouncing prevents excessive API calls

**Alternatives Considered**:
- Manual save: Users forget, lose work
- Save on blur: Misses work-in-progress
- Instant save (no debounce): Too many HTTP requests

**Trade-offs**:
- ❌ May save incomplete code (syntax errors)
- ✅ Better UX, no lost work

**Implementation**:
```javascript
let saveTimer = null;
onCodeChange(newCode) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    desktopAgentClient.writeProjectFile(projectId, filePath, newCode);
  }, 500);
}
```

---

## 11. Job Logs via Polling (Not WebSockets)

**Decision**: Browser polls `GET /jobs/:id/logs?since=N` every second.

**Rationale**:
- **Simplicity**: No WebSocket server needed
- **Reliability**: HTTP is more universally supported
- **Debugging**: Easy to inspect in DevTools
- **Compatibility**: Works through proxies, corporate firewalls

**Alternatives Considered**:
- WebSockets: More complex, requires connection management
- Server-Sent Events (SSE): Good but overkill for localhost
- Long polling: Similar complexity to WebSockets

**Trade-offs**:
- ❌ 1-second latency (not real-time)
- ❌ More HTTP requests (negligible for localhost)
- ✅ Simple, reliable, debuggable

**Implementation**:
```javascript
let lastLogPosition = 0;
setInterval(async () => {
  const response = await fetch(`/jobs/${jobId}/logs?since=${lastLogPosition}`);
  const logs = await response.text();
  lastLogPosition += logs.length;
  appendToLogView(logs);
}, 1000);
```

---

## 12. No User Authentication or Accounts

**Decision**: No login system, no user accounts.

**Rationale**:
- **Privacy**: No data collection, no tracking
- **Simplicity**: No password resets, no emails
- **Speed**: Instant app usage (no signup friction)
- **Cost**: No database, no auth backend

**Alternatives Considered**:
- OAuth (Google, GitHub): Adds friction, unnecessary for local app
- Email/password: Complex, security liability
- API keys: What would they protect?

**Trade-offs**:
- ❌ Cannot sync projects across devices
- ❌ No collaboration features
- ✅ Zero friction onboarding
- ✅ Maximum privacy

**Future**: Optional cloud sync with authentication (opt-in).

---

## 13. Inline Python Execution for Linked Projects

**Decision**: Agent injects code inline for linked projects, not file-based.

**Rationale**:
- **Performance**: No file copy overhead
- **Sync**: Always uses latest file contents
- **Convenience**: Manual edits in IDE immediately reflected

**Implementation**:
```javascript
// Agent constructs inline Python
const pythonCode = `
import sys
sys.path.insert(0, '${linkedProjectPath}')

${userCode}
`;
spawn('python', ['-c', pythonCode]);
```

**Alternatives Considered**:
- Always use job directory: Slower, duplicate files
- Mix approach: Too confusing

**Trade-offs**:
- ❌ More complex code generation
- ✅ Faster, no file duplication

---

## 14. Monaco Editor (VS Code Editor)

**Decision**: Use Monaco Editor for code editing.

**Rationale**:
- **Features**: IntelliSense, syntax highlighting, keyboard shortcuts
- **Familiarity**: Same as VS Code
- **Quality**: Battle-tested by millions

**Alternatives Considered**:
- CodeMirror: Good but less feature-rich
- Ace Editor: Older, less maintained
- Custom: Too much work

**Trade-offs**:
- ❌ Large bundle size (~8MB)
- ✅ Best-in-class editing experience

---

## 15. Port 51751 for Agent

**Decision**: Fixed port `51751` for desktop agent.

**Rationale**:
- **Predictability**: Browser always knows where to connect
- **Documentation**: Easier to troubleshoot (check `http://127.0.0.1:51751/health`)
- **Firewall Rules**: Single port to allow

**Alternatives Considered**:
- Random port: Harder to document, debug
- Port discovery: Too complex for localhost
- Well-known port (80, 8080): May conflict with other services

**Trade-offs**:
- ❌ Port conflict if user runs another service on 51751
- ✅ Simple, predictable, documentable

**Conflict Resolution**: Show "Port in use" error, suggest config change.

---

## 16. Node.js Child Process (Not Threads)

**Decision**: Agent spawns Python via `child_process.spawn()`.

**Rationale**:
- **Isolation**: Process crash doesn't kill agent
- **Resource Control**: OS manages Python process lifecycle
- **Standard Streams**: Easy stdout/stderr capture
- **Cross-Language**: Works with any executable (R, Julia, C++)

**Alternatives Considered**:
- Worker threads: Can't execute Python natively
- Python bridge (PyNode): Too complex, fragile bindings
- Embedded Python: Hard to distribute, version conflicts

**Trade-offs**:
- ❌ Slower startup (~100ms process spawn)
- ✅ Robust, isolated, standard

---

## 17. Project Storage in localStorage

**Decision**: Projects stored in browser's localStorage.

**Rationale**:
- **Simplicity**: No backend database
- **Speed**: Instant read/write
- **Privacy**: Never leaves browser

**Implementation**:
```javascript
const projects = JSON.parse(localStorage.getItem('mlsphere:projects') || '[]');
projects.push(newProject);
localStorage.setItem('mlsphere:projects', JSON.stringify(projects));
```

**Alternatives Considered**:
- IndexedDB: Overkill for small JSON objects
- Cloud storage: Requires backend
- Cookies: Size limits (4KB)

**Trade-offs**:
- ❌ 5-10MB size limit (browser-dependent)
- ❌ Lost if browser data cleared
- ✅ Fast, simple, private

**Future**: Export/import projects as JSON for backup.

---

## 18. No Database for Job History

**Decision**: Job logs kept in-memory and temporary files, not database.

**Rationale**:
- **Simplicity**: No database setup, migrations, backups
- **Ephemeral**: Jobs are short-lived (minutes to hours)
- **Local**: Each agent is single-user

**Alternatives Considered**:
- SQLite: Adds dependency, complexity
- Log files: Already implemented (jobs/{id}/output.log)
- Cloud DB: Unnecessary for local-only app

**Trade-offs**:
- ❌ Job history lost on agent restart
- ✅ Zero setup, fast queries (in-memory Map)

**Future**: Optional persistent job history (SQLite or JSON files).

---

## 19. CSS-in-Vue (Not Tailwind or CSS Framework)

**Decision**: Component-scoped CSS in `.vue` files.

**Rationale**:
- **Simplicity**: No build configuration
- **Scoping**: CSS doesn't leak between components
- **Performance**: No utility class bloat

**Alternatives Considered**:
- Tailwind CSS: Verbose HTML, large bundle
- Bootstrap: Opinionated styles, harder to customize
- Styled-components: JS-in-CSS, adds runtime

**Trade-offs**:
- ❌ More manual CSS writing
- ✅ Full control, minimal bundle size

---

## 20. Future: Protocol Handler (`mlsphere-agent://start`)

**Planned Decision**: Browser opens agent via custom protocol.

**Rationale**:
- **UX**: One-click agent launch from browser
- **Integration**: Seamless browser-agent handshake

**Implementation** (future):
```html
<!-- Browser -->
<a href="mlsphere-agent://start">Start Agent</a>
```

Installer registers protocol handler:
- Windows: Registry key `HKEY_CLASSES_ROOT\mlsphere-agent`
- macOS: `.plist` in bundle
- Linux: `.desktop` file with `MimeType`

**Status**: Not yet implemented, planned for installer package.

---

## Summary of Core Principles

1. **Simplicity First**: Avoid complexity until proven necessary
2. **User Privacy**: Data stays on user's machine
3. **Zero Cost**: No operational costs (CDN + user compute)
4. **Standard Tools**: Use Python, Node.js, HTTP (not custom protocols)
5. **Progressive Enhancement**: Works immediately, advanced features opt-in
6. **Developer Experience**: Fast iteration, clear errors, great debugging
7. **User Experience**: Auto-save, instant feedback, forgiving UX
