import { defineBlock } from '@/blocks/core/defineBlock.js';

export default defineBlock({
  name: 'EditorBlock',
  version: '1.0.0',
  packages: ['CustomToolbar'],
  setup: async () => {
    const block = await import('./index.js');
    await block.install?.();
  },
});
