# Block-based Modular Architecture

## Recommended folder structure

```text
src/
  blocks/
    core/
      defineBlock.js
      discoverBlocks.js
      registerBlocks.js
    AuthBlock/
      block.config.js
      index.js
      packages/
        UserManagement/
          index.js
        Permissions/
          index.js
    EditorBlock/
      block.config.js
      index.js
      packages/
        CustomToolbar/
          index.js
    AnalyticsBlock/
      block.config.js
      index.js
      components/
        TrainingPanel.vue
```

## How block registration works

1. Each block declares metadata in `block.config.js` using `defineBlock(...)`.
2. `discoverBlocks.js` uses `import.meta.glob('../*/block.config.js')` to discover all blocks.
3. `registerBlocks.js` loads each block config, then runs each block `setup()` lazily.
4. Block setup loads `index.js`, where exports are explicitly controlled.

## Package scoping rule

- Packages exist only inside `src/blocks/<BlockName>/packages/*`.
- Import style:

```js
import { useUsers } from '@/blocks/AuthBlock/packages/UserManagement';
```

This keeps package ownership explicit and prevents global namespace pollution.

## Cross-block dependency rule

- A block can consume another block only through explicit exports from that block's `index.ts`.
- Avoid importing from another block's internal `components/` or `packages/` directly.

## Dynamic registration example (Vue 3 + Vite)

```ts
import { createApp } from 'vue';
import App from '@/App.vue';
import { registerDiscoveredBlocks } from '@/blocks/core/registerBlocks';

const app = createApp(App);
await registerDiscoveredBlocks(app);
app.mount('#app');
```
