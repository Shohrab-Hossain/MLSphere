import { createToolbarItems } from './packages/CustomToolbar/index.js';

export async function install() {
  const toolbar = createToolbarItems();

  if (typeof window !== 'undefined') {
    window.__editorBlock = toolbar;
  }
}

export { createToolbarItems } from './packages/CustomToolbar/index.js';
