/**
 * Discover all block configurations in the blocks directory
 * @returns {Array} Array of block definitions
 */
export function discoverBlocks() {
  // require.context is provided by webpack (used by @vue/cli-service)
  const context = require.context('../', true, /block\.config\.js$/);

  return context.keys()
    .map((key) => context(key).default)
    .filter((config) => Boolean(config?.name));
}
