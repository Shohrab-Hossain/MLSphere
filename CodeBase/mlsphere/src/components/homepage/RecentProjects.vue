<template>
  <section v-if="projects.length > 0" class="recent-section" data-section="recent">
    <h2 class="section-title">📚 Recent Projects</h2>
    
    <div class="projects-list">
      <div 
        v-for="project in projects" 
        :key="project.id"
        class="project-item"
      >
        <div class="project-info">
          <h4 class="project-name">{{ project.name }}</h4>
          <p class="project-meta">
            {{ project.type }} • Last modified: {{ formatDate(project.lastModified) }}
          </p>
        </div>
        <div class="project-item-actions">
          <button class="project-open-btn" @click="$emit('load-project', project)">Open</button>
          <button class="project-delete-btn" @click="$emit('delete-project', project.id)">Delete</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'RecentProjects',
  props: {
    projects: {
      type: Array,
      default: () => []
    }
  },
  emits: ['load-project', 'delete-project'],
  methods: {
    formatDate(date) {
      if (!date) return 'Never';
      const d = new Date(date);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }
};
</script>

<style scoped>
/* Recent projects styles will be inherited from dashboard.css */
</style>
