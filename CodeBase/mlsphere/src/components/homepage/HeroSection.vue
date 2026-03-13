<template>
  <div class="dashboard-header">
    <div class="hero">
      <h1 class="hero-title">
        <span class="hero-emoji">🧠</span>
        ML Block Builder
      </h1>
      <p class="hero-subtitle">Visual Machine Learning Pipeline Creator</p>
      <p class="hero-subtext">Build, train, and deploy ML models with our intuitive block-based visual editor. No coding required.</p>
      <div class="hero-cta">
        <button class="hero-primary-btn" @click="$emit('scroll-to-templates')">Get Started</button>
        <a href="#" class="hero-secondary-btn" @click.prevent="$emit('scroll-to-guide')">Learn More</a>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HeroSection',
  emits: ['scroll-to-templates', 'scroll-to-guide']
};
</script>

<style scoped>
/* Hero section styles will be inherited from dashboard.css */
</style>
