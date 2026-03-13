const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const portArgIndex = args.indexOf('--port');
const portFromArgs = portArgIndex !== -1 && args[portArgIndex + 1] ? Number(args[portArgIndex + 1]) : null;

const REQUESTED_PORT = portFromArgs || Number(process.env.ML_AGENT_PORT || 51751);
let ACTIVE_PORT = REQUESTED_PORT;
const HOST = process.env.ML_AGENT_HOST || '127.0.0.1';
const BASE_DIR = path.join(os.homedir(), '.mlsphere-agent');
const JOBS_DIR = path.join(BASE_DIR, 'jobs');
const PROJECTS_DIR = path.join(BASE_DIR, 'projects');
const PROJECT_LINKS_FILE = path.join(BASE_DIR, 'project-links.json');
const VENVS_DIR = path.join(BASE_DIR, 'venvs');
const PROJECT_VENVS_FILE = path.join(BASE_DIR, 'project-venvs.json');

// Size limits to prevent memory exhaustion
const MAX_PAYLOAD_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per file
const MAX_FILES_PER_JOB = 100;

fs.mkdirSync(JOBS_DIR, { recursive: true });
fs.mkdirSync(PROJECTS_DIR, { recursive: true });
fs.mkdirSync(VENVS_DIR, { recursive: true });

const jobs = new Map();
const projectLinks = new Map();
const installOps = new Map(); // opId -> install operation
const projectVenvs = new Map(); // projectId -> { activeVenv, venvs: { name -> venvInfo } }

function loadProjectLinks() {
  try {
    if (!fs.existsSync(PROJECT_LINKS_FILE)) {
      return;
    }
    const parsed = JSON.parse(fs.readFileSync(PROJECT_LINKS_FILE, 'utf8'));
    if (!parsed || typeof parsed !== 'object') {
      return;
    }

    Object.entries(parsed).forEach(([projectId, rootPath]) => {
      if (typeof rootPath === 'string' && rootPath.trim()) {
        projectLinks.set(String(projectId), rootPath);
      }
    });
  } catch (error) {
    console.warn('[mlsphere-agent] unable to load project links:', error.message);
  }
}

function saveProjectLinks() {
  const payload = {};
  projectLinks.forEach((rootPath, projectId) => {
    payload[projectId] = rootPath;
  });
  fs.writeFileSync(PROJECT_LINKS_FILE, JSON.stringify(payload, null, 2), 'utf8');
}

function normalizeLocalRootPath(inputPath) {
  const value = String(inputPath || '').trim();
  if (!value) {
    return null;
  }
  return path.resolve(value);
}

function isDirectoryEmpty(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath);
    return entries.length === 0;
  } catch (error) {
    return false;
  }
}

function getProjectBaseDir(projectId) {
  const linked = projectLinks.get(String(projectId));
  if (linked && typeof linked === 'string' && linked.trim()) {
    return linked;
  }
  return path.join(PROJECTS_DIR, String(projectId));
}

loadProjectLinks();

// ---- Virtual Environment Management ----

function loadProjectVenvs() {
  try {
    if (!fs.existsSync(PROJECT_VENVS_FILE)) return;
    const parsed = JSON.parse(fs.readFileSync(PROJECT_VENVS_FILE, 'utf8'));
    if (!parsed || typeof parsed !== 'object') return;
    Object.entries(parsed).forEach(([projectId, data]) => {
      if (data && typeof data === 'object') {
        projectVenvs.set(String(projectId), {
          activeVenv: data.activeVenv || null,
          venvs: data.venvs && typeof data.venvs === 'object' ? data.venvs : {},
        });
      }
    });
  } catch (error) {
    console.warn('[mlsphere-agent] unable to load project venvs:', error.message);
  }
}

function saveProjectVenvs() {
  const payload = {};
  projectVenvs.forEach((data, projectId) => { payload[projectId] = data; });
  fs.writeFileSync(PROJECT_VENVS_FILE, JSON.stringify(payload, null, 2), 'utf8');
}

function getProjectVenvData(projectId) {
  if (!projectVenvs.has(projectId)) {
    projectVenvs.set(projectId, { activeVenv: null, venvs: {} });
  }
  return projectVenvs.get(projectId);
}

function getVenvPythonPath(venvPath) {
  return process.platform === 'win32'
    ? path.join(venvPath, 'Scripts', 'python.exe')
    : path.join(venvPath, 'bin', 'python');
}

function getVenvPipPath(venvPath) {
  return process.platform === 'win32'
    ? path.join(venvPath, 'Scripts', 'pip.exe')
    : path.join(venvPath, 'bin', 'pip');
}

