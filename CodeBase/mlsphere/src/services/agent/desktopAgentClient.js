const DEFAULT_BASE_URL = 'http://127.0.0.1:51751';
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds for regular requests
const HEALTH_CHECK_TIMEOUT_MS = 5000; // 5 seconds for health checks
const FILE_OPERATION_TIMEOUT_MS = 60000; // 60 seconds for file operations
const FOLDER_PICKER_TIMEOUT_MS = 300000; // 5 minutes for folder selection (user interaction)
const PORT_DISCOVERY_TIMEOUT_MS = 2000; // 2 seconds per port during discovery
const PORT_RANGE_START = 51751;
const PORT_RANGE_END = 51760;

// MLSphere server identification (for port discovery)
const MLSPHERE_SERVICE_NAME = 'mlsphere-local-server';
const MLSPHERE_SERVICE_KEY = 'mlsphere-2026';

// Cache for discovered port
let cachedDiscoveredPort = null;

function getCachedPort() {
  if (cachedDiscoveredPort) return cachedDiscoveredPort;
  try {
    const stored = localStorage.getItem('mlsphere-server-port');
    if (stored) {
      cachedDiscoveredPort = parseInt(stored, 10);
      return cachedDiscoveredPort;
    }
  } catch (e) {
    // localStorage not available
  }
  return null;
}

function setCachedPort(port) {
  cachedDiscoveredPort = port;
  try {
    localStorage.setItem('mlsphere-server-port', String(port));
  } catch (e) {
    // localStorage not available
  }
}

export function clearCachedPort() {
  cachedDiscoveredPort = null;
  try {
    localStorage.removeItem('mlsphere-server-port');
  } catch (e) {
    // localStorage not available
  }
}

function resolveBaseUrl() {
  const value = typeof window !== 'undefined' && window.__MLSPHERE_AGENT_URL__
    ? window.__MLSPHERE_AGENT_URL__
    : process.env.VUE_APP_ML_AGENT_URL;

  // If URL is set explicitly, use it
  if (value) {
    return value.replace(/\/$/, '');
  }

  // Check if we have a cached port
  const cachedPort = getCachedPort();
  if (cachedPort) {
    return `http://127.0.0.1:${cachedPort}`;
  }

  return DEFAULT_BASE_URL.replace(/\/$/, '');
}

export function getDesktopAgentBaseUrl() {
  return resolveBaseUrl();
}

export function getDesktopAgentPlatform() {
  if (typeof navigator === 'undefined') {
    return 'windows';
  }

  const platform = String(navigator.userAgentData?.platform || navigator.platform || '').toLowerCase();
  if (platform.includes('mac')) {
    return 'macos';
  }
  if (platform.includes('linux')) {
    return 'linux';
  }
  return 'windows';
}

export function getDesktopAgentDownloadUrl() {
  const platform = getDesktopAgentPlatform();
  const platformEnvMap = {
    windows: process.env.VUE_APP_AGENT_DOWNLOAD_URL_WINDOWS,
    macos: process.env.VUE_APP_AGENT_DOWNLOAD_URL_MACOS,
    linux: process.env.VUE_APP_AGENT_DOWNLOAD_URL_LINUX,
  };

  // Allow environment variable override
  if (platformEnvMap[platform]) {
    return platformEnvMap[platform];
  }
  if (process.env.VUE_APP_AGENT_DOWNLOAD_URL) {
    return process.env.VUE_APP_AGENT_DOWNLOAD_URL;
  }

  // Default: serve from local /downloads folder (public folder)
  const localDownloads = {
    windows: '/downloads/mlsphere-agent-win-x64.exe',
    macos: '/downloads/mlsphere-agent-macos-x64', // Will show both Intel and ARM options
    linux: '/downloads/mlsphere-agent-linux-x64',
  };

  return localDownloads[platform] || localDownloads.windows;
}

export function getDesktopAgentLaunchUrl() {
  return process.env.VUE_APP_AGENT_LAUNCH_URL || 'mlsphere-agent://start';
}

