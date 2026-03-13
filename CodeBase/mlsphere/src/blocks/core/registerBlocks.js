import { discoverBlocks } from './discoverBlocks.js';

export const BLOCK_REGISTRY_KEY = Symbol('block-registry');

/**
 * Create a block registry
 * @param {Object} app - Vue app instance
 * @returns {Object} Block registry with register, registerMany, and list methods
 */
export function createBlockRegistry(app) {
  const registry = new Map();

  const register = async (config) => {
    if (registry.has(config.name)) {
      return;
    }

    if (config.setup) {
      await config.setup({
        app,
        provide: (key, value) => app.provide?.(key, value),
      });
    }

    registry.set(config.name, { config });
  };

  return {
    register,
    registerMany: async (blocks) => {
      for (const block of blocks) {
        await register(block);
      }
    },
    list: () => Array.from(registry.values()),
  };
}

/**
 * Register all discovered blocks
 * @param {Object} app - Vue app instance
 * @returns {Promise<Object>} Block registry
 */
export async function registerDiscoveredBlocks(app) {
  const registry = createBlockRegistry(app);
  const blocks = await discoverBlocks();
  await registry.registerMany(blocks);
  return registry;
}

/**
 * Create a block plugin for Vue
 * @returns {Object} Plugin with install method
 */
export function createBlockPlugin() {
  return {
    install: async (app) => {
      const registry = await registerDiscoveredBlocks(app);
      app.provide?.(BLOCK_REGISTRY_KEY, registry);
    },
  };
}