function spawnAndWait(executable, args, cwd) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let proc;
    try {
      proc = spawn(executable, args, { cwd: cwd || BASE_DIR, windowsHide: true });
    } catch (err) {
      return resolve({ exitCode: 1, stdout: '', stderr: err.message });
    }
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('error', err => resolve({ exitCode: 1, stdout, stderr: stderr + err.message }));
    proc.on('close', code => resolve({ exitCode: typeof code === 'number' ? code : 1, stdout, stderr }));
  });
}

async function detectPythonVersions() {
  const candidates = ['python', 'python3'];
  for (let minor = 8; minor <= 14; minor++) {
    candidates.push(`python3.${minor}`);
    if (process.platform === 'win32') {
      candidates.push(`python3${minor}`);
    }
  }
  // Windows py launcher
  if (process.platform === 'win32') {
    candidates.push('py');
  }

  const seen = new Set();
  const versions = [];

  await Promise.all(candidates.map(async (exe) => {
    const args = exe === 'py' ? ['-3', '--version'] : ['--version'];
    const result = await spawnAndWait(exe, args);
    if (result.exitCode !== 0) return;
    const raw = (result.stdout + result.stderr).trim();
    const match = raw.match(/Python (\d+\.\d+\.\d+)/i);
    if (!match) return;
    const version = match[1];
    const key = version;
    if (seen.has(key)) return;
    seen.add(key);
    versions.push({ executable: exe, version, display: `Python ${version} (${exe})` });
  }));

  versions.sort((a, b) => {
    const pa = a.version.split('.').map(Number);
    const pb = b.version.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] || 0) !== (pb[i] || 0)) return (pb[i] || 0) - (pa[i] || 0);
    }
    return 0;
  });

  return versions;
}

function createInstallOp(projectId, venvName) {
  const id = crypto.randomUUID();
  const op = {
    id,
    projectId,
    venvName,
    status: 'running',
    createdAt: new Date().toISOString(),
    logs: [],
    process: null,
  };
  installOps.set(id, op);
  return op;
}

function appendInstallLog(op, stream, text) {
  const message = String(text || '');
  if (!message) return;
  op.logs.push({ cursor: op.logs.length, ts: new Date().toISOString(), stream, message });
  if (op.logs.length > 2000) op.logs = op.logs.slice(op.logs.length - 2000);
}

function runInstallOp(op, pipExecutable, args) {
  appendInstallLog(op, 'system', `Running: ${pipExecutable} ${args.join(' ')}`);

  let proc;
  try {
    proc = spawn(pipExecutable, args, { windowsHide: true });
  } catch (err) {
    op.status = 'failed';
    appendInstallLog(op, 'system', `Failed to start pip: ${err.message}`);
    op.process = null;
    return;
  }

  op.process = proc;
  proc.stdout.on('data', chunk => appendInstallLog(op, 'stdout', chunk.toString('utf8')));
  proc.stderr.on('data', chunk => appendInstallLog(op, 'stderr', chunk.toString('utf8')));
  proc.on('error', err => {
    op.status = 'failed';
    appendInstallLog(op, 'system', `Process error: ${err.message}`);
    op.process = null;
  });
  proc.on('close', code => {
    op.process = null;
    if (op.status === 'cancelled') {
      appendInstallLog(op, 'system', 'Installation cancelled');
    } else if (code === 0) {
      op.status = 'completed';
      appendInstallLog(op, 'system', 'Installation completed successfully');
    } else {
      op.status = 'failed';
      appendInstallLog(op, 'system', `Installation failed with exit code ${code}`);
    }
  });
}

loadProjectVenvs();

// Get list of active ports on the local machine
async function getActiveLocalPorts() {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    let command, args;

    if (platform === 'win32') {
      // Windows: netstat -ano | findstr LISTENING
      command = 'netstat';
      args = ['-ano'];
    } else if (platform === 'darwin') {
      // macOS: netstat -anv | grep LISTEN
      command = 'netstat';
      args = ['-anv'];
    } else {
      // Linux: netstat -tuln or ss -tuln
      command = 'netstat';
      args = ['-tuln'];
    }

    const proc = spawn(command, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0 && code !== null) {
        // Try alternative command on Linux if netstat fails
        if (platform === 'linux') {
          const altProc = spawn('ss', ['-tuln']);
          let altStdout = '';

          altProc.stdout.on('data', (data) => {
            altStdout += data.toString();
          });

          altProc.on('close', (altCode) => {
            if (altCode !== 0 && altCode !== null) {
              resolve([]); // Return empty array if both fail
              return;
            }
            resolve(parsePortsFromNetstatOutput(altStdout, platform, 'ss'));
          });

          altProc.on('error', () => {
            resolve([]); // Return empty if command not found
          });
          return;
        }
        resolve([]); // Return empty array if command fails
        return;
      }

      const ports = parsePortsFromNetstatOutput(stdout, platform);
      resolve(ports);
    });

    proc.on('error', (err) => {
      // Command not found or failed to execute
      resolve([]); // Return empty array instead of rejecting
    });
  });
}