async function request(path, options = {}) {
  const baseUrl = resolveBaseUrl();
  const timeoutMs = options.timeout || DEFAULT_TIMEOUT_MS;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data?.message || data?.error || `Request failed: ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle abort errors (timeout)
    if (error.name === 'AbortError') {
      throw new Error(`Connection timeout after ${timeoutMs}ms - server is not responding. Make sure the desktop agent is running.`);
    }
    
    // Handle network errors - CORS or connection refused
    if (error instanceof TypeError) {
      if (error.message.includes('fetch') || error.message.toLowerCase().includes('cors') || error.message.toLowerCase().includes('network')) {
        throw new Error('Agent is not running. Please download and start the desktop agent first.');
      }
    }
    
    throw error;
  }
}

export async function desktopAgentHealth() {
  const response = await request('/health', { timeout: HEALTH_CHECK_TIMEOUT_MS });
  // Verify response has expected structure
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid health check response');
  }
  return response;
}

// Check health on a specific port
async function checkPortHealth(port) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PORT_DISCOVERY_TIMEOUT_MS);
  
  try {
    const response = await fetch(`http://127.0.0.1:${port}/identify`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    if (response.ok) {
      const data = await response.json();
      // Verify this is actually the MLSphere server by checking the key
      if (data &&
          data.service === MLSPHERE_SERVICE_NAME &&
          data.key === MLSPHERE_SERVICE_KEY) {
        clearTimeout(timeoutId);
        return { port, data };
      }
    }
    clearTimeout(timeoutId);
    return null;
  } catch (error) {
    clearTimeout(timeoutId);
    return null;
  }
}

export async function verifyServerPort(port) {
  const parsedPort = parseInt(port, 10);
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    return null;
  }
  return checkPortHealth(parsedPort);
}

export async function discoverAvailableServerPorts(customPorts = []) {
  const portsToCheck = [];

  const cached = getCachedPort();
  if (cached) {
    portsToCheck.push(cached);
  }

  customPorts.forEach(port => {
    const parsedPort = parseInt(port, 10);
    if (Number.isInteger(parsedPort) && parsedPort >= 1 && parsedPort <= 65535 && !portsToCheck.includes(parsedPort)) {
      portsToCheck.push(parsedPort);
    }
  });

  for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
    if (!portsToCheck.includes(port)) {
      portsToCheck.push(port);
    }
  }

  const results = await Promise.all(portsToCheck.map(port => checkPortHealth(port)));
  const mlsphereServers = results.filter(result => result !== null);

  return {
    mlsphereServers
  };
}

// Discover server port by checking a range of ports
export async function discoverServerPort(customPorts = []) {
  // Build list of ports to check
  const portsToCheck = [];
  
  // 1. Check cached port first
  const cached = getCachedPort();
  if (cached) {
    portsToCheck.push(cached);
  }
  
  // 2. Add custom ports
  customPorts.forEach(p => {
    if (p && !portsToCheck.includes(p)) {
      portsToCheck.push(p);
    }
  });
  
  // 3. Fall back to default range
  for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
    if (!portsToCheck.includes(port)) {
      portsToCheck.push(port);
    }
  }
  
  // Check all ports in parallel
  const results = await Promise.all(
    portsToCheck.map(port => checkPortHealth(port))
  );
  
  // Find first successful result
  const found = results.find(r => r !== null);
  if (found) {
    setCachedPort(found.port);
    return found;
  }
  
  return null;
}

export async function restartDesktopAgent() {
  return request('/control/restart', {
    method: 'POST',
    timeout: HEALTH_CHECK_TIMEOUT_MS,
  });
}

export async function selectFolder() {
  // Use extended timeout for folder picker since user needs time to browse and select
  return request('/select-folder', { timeout: FOLDER_PICKER_TIMEOUT_MS });
}

export async function submitPythonJob(payload) {
  return request('/jobs', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
    timeout: DEFAULT_TIMEOUT_MS,
  });
}

export async function getJobStatus(jobId) {
  return request(`/jobs/${encodeURIComponent(jobId)}`, { timeout: HEALTH_CHECK_TIMEOUT_MS });
}

export async function getJobLogs(jobId, since = 0) {
  return request(`/jobs/${encodeURIComponent(jobId)}/logs?since=${Number(since) || 0}`, { timeout: DEFAULT_TIMEOUT_MS });
}

export async function cancelJob(jobId) {
  return request(`/jobs/${encodeURIComponent(jobId)}/cancel`, {
    method: 'POST',
    timeout: HEALTH_CHECK_TIMEOUT_MS,
  });
}

export async function listJobFiles(jobId) {
  return request(`/jobs/${encodeURIComponent(jobId)}/files`, { timeout: FILE_OPERATION_TIMEOUT_MS });
}

