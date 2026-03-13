import { registerDiscoveredBlocks } from './core/registerBlocks.js';

/**
 * Bootstrap all blocks in the application
 * @param {Object} app - Vue app instance
 * @returns {Promise<void>}
 */
export async function bootstrapBlocks(app) {
  await registerDiscoveredBlocks(app);
}
