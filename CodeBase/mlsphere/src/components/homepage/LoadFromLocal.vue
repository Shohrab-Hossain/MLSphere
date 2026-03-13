<template>
  <section class="load-section">
    <h2 class="section-title">📁 Load from Local</h2>
    <p class="section-subtitle">Import an existing project folder from your workspace</p>
    
    <div class="load-options">
      <div class="load-card load-card-single">
        <div class="load-icon">📂</div>
        <h3>Load Project Folder</h3>
        <p>Select a folder to import. Catalog mapping can be configured after loading.</p>
        <label class="file-input-label">
          <input 
            type="file" 
            webkitdirectory
            @change="$emit('load-from-python-project', $event)"
            class="file-input"
          />
          <span class="file-input-btn">Choose Folder</span>
        </label>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'LoadFromLocal',
  emits: ['load-from-python-project']
};
</script>

<style scoped>
/* Load section styles will be inherited from dashboard.css */
</style>