export async function readJobFile(jobId, filePath) {
  return request(`/jobs/${encodeURIComponent(jobId)}/file?path=${encodeURIComponent(filePath)}`, { timeout: FILE_OPERATION_TIMEOUT_MS });
}

export async function writeJobFile(jobId, filePath, content) {
  return request(`/jobs/${encodeURIComponent(jobId)}/file`, {
    method: 'PUT',
    body: JSON.stringify({
      path: filePath,
      content: typeof content === 'string' ? content : '',
    }),
    timeout: FILE_OPERATION_TIMEOUT_MS,
  });
}

// Project file management endpoints - for storing imported files on disk
export async function readProjectFile(projectId, filePath) {
  return request(`/projects/${encodeURIComponent(projectId)}/file?path=${encodeURIComponent(filePath)}`, { timeout: FILE_OPERATION_TIMEOUT_MS });
}

export async function writeProjectFile(projectId, filePath, content) {
  return request(`/projects/${encodeURIComponent(projectId)}/file`, {
    method: 'PUT',
    body: JSON.stringify({
      path: filePath,
      content: typeof content === 'string' ? content : '',
    }),
    timeout: FILE_OPERATION_TIMEOUT_MS,
  });
}

export async function linkProjectFolder(projectId, localRootPath, options = {}) {
  return request(`/projects/${encodeURIComponent(projectId)}/link`, {
    method: 'POST',
    body: JSON.stringify({
      localRootPath,
      requireEmpty: Boolean(options.requireEmpty),
    }),
    timeout: FILE_OPERATION_TIMEOUT_MS,
  });
}

export async function getProjectFolderLink(projectId) {
  return request(`/projects/${encodeURIComponent(projectId)}/link`, {
    timeout: FILE_OPERATION_TIMEOUT_MS,
  });
}

// ---- Virtual Environment API ----

export async function listPythonVersions() {
  return request('/python/versions', { timeout: DEFAULT_TIMEOUT_MS });
}

export async function listProjectVenvs(projectId) {
  return request(`/projects/${encodeURIComponent(projectId)}/venvs`, { timeout: FILE_OPERATION_TIMEOUT_MS });
}

export async function createProjectVenv(projectId, { name, pythonExecutable }) {
  return request(`/projects/${encodeURIComponent(projectId)}/venvs`, {
    method: 'POST',
    body: JSON.stringify({ name, pythonExecutable }),
    timeout: 120000, // venv creation can take a moment
  });
}

export async function deleteProjectVenv(projectId, venvName) {
  return request(`/projects/${encodeURIComponent(projectId)}/venvs/${encodeURIComponent(venvName)}`, {
    method: 'DELETE',
    timeout: FILE_OPERATION_TIMEOUT_MS,
  });
}

export async function activateProjectVenv(projectId, venvName) {
  return request(`/projects/${encodeURIComponent(projectId)}/venvs/${encodeURIComponent(venvName)}/activate`, {
    method: 'POST',
    timeout: FILE_OPERATION_TIMEOUT_MS,
  });
}

export async function deactivateProjectVenv(projectId) {
  return request(`/projects/${encodeURIComponent(projectId)}/venvs/deactivate`, {
    method: 'POST',
    timeout: FILE_OPERATION_TIMEOUT_MS,
  });
}

export async function installProjectPackages(projectId, venvName, { packages = [], requirementFiles = [] }) {
  return request(`/projects/${encodeURIComponent(projectId)}/venvs/${encodeURIComponent(venvName)}/install`, {
    method: 'POST',
    body: JSON.stringify({ packages, requirementFiles }),
    timeout: DEFAULT_TIMEOUT_MS,
  });
}

export async function getInstallOpLogs(opId, since = 0) {
  return request(`/install-ops/${encodeURIComponent(opId)}/logs?since=${Number(since) || 0}`, {
    timeout: DEFAULT_TIMEOUT_MS,
  });
}

export async function syncProjectFiles(projectId, files) {
  const fileList = Array.isArray(files) ? files : [];

  for (const file of fileList) {
    const path = String(file?.path || file?.relativePath || '').trim();
    if (!path) {
      continue;
    }
    const content = typeof file?.content === 'string' ? file.content : '';
    await writeProjectFile(projectId, path, content);
  }
}
