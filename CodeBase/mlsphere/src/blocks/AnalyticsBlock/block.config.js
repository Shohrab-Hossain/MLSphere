import { defineBlock } from '@/blocks/core/defineBlock.js';

export default defineBlock({
  name: 'AnalyticsBlock',
  version: '1.0.0',
  setup: async () => {
    await import('./index.js');
  },
});