function parsePortsFromNetstatOutput(output, platform, command = 'netstat') {
  const ports = new Set();
  const lines = output.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip headers
    if (trimmed.startsWith('Proto') || trimmed.startsWith('Active') || trimmed.startsWith('State')) {
      continue;
    }

    // Different parsing for different platforms
    if (platform === 'win32') {
      // Windows netstat format: TCP    127.0.0.1:51751        0.0.0.0:0              LISTENING
      if (!trimmed.includes('LISTENING')) continue;
      
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        const addressPort = parts[1];
        const colonIndex = addressPort.lastIndexOf(':');
        if (colonIndex !== -1) {
          const port = parseInt(addressPort.substring(colonIndex + 1), 10);
          if (!isNaN(port) && port > 0 && port <= 65535) {
            // Only include localhost/127.0.0.1 ports
            if (addressPort.startsWith('127.0.0.1:') || addressPort.startsWith('[::1]:') || addressPort.startsWith('0.0.0.0:') || addressPort.startsWith('[::]:')) {
              ports.add(port);
            }
          }
        }
      }
    } else if (platform === 'darwin') {
      // macOS netstat format: tcp4       0      0  127.0.0.1.51751        *.*                    LISTEN
      if (!trimmed.includes('LISTEN')) continue;
      
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 4) {
        const addressPort = parts[3];
        const lastDotIndex = addressPort.lastIndexOf('.');
        if (lastDotIndex !== -1) {
          const port = parseInt(addressPort.substring(lastDotIndex + 1), 10);
          if (!isNaN(port) && port > 0 && port <= 65535) {
            // Only include localhost ports
            if (addressPort.startsWith('127.0.0.1.') || addressPort.startsWith('::1.') || addressPort.startsWith('*.')) {
              ports.add(port);
            }
          }
        }
      }
    } else {
      // Linux netstat/ss format: tcp  LISTEN  0  128  127.0.0.1:51751  0.0.0.0:*
      if (command === 'ss') {
        if (!trimmed.includes('LISTEN')) continue;
      } else {
        if (!trimmed.includes('LISTEN') && !trimmed.includes(':::')) continue;
      }
      
      const parts = trimmed.split(/\s+/);
      for (const part of parts) {
        if (part.includes(':')) {
          const colonIndex = part.lastIndexOf(':');
          const port = parseInt(part.substring(colonIndex + 1), 10);
          if (!isNaN(port) && port > 0 && port <= 65535) {
            // Only include localhost ports
            if (part.startsWith('127.0.0.1:') || part.startsWith(':::') || part.startsWith('0.0.0.0:') || part.startsWith('*:')) {
              ports.add(port);
            }
          }
        }
      }
    }
  }

  return Array.from(ports).sort((a, b) => a - b);
}

