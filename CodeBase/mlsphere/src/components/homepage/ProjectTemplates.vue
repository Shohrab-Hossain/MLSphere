<template>
  <section class="templates-section" data-section="templates">
    <h2 class="section-title">🧩 Start from Template</h2>
    <p class="section-subtitle">Choose a predefined project template to get started quickly</p>
    
    <div class="templates-grid">
      <div 
        v-for="template in templates" 
        :key="template.id"
        class="template-card"
        @click="$emit('select-template', template)"
      >
        <div class="template-icon">{{ template.icon }}</div>
        <h3 class="template-name">{{ template.name }}</h3>
        <p class="template-description">{{ template.description }}</p>
        <div class="template-features">
          <span v-for="feature in template.features" :key="feature" class="feature-tag">
            {{ feature }}
          </span>
        </div>
        <button class="template-btn">Create Project</button>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'ProjectTemplates',
  props: {
    templates: {
      type: Array,
      required: true
    }
  },
  emits: ['select-template']
};
</script>

<style scoped>
/* Template section styles will be inherited from dashboard.css */
</style>
