import { defineBlock } from '@/blocks/core/defineBlock.js';

export default defineBlock({
  name: 'AuthBlock',
  version: '1.0.0',
  packages: ['UserManagement', 'Permissions'],
  setup: async () => {
    const block = await import('./index.js');
    await block.install?.();
  },
});