function json(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

function restartAgentProcess() {
  const scriptPath = __filename;
  const env = { ...process.env };

  setTimeout(() => {
    try {
      const child = spawn(process.execPath, [scriptPath], {
        cwd: process.cwd(),
        detached: true,
        stdio: 'ignore',
        env,
        windowsHide: true,
      });
      child.unref();
    } catch (error) {
      console.error('[mlsphere-agent] failed to spawn restart process:', error.message);
    } finally {
      process.exit(0);
    }
  }, 250);
}

function safeRelative(inputPath) {
  const normalized = String(inputPath || '').replace(/\\/g, '/').trim();
  if (!normalized || normalized.startsWith('/') || normalized.includes('..')) {
    return null;
  }
  return normalized;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalSize = 0;

    req.on('data', chunk => {
      totalSize += chunk.length;
      if (totalSize > MAX_PAYLOAD_SIZE) {
        req.destroy();
        reject(new Error(`Payload too large (max ${Math.floor(MAX_PAYLOAD_SIZE / 1024 / 1024)} MB)`));
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });
}

function appendLog(job, stream, text) {
  const message = String(text || '');
  if (!message) {
    return;
  }

  job.logs.push({
    cursor: job.logs.length,
    ts: new Date().toISOString(),
    stream,
    message,
  });

  if (job.logs.length > 5000) {
    job.logs = job.logs.slice(job.logs.length - 5000);
  }
}

function createJob(payload) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  
  // Check if this job should use a linked project folder
  const projectId = payload && payload.projectId ? String(payload.projectId) : null;
  const useLinkedProjectFolder = Boolean(projectId && projectLinks.has(projectId));
  let dir;
  
  if (useLinkedProjectFolder) {
    // Use the linked project folder
    dir = projectLinks.get(projectId);
    console.log(`[mlsphere-agent] Job ${id} using linked project folder: ${dir}`);
  } else {
    // Fall back to creating a job-specific folder
    if (projectId) {
      console.warn(`[mlsphere-agent] Job ${id} projectId "${projectId}" has no linked folder. Creating job-specific folder. Available links: ${Array.from(projectLinks.keys()).join(', ') || 'none'}`);
    }
    dir = path.join(JOBS_DIR, id);
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[mlsphere-agent] Job ${id} using job-specific folder: ${dir}`);
  }

  const job = {
    id,
    projectId,
    createdAt,
    updatedAt: createdAt,
    status: 'queued',
    pythonExecutable: String(payload.pythonExecutable || process.env.ML_AGENT_PYTHON || 'python'),
    entryFile: String(payload.entryFile || 'main.py'),
    inlineCode: null,
    args: Array.isArray(payload.args) ? payload.args.map(String) : [],
    logs: [],
    exitCode: null,
    error: null,
    dir,
    process: null,
  };

  if (useLinkedProjectFolder) {
    if (typeof payload.code === 'string') {
      if (payload.code.length > MAX_FILE_SIZE) {
        throw new Error(`Inline execution code too large (max ${Math.floor(MAX_FILE_SIZE / 1024 / 1024)} MB)`);
      }
      job.inlineCode = payload.code;
    }
  } else {
    const files = Array.isArray(payload.files) ? payload.files : [];
    if (files.length > MAX_FILES_PER_JOB) {
      throw new Error(`Too many files (max ${MAX_FILES_PER_JOB})`)
    }

    files.forEach(file => {
      const rel = safeRelative(file.path);
      if (!rel) {
        return;
      }
      const content = typeof file.content === 'string' ? file.content : '';
      if (content.length > MAX_FILE_SIZE) {
        throw new Error(`File too large: ${file.path} (max ${Math.floor(MAX_FILE_SIZE / 1024 / 1024)} MB)`);
      }
      const abs = path.join(dir, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content, 'utf8');
    });

    if (typeof payload.code === 'string') {
      if (payload.code.length > MAX_FILE_SIZE) {
        throw new Error(`Main entry file too large (max ${Math.floor(MAX_FILE_SIZE / 1024 / 1024)} MB)`);
      }
      const entryAbs = path.join(dir, job.entryFile);
      fs.mkdirSync(path.dirname(entryAbs), { recursive: true });
      fs.writeFileSync(entryAbs, payload.code, 'utf8');
    }
  }

  jobs.set(id, job);
  return job;
}

function runJob(job, payload) {
  job.status = 'running';
  job.updatedAt = new Date().toISOString();

  const spawnArgs = job.inlineCode
    ? ['-c', job.inlineCode, ...job.args]
    : [job.entryFile, ...job.args];
  const env = {
    ...process.env,
    ...(payload && typeof payload.env === 'object' ? payload.env : {}),
  };

  appendLog(job, 'system', `Starting: ${job.pythonExecutable} ${spawnArgs.join(' ')}`);

  const child = spawn(job.pythonExecutable, spawnArgs, {
    cwd: job.dir,
    env,
    windowsHide: true,
  });

  job.process = child;

  child.stdout.on('data', chunk => appendLog(job, 'stdout', chunk.toString('utf8')));
  child.stderr.on('data', chunk => appendLog(job, 'stderr', chunk.toString('utf8')));

  child.on('error', error => {
    job.status = 'failed';
    job.error = error.message;
    job.updatedAt = new Date().toISOString();
    appendLog(job, 'system', `Process error: ${error.message}`);
  });

  child.on('close', code => {
    job.exitCode = typeof code === 'number' ? code : null;
    job.updatedAt = new Date().toISOString();

    if (job.status === 'cancelled') {
      appendLog(job, 'system', 'Job cancelled');
    } else if (code === 0) {
      job.status = 'completed';
      appendLog(job, 'system', 'Job completed successfully');
    } else {
      job.status = 'failed';
      appendLog(job, 'system', `Job failed with exit code ${code}`);
    }

    job.process = null;
  });
}

function summarizeJob(job) {
  return {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    exitCode: job.exitCode,
    error: job.error,
    dir: job.dir,
    logCount: job.logs.length,
  };
}

function parseJobId(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 2 || parts[0] !== 'jobs') {
    return null;
  }
  return parts[1];
}

function listFilesRecursive(root, prefix = '') {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files = [];

  entries.forEach(entry => {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const abs = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(abs, rel));
    } else {
      files.push(rel);
    }
  });

  return files;
}

function openFolderDialog() {
  console.log('[mlsphere-agent] Opening folder selection dialog...');
  return new Promise((resolve, reject) => {
    // Use PowerShell on Windows to open FolderBrowserDialog
    if (process.platform === 'win32') {
      // Write PowerShell script to a temporary file to avoid escaping issues
      const tempScriptPath = path.join(BASE_DIR, 'folder-picker.ps1');
      const psScript = `Add-Type -AssemblyName System.Windows.Forms
$folderBrowser = New-Object System.Windows.Forms.FolderBrowserDialog
$folderBrowser.Description = 'Select a folder for your project'
$folderBrowser.ShowNewFolderButton = $true
$result = $folderBrowser.ShowDialog()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $folderBrowser.SelectedPath
}`;

      try {
        fs.writeFileSync(tempScriptPath, psScript, 'utf8');
      } catch (err) {
        console.error('[mlsphere-agent] Failed to write temp script:', err);
        reject(err);
        return;
      }

      // Execute the script file with -Sta for Windows Forms
      const ps = spawn('powershell.exe', [
        '-Sta',
        '-ExecutionPolicy', 'Bypass',
        '-File', tempScriptPath
      ]);

      let output = '';
      let errorOutput = '';

      ps.stdout.on('data', (data) => {
        output += data.toString();
      });

      ps.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ps.on('close', (code) => {
        // Clean up temp script
        try {
          fs.unlinkSync(tempScriptPath);
        } catch (err) {
          // Ignore cleanup errors
        }

        const selectedPath = output.trim();
        console.log('[mlsphere-agent] Folder dialog closed. Code:', code, 'Path:', selectedPath);
        if (errorOutput) {
          console.log('[mlsphere-agent] Stderr:', errorOutput);
        }
        
        if (selectedPath && selectedPath.length > 0 && !selectedPath.includes('ERROR')) {
          resolve(selectedPath);
        } else {
          console.log('[mlsphere-agent] User cancelled folder selection or error occurred');
          resolve(null); // User cancelled
        }
      });

      ps.on('error', (error) => {
        console.error('[mlsphere-agent] PowerShell spawn error:', error);
        reject(error);
      });
    } else {
      // For non-Windows platforms, return null (user will need to type path)
      resolve(null);
    }
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || `${HOST}:${ACTIVE_PORT}`}`);
  const pathname = url.pathname;

  try {
    if (req.method === 'GET' && pathname === '/select-folder') {
      // Open native folder picker dialog
      console.log('[mlsphere-agent] Received /select-folder request');
      try {
        const selectedPath = await openFolderDialog();
        if (selectedPath) {
          console.log('[mlsphere-agent] Returning selected path:', selectedPath);
          json(res, 200, { ok: true, path: selectedPath });
        } else {
          console.log('[mlsphere-agent] Folder selection cancelled');
          json(res, 200, { ok: false, cancelled: true });
        }
      } catch (error) {
        console.error('[mlsphere-agent] Folder dialog error:', error);
        json(res, 500, { ok: false, error: 'Failed to open folder dialog', message: error.message });
      }
      return;
    }

    // MLSphere identification endpoint for port discovery
    if (req.method === 'GET' && pathname === '/identify') {
      json(res, 200, {
        service: 'mlsphere-local-server',
        version: '1.0.0',
        key: 'mlsphere-2026',
        host: HOST,
        port: ACTIVE_PORT,
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/active-ports') {
      try {
        const ports = await getActiveLocalPorts();
        json(res, 200, {
          ok: true,
          ports: ports,
          count: ports.length
        });
      } catch (error) {
        json(res, 500, { 
          ok: false, 
          error: 'Failed to get active ports', 
          message: error.message 
        });
      }
      return;
    }

    if (req.method === 'GET' && pathname === '/health') {
      json(res, 200, {
        ok: true,
        host: HOST,
        port: ACTIVE_PORT,
        jobs: jobs.size,
        jobsDir: JOBS_DIR,
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/control/restart') {
      json(res, 200, {
        ok: true,
        restarting: true,
        host: HOST,
        port: ACTIVE_PORT,
      });
      restartAgentProcess();
      return;
    }

    if (req.method === 'POST' && pathname === '/jobs') {
      try {
        const payload = await readBody(req);
        const job = createJob(payload);
        runJob(job, payload);
        json(res, 201, { job: summarizeJob(job) });
      } catch (error) {
        if (error.message.includes('too large') || error.message.includes('Too many')) {
          json(res, 413, { error: 'Payload error', message: error.message });
        } else {
          throw error;
        }
      }
      return;
    }

    if (req.method === 'GET' && pathname === '/jobs') {
      const jobList = Array.from(jobs.values()).map(summarizeJob);
      json(res, 200, { jobs: jobList });
      return;
    }

    if (req.method === 'GET' && pathname.startsWith('/jobs/')) {
      const jobId = parseJobId(pathname);
      const job = jobId ? jobs.get(jobId) : null;
      if (!job) {
        json(res, 404, { error: 'Job not found' });
        return;
      }

      if (pathname.endsWith('/logs')) {
        const since = Number(url.searchParams.get('since') || 0);
        const logs = job.logs.filter(item => item.cursor >= since);
        json(res, 200, {
          job: summarizeJob(job),
          logs,
          nextCursor: job.logs.length,
        });
        return;
      }

      if (pathname.endsWith('/files')) {
        const files = fs.existsSync(job.dir) ? listFilesRecursive(job.dir) : [];
        json(res, 200, { files });
        return;
      }

      if (pathname.endsWith('/file')) {
        const rel = safeRelative(url.searchParams.get('path'));
        if (!rel) {
          json(res, 400, { error: 'Invalid path' });
          return;
        }

        const abs = path.join(job.dir, rel);
        if (!abs.startsWith(job.dir) || !fs.existsSync(abs)) {
          json(res, 404, { error: 'File not found' });
          return;
        }

        const content = fs.readFileSync(abs, 'utf8');
        json(res, 200, { path: rel, content });
        return;
      }

      json(res, 200, { job: summarizeJob(job) });
      return;
    }

    if (req.method === 'POST' && pathname.startsWith('/jobs/') && pathname.endsWith('/cancel')) {
      const jobId = parseJobId(pathname);
      const job = jobId ? jobs.get(jobId) : null;
      if (!job) {
        json(res, 404, { error: 'Job not found' });
        return;
      }

      if (job.process && job.status === 'running') {
        job.status = 'cancelled';
        job.updatedAt = new Date().toISOString();
        job.process.kill('SIGTERM');
      }

      json(res, 200, { job: summarizeJob(job) });
      return;
    }

    if (req.method === 'PUT' && pathname.startsWith('/jobs/') && pathname.endsWith('/file')) {
      const jobId = parseJobId(pathname);
      const job = jobId ? jobs.get(jobId) : null;
      if (!job) {
        json(res, 404, { error: 'Job not found' });
        return;
      }

      const payload = await readBody(req);
      const rel = safeRelative(payload.path);
      if (!rel) {
        json(res, 400, { error: 'Invalid path' });
        return;
      }

      const abs = path.join(job.dir, rel);
      if (!abs.startsWith(job.dir)) {
        json(res, 400, { error: 'Invalid path scope' });
        return;
      }

      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, typeof payload.content === 'string' ? payload.content : '', 'utf8');
      job.updatedAt = new Date().toISOString();

      json(res, 200, { ok: true, path: rel });
      return;
    }

    if (req.method === 'POST' && pathname.startsWith('/projects/') && pathname.endsWith('/link')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length < 2) {
        json(res, 400, { error: 'Invalid path' });
        return;
      }

      const projectId = String(parts[1]);
      const payload = await readBody(req);
      const localRootPath = normalizeLocalRootPath(payload.localRootPath);
      const requireEmpty = Boolean(payload.requireEmpty);

      if (!localRootPath) {
        json(res, 400, { error: 'Invalid localRootPath' });
        return;
      }

      try {
        fs.mkdirSync(localRootPath, { recursive: true });
      } catch (error) {
        json(res, 500, { error: 'Failed to prepare local root path', message: error.message });
        return;
      }

      let stat;
      try {
        stat = fs.statSync(localRootPath);
      } catch (error) {
        json(res, 400, { error: 'Local root path is not accessible', message: error.message });
        return;
      }

      if (!stat.isDirectory()) {
        json(res, 400, { error: 'localRootPath must be a directory' });
        return;
      }

      if (requireEmpty && !isDirectoryEmpty(localRootPath)) {
        json(res, 400, { error: 'Selected folder is not empty' });
        return;
      }

      projectLinks.set(projectId, localRootPath);

      try {
        saveProjectLinks();
      } catch (error) {
        json(res, 500, { error: 'Failed to persist project link', message: error.message });
        return;
      }

      json(res, 200, { ok: true, projectId, localRootPath });
      return;
    }

    if (req.method === 'GET' && pathname.startsWith('/projects/') && pathname.endsWith('/link')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length < 2) {
        json(res, 400, { error: 'Invalid path' });
        return;
      }

      const projectId = String(parts[1]);
      const localRootPath = projectLinks.get(projectId) || null;
      json(res, 200, {
        projectId,
        linked: Boolean(localRootPath),
        localRootPath,
      });
      return;
    }

    // Project file endpoints - for storing imported project files on disk
    if (req.method === 'GET' && pathname.startsWith('/projects/') && pathname.endsWith('/file')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length < 2) {
        json(res, 400, { error: 'Invalid path' });
        return;
      }
      
      const projectId = parts[1];
      const filePath = url.searchParams.get('path');
      const rel = safeRelative(filePath);
      
      if (!rel) {
        json(res, 400, { error: 'Invalid file path' });
        return;
      }

      const projectBaseDir = getProjectBaseDir(projectId);
      const abs = path.join(projectBaseDir, rel);
      if (!abs.startsWith(projectBaseDir) || !fs.existsSync(abs)) {
        json(res, 404, { error: 'File not found' });
        return;
      }

      try {
        const content = fs.readFileSync(abs, 'utf8');
        json(res, 200, { path: rel, content });
      } catch (error) {
        json(res, 500, { error: 'Failed to read file', message: error.message });
      }
      return;
    }

    if (req.method === 'PUT' && pathname.startsWith('/projects/') && pathname.endsWith('/file')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length < 2) {
        json(res, 400, { error: 'Invalid path' });
        return;
      }

      const projectId = parts[1];
      const payload = await readBody(req);
      const rel = safeRelative(payload.path);
      
      if (!rel) {
        json(res, 400, { error: 'Invalid file path' });
        return;
      }

      const projectBaseDir = getProjectBaseDir(projectId);
      const abs = path.join(projectBaseDir, rel);
      if (!abs.startsWith(projectBaseDir)) {
        json(res, 400, { error: 'Invalid path scope' });
        return;
      }

      try {
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, typeof payload.content === 'string' ? payload.content : '', 'utf8');
        json(res, 200, { ok: true, path: rel });
      } catch (error) {
        json(res, 500, { error: 'Failed to write file', message: error.message });
      }
      return;
    }

    // ---- Python version discovery ----
    if (req.method === 'GET' && pathname === '/python/versions') {
      try {
        const versions = await detectPythonVersions();
        json(res, 200, { ok: true, versions });
      } catch (error) {
        json(res, 500, { ok: false, error: 'Failed to detect Python versions', message: error.message });
      }
      return;
    }

    // ---- Virtual environment endpoints ----
    // GET /projects/{id}/venvs
    if (req.method === 'GET' && pathname.match(/^\/projects\/[^/]+\/venvs$/)) {
      const projectId = pathname.split('/')[2];
      const data = getProjectVenvData(projectId);
      const venvList = Object.values(data.venvs).map(v => ({
        ...v,
        isActive: v.name === data.activeVenv,
        pythonInVenv: getVenvPythonPath(v.venvPath),
      }));
      json(res, 200, { projectId, activeVenv: data.activeVenv, venvs: venvList });
      return;
    }

    // POST /projects/{id}/venvs  — create new venv
    if (req.method === 'POST' && pathname.match(/^\/projects\/[^/]+\/venvs$/)) {
      const projectId = pathname.split('/')[2];
      const payload = await readBody(req);
      const venvName = String(payload.name || '').trim().replace(/[^a-zA-Z0-9_\-]/g, '');
      const pythonExecutable = String(payload.pythonExecutable || 'python').trim();

      if (!venvName) {
        json(res, 400, { error: 'Invalid venv name' });
        return;
      }

      const data = getProjectVenvData(projectId);
      if (data.venvs[venvName]) {
        json(res, 409, { error: `Venv "${venvName}" already exists` });
        return;
      }

      const venvPath = path.join(VENVS_DIR, projectId, venvName);
      fs.mkdirSync(path.dirname(venvPath), { recursive: true });

      // Get Python version before creating venv
      const versionResult = await spawnAndWait(pythonExecutable, ['--version']);
      const versionRaw = (versionResult.stdout + versionResult.stderr).trim();
      const versionMatch = versionRaw.match(/Python (\d+\.\d+\.\d+)/i);

      if (versionResult.exitCode !== 0 || !versionMatch) {
        json(res, 400, { error: `Python executable "${pythonExecutable}" not found or failed`, detail: versionRaw });
        return;
      }

      const pythonVersion = versionMatch[1];

      // Create the venv
      const result = await spawnAndWait(pythonExecutable, ['-m', 'venv', venvPath]);
      if (result.exitCode !== 0) {
        json(res, 500, { error: 'Failed to create virtual environment', detail: result.stderr || result.stdout });
        return;
      }

      const venvInfo = {
        name: venvName,
        pythonExecutable,
        pythonVersion,
        venvPath,
        createdAt: new Date().toISOString(),
      };

      data.venvs[venvName] = venvInfo;
      saveProjectVenvs();

      json(res, 201, {
        ok: true,
        venv: { ...venvInfo, isActive: venvName === data.activeVenv, pythonInVenv: getVenvPythonPath(venvPath) },
      });
      return;
    }

    // DELETE /projects/{id}/venvs/{venvName}
    if (req.method === 'DELETE' && pathname.match(/^\/projects\/[^/]+\/venvs\/[^/]+$/)) {
      const parts = pathname.split('/');
      const projectId = parts[2];
      const venvName = parts[4];
      const data = getProjectVenvData(projectId);

      if (!data.venvs[venvName]) {
        json(res, 404, { error: `Venv "${venvName}" not found` });
        return;
      }

      const venvPath = data.venvs[venvName].venvPath;
      delete data.venvs[venvName];
      if (data.activeVenv === venvName) data.activeVenv = null;
      saveProjectVenvs();

      // Remove venv directory async (best-effort)
      try { fs.rmSync(venvPath, { recursive: true, force: true }); } catch (_) {}

      json(res, 200, { ok: true });
      return;
    }

    // POST /projects/{id}/venvs/{venvName}/activate
    if (req.method === 'POST' && pathname.match(/^\/projects\/[^/]+\/venvs\/[^/]+\/activate$/)) {
      const parts = pathname.split('/');
      const projectId = parts[2];
      const venvName = parts[4];
      const data = getProjectVenvData(projectId);

      if (!data.venvs[venvName]) {
        json(res, 404, { error: `Venv "${venvName}" not found` });
        return;
      }

      data.activeVenv = venvName;
      saveProjectVenvs();
      const venvPath = data.venvs[venvName].venvPath;
      json(res, 200, { ok: true, activeVenv: venvName, pythonInVenv: getVenvPythonPath(venvPath) });
      return;
    }

    // POST /projects/{id}/venvs/deactivate
    if (req.method === 'POST' && pathname.match(/^\/projects\/[^/]+\/venvs\/deactivate$/)) {
      const projectId = pathname.split('/')[2];
      const data = getProjectVenvData(projectId);
      data.activeVenv = null;
      saveProjectVenvs();
      json(res, 200, { ok: true, activeVenv: null });
      return;
    }

    // POST /projects/{id}/venvs/{venvName}/install  — install packages
    if (req.method === 'POST' && pathname.match(/^\/projects\/[^/]+\/venvs\/[^/]+\/install$/)) {
      const parts = pathname.split('/');
      const projectId = parts[2];
      const venvName = parts[4];
      const data = getProjectVenvData(projectId);

      if (!data.venvs[venvName]) {
        json(res, 404, { error: `Venv "${venvName}" not found` });
        return;
      }

      const payload = await readBody(req);
      const packages = Array.isArray(payload.packages) ? payload.packages.map(String).filter(Boolean) : [];
      const requirementFiles = Array.isArray(payload.requirementFiles)
        ? payload.requirementFiles.map(String).filter(Boolean)
        : [];

      if (packages.length === 0 && requirementFiles.length === 0) {
        json(res, 400, { error: 'No packages or requirement files specified' });
        return;
      }

      const venvPath = data.venvs[venvName].venvPath;
      const pipExe = getVenvPipPath(venvPath);

      const args = ['install'];
      requirementFiles.forEach(f => { args.push('-r', f); });
      packages.forEach(p => args.push(p));

      const op = createInstallOp(projectId, venvName);
      runInstallOp(op, pipExe, args);

      json(res, 202, { ok: true, opId: op.id, status: op.status });
      return;
    }

    // GET /install-ops/{opId}/logs?since=N
    if (req.method === 'GET' && pathname.match(/^\/install-ops\/[^/]+\/logs$/)) {
      const opId = pathname.split('/')[2];
      const op = installOps.get(opId);
      if (!op) {
        json(res, 404, { error: 'Install operation not found' });
        return;
      }
      const since = Number(url.searchParams.get('since') || 0);
      const logs = op.logs.filter(item => item.cursor >= since);
      json(res, 200, { status: op.status, logs, nextCursor: op.logs.length });
      return;
    }

    json(res, 404, { error: 'Not found' });
  } catch (error) {
    json(res, 500, {
      error: 'Internal server error',
      message: error.message,
    });
  }
});

function listenWithPortFallback(port) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('[mlsphere-agent] no available port to bind.');
    process.exit(1);
    return;
  }

  server.once('error', (error) => {
    if (error && error.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      if (nextPort > 65535) {
        console.error(`[mlsphere-agent] port ${port} is in use and no higher ports are available.`);
        process.exit(1);
        return;
      }
      console.warn(`[mlsphere-agent] port ${port} is in use, trying ${nextPort}...`);
      listenWithPortFallback(nextPort);
      return;
    }

    console.error('[mlsphere-agent] failed to start server:', error?.message || error);
    process.exit(1);
  });

  server.listen(port, HOST, () => {
    ACTIVE_PORT = port;
    if (ACTIVE_PORT !== REQUESTED_PORT) {
      console.warn(`[mlsphere-agent] requested port ${REQUESTED_PORT} unavailable, started on ${ACTIVE_PORT}.`);
    }
    console.log(`[mlsphere-agent] listening on http://${HOST}:${ACTIVE_PORT}`);
  });
}

listenWithPortFallback(REQUESTED_PORT);
