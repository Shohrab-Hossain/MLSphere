/**
 * Loads ML project templates from the centralized public/templates/ directory.
 *
 * Directory layout:
 *   public/templates/index.json               — list of all template ids
 *   public/templates/<id>/metadata.json       — display info + block definitions (with file paths)
 *   public/templates/<id>/src/*.py            — real Python source files (one per block)
 *   public/templates/<id>/requirements.txt    — Python package requirements
 *
 * Adding a new template: create a new folder under public/templates/ with the
 * same structure and add an entry to index.json. No code changes needed.
 */

const BASE = '/templates';

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

async function fetchJson(url) {
  const text = await fetchText(url);
  return JSON.parse(text);
}

/**
 * Load the template index (list of available template IDs/paths).
 * @returns {Promise<Array<{id: string, path: string|null}>>}
 */
export async function loadTemplateIndex() {
  return fetchJson(`${BASE}/index.json`);
}

/**
 * Load metadata (display info + block definitions) for a single template.
 * @param {string} templateId
 * @returns {Promise<Object>} metadata object from metadata.json
 */
export async function loadTemplateMetadata(templateId) {
  return fetchJson(`${BASE}/${templateId}/metadata.json`);
}

/**
 * Load the requirements.txt content for a template.
 * @param {string} templateId
 * @returns {Promise<string>}
 */
export async function loadTemplateRequirements(templateId) {
  try {
    return await fetchText(`${BASE}/${templateId}/requirements.txt`);
  } catch {
    return '';
  }
}

/**
 * Load a single source file from the template directory.
 * @param {string} templateId
 * @param {string} filePath  - relative path inside the template dir, e.g. "src/data_loader.py"
 * @returns {Promise<string>}
 */
export async function loadTemplateFile(templateId, filePath) {
  return fetchText(`${BASE}/${templateId}/${filePath}`);
}

/**
 * Load a full template: metadata + all block source files + requirements.txt.
 * Each block in the returned object will have a `code` property populated from its .py file.
 *
 * @param {string} templateId
 * @returns {Promise<Object>}  { ...metadata, blocks: [...withCode], requirements: string, allFiles: [{path, content}] }
 */
export async function loadFullTemplate(templateId) {
  const [metadata, requirements, catalog] = await Promise.all([
    loadTemplateMetadata(templateId),
    loadTemplateRequirements(templateId),
    loadTemplateCatalog(templateId),
  ]);

  // Load each block's source file in parallel
  const blockCodes = await Promise.all(
    (metadata.blocks || []).map(blockDef =>
      loadTemplateFile(templateId, blockDef.file).catch(() => '')
    )
  );

  const blocks = (metadata.blocks || []).map((blockDef, i) => ({
    ...blockDef,
    code: blockCodes[i] || '',
    output: '',
    status: 'idle',
    config: blockDef.config || {},
  }));

  // Build the full file list for syncing to disk:
  //   src/*.py  +  requirements.txt  +  allSourceFiles (extra package files)
  const allFiles = blocks.map(b => ({ path: b.file, content: b.code }));
  allFiles.push({ path: 'requirements.txt', content: requirements });

  // Load any extra source files declared in metadata.allSourceFiles
  // (e.g., __init__.py files and non-block modules in package structure)
  const extraPaths = (metadata.allSourceFiles || []).filter(
    p => !blocks.some(b => b.file === p)
  );
  if (extraPaths.length > 0) {
    const extraContents = await Promise.all(
      extraPaths.map(p => loadTemplateFile(templateId, p).catch(() => ''))
    );
    extraPaths.forEach((p, i) => allFiles.push({ path: p, content: extraContents[i] }));
  }

  // Also fetch main.py if not already included
  const hasMain = allFiles.some(f => f.path === 'src/main.py');
  if (!hasMain) {
    try {
      const mainCode = await loadTemplateFile(templateId, 'src/main.py');
      allFiles.push({ path: 'src/main.py', content: mainCode });
    } catch { /* main.py is optional */ }
  }

  return { ...metadata, blocks, requirements, catalog, allFiles };
}

/**
 * Load the catalog.json for a template (block ↔ section mapping).
 * Never throws — returns empty array on failure.
 * @param {string} templateId
 * @returns {Promise<Array>}
 */
export async function loadTemplateCatalog(templateId) {
  try {
    return await fetchJson(`${BASE}/${templateId}/catalog.json`);
  } catch {
    return [];
  }
}

/**
 * Load display-only metadata for ALL templates (for the homepage cards).
 * Never throws — returns empty array on failure.
 * @returns {Promise<Array<Object>>}
 */
export async function loadAllTemplateMetadata() {
  try {
    const index = await loadTemplateIndex();
    const results = await Promise.allSettled(
      index.map(entry =>
        entry.path
          ? loadTemplateMetadata(entry.id).then(m => ({ ...m }))
          : Promise.resolve({ id: entry.id, name: 'Blank Project', icon: '✨', description: 'Start from scratch with a blank canvas', features: ['Custom Blocks', 'Full Flexibility'], type: 'blank' })
      )
    );
    return results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);
  } catch {
    return [];
  }
}
