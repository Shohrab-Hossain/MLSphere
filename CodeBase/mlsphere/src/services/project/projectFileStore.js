const DB_NAME = 'mlsphere-files-db';
const DB_VERSION = 1;
const STORE_NAME = 'project_files';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'projectId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

function sanitizeFiles(files) {
  return (Array.isArray(files) ? files : []).map(file => ({
    name: file?.name || '',
    path: file?.path || '',
    relativePath: file?.relativePath || file?.path || '',
    size: Number(file?.size || 0),
    type: file?.type || '',
    content: typeof file?.content === 'string' ? file.content : ''
  }));
}

export async function saveProjectFiles(projectId, files) {
  if (!projectId) return;
  const db = await openDb();

  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({
      projectId,
      files: sanitizeFiles(files),
      updatedAt: new Date().toISOString()
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed to save project files'));
    tx.onabort = () => reject(tx.error || new Error('Failed to save project files'));
  });

  db.close();
}

export async function loadProjectFiles(projectId) {
  if (!projectId) return [];
  const db = await openDb();

  const tryGet = (key) => new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });

  let result = await tryGet(projectId);
  if (!result) {
    // Fallback: try alternate type (number↔string) to handle legacy key-type mismatches
    const altKey = typeof projectId === 'string' ? Number(projectId) : String(projectId);
    if (altKey && !Number.isNaN(Number(altKey))) {
      result = await tryGet(altKey);
    }
  }

  db.close();
  return sanitizeFiles(result?.files || []);
}

export async function deleteProjectFiles(projectId) {
  if (!projectId) return;
  const db = await openDb();

  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(projectId);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed to delete project files'));
    tx.onabort = () => reject(tx.error || new Error('Failed to delete project files'));
  });

  db.close();
}
