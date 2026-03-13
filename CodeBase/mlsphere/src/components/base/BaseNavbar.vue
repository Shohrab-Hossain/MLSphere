<template>
  <nav class="base-navbar" :class="{ 'navbar-hidden': isNavbarHidden && isHomePage, 'navbar-fixed': isHomePage }">
    <!-- Left: Brand + Project Name -->
    <div class="navbar-brand" @click="isHomePage ? null : $emit('go-home')">
      <img src="@/assets/logo.png" alt="MLSphere Logo" class="navbar-logo">
      <span class="navbar-text">MLSphere</span>
      <template v-if="!isHomePage && projectName">
        <span class="brand-sep">/</span>
        <span class="project-name">{{ projectName }}</span>
      </template>
    </div>

    <!-- Center: Nav Links -->
    <div class="navbar-links">
      <!-- Homepage links -->
      <template v-if="isHomePage">
        <router-link to="/" class="nav-link" :class="{ active: $route.name === 'home' }">Home</router-link>
        <a href="#" class="nav-link" @click.prevent="scrollToSection('templates')">Templates</a>
        <a href="#" class="nav-link" @click.prevent="scrollToSection('recent')">Recent</a>
        <a href="#" class="nav-link" @click.prevent="scrollToSection('quickstart')">Guide</a>
      </template>

      <!-- App page links -->
      <template v-else>
        <a
          href="#"
          class="nav-link"
          :class="{ active: currentView === 'pipeline' }"
          @click.prevent="$emit('navigate', 'pipeline')"
        >
          Pipeline
        </a>
        <a
          href="#"
          class="nav-link"
          :class="{ active: currentView === 'code-editor' }"
          @click.prevent="$emit('navigate', 'code-editor')"
        >
          Code
        </a>
        <a
          href="#"
          class="nav-link"
          :class="{ active: currentView === 'analytics' }"
          @click.prevent="$emit('navigate', 'analytics')"
        >
          Analytics
        </a>
      </template>
    </div>

    <!-- Right: Actions + Server Status -->
    <div class="navbar-right">
      <!-- App-page action buttons -->
      <template v-if="!isHomePage">
        <div class="action-group">
          <button
            class="nav-action-btn run-btn"
            :disabled="isPipelineRunning"
            @click="$emit('run-pipeline')"
            title="Run pipeline"
          >
            <span v-if="!isPipelineRunning">&#9654; Run</span>
            <span v-else>&#8987; Running</span>
          </button>
          <button
            class="nav-action-btn save-btn"
            @click="$emit('save-project')"
            title="Save project"
          >
            Save
          </button>
          <button
            class="nav-action-btn delete-btn"
            @click="$emit('clear-canvas')"
            title="Clear canvas"
          >
            Clear
          </button>
          <button
            class="nav-action-btn catalog-btn"
            @click="$emit('open-catalog')"
            title="Edit catalog mapping"
          >
            Catalog
          </button>
          <button
            v-if="currentProjectType === 'python-import'"
            class="nav-action-btn reimport-btn"
            @click="$emit('reimport-files')"
            title="Re-import uploaded files"
          >
            Re-import
          </button>
        </div>
      </template>

      <!-- Server Status Widget -->
      <div class="navbar-status">
        <ServerStatusWidget
          :desktopAgentState="desktopAgentState"
          :desktopAgentLabel="desktopAgentLabel"
          :desktopAgentHostPort="desktopAgentHostPort"
        />
      </div>
    </div>
  </nav>
</template>

<script>
import ServerStatusWidget from '../shared/ServerStatusWidget.vue';

export default {
  name: 'BaseNavbar',
  props: {
    desktopAgentState: {
      type: String,
      default: 'offline'
    },
    desktopAgentLabel: {
      type: String,
      default: 'Offline'
    },
    desktopAgentHostPort: {
      type: String,
      default: '127.0.0.1:51751'
    },
    currentView: {
      type: String,
      default: 'home'
    },
    projectName: {
      type: String,
      default: ''
    },
    isPipelineRunning: {
      type: Boolean,
      default: false
    },
    currentProjectType: {
      type: String,
      default: ''
    }
  },
  emits: ['open-server-modal', 'navigate', 'run-pipeline', 'save-project', 'clear-canvas', 'open-catalog', 'reimport-files', 'go-home'],
  components: {
    ServerStatusWidget
  },
  data() {
    return {
      showAgentDetails: false,
      isNavbarHidden: false,
      scrollTarget: null
    };
  },
  computed: {
    isHomePage() {
      return this.$route.name === 'home';
    }
  },
  mounted() {
    this.bindScrollTarget();
    document.addEventListener('click', this.handleClickOutside);
  },
  beforeUnmount() {
    this.unbindScrollTarget();
    document.removeEventListener('click', this.handleClickOutside);
  },
  watch: {
    '$route.name'() {
      this.$nextTick(() => {
        this.bindScrollTarget();
      });
    }
  },
  methods: {
    bindScrollTarget() {
      this.unbindScrollTarget();

      if (!this.isHomePage) {
        this.isNavbarHidden = false;
        return;
      }

      this.scrollTarget = this.$el.closest('.view-home') || window;
      this.lastScrollTop = 0;
      this.isNavbarHidden = true;

      this.scrollTarget.addEventListener('scroll', this.handleScroll, { passive: true });
    },
    unbindScrollTarget() {
      if (!this.scrollTarget) return;
      this.scrollTarget.removeEventListener('scroll', this.handleScroll);
      this.scrollTarget = null;
    },
    handleClickOutside(event) {
      const dropdown = this.$el.querySelector('.agent-details-dropdown');
      const widget = this.$el.querySelector('.agent-status-widget');
      if (dropdown && widget
        && !dropdown.contains(event.target)
        && !widget.contains(event.target)) {
        this.showAgentDetails = false;
      }
    },
    handleScroll() {
      if (!this.isHomePage) {
        this.isNavbarHidden = false;
        return;
      }

      const scrollTop = this.scrollTarget === window
        ? (window.pageYOffset || document.documentElement.scrollTop || 0)
        : this.scrollTarget.scrollTop;

      this.isNavbarHidden = scrollTop < 150;
      this.lastScrollTop = scrollTop;
    },
    scrollToSection(sectionId) {
      const element = document.querySelector(`[data-section="${sectionId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        this.isNavbarHidden = false;
      }
    }
  }
};
</script>

<style scoped>
.base-navbar {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
  border-bottom: 1px solid #383838;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  gap: 16px;
}

.base-navbar.navbar-fixed {
  position: fixed;
  width: 100%;
}

.base-navbar.navbar-hidden {
  transform: translateY(-100%);
  opacity: 0;
  pointer-events: none;
}

/* Left: Brand */
.navbar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  cursor: pointer;
  transition: opacity 0.2s;
}

.navbar-brand:hover {
  opacity: 0.8;
}

.navbar-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.navbar-text {
  font-size: 18px;
  font-weight: 700;
  color: #a0d468;
  letter-spacing: 0.5px;
}

.brand-sep {
  color: #505050;
  font-size: 16px;
  margin: 0 2px;
}

.project-name {
  font-size: 14px;
  font-weight: 500;
  color: #c0c0c0;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Center: Navigation Links */
.navbar-links {
  display: flex;
  gap: 4px;
  flex: 1;
  justify-content: center;
  align-items: center;
}

.nav-link {
  color: #9ca3af;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  padding: 5px 12px;
  border-radius: 6px;
  transition: all 0.15s;
  cursor: pointer;
  white-space: nowrap;
}

.nav-link:hover {
  color: #e0e0e0;
  background: rgba(255, 255, 255, 0.06);
}

.nav-link.active {
  color: #a0d468;
  font-weight: 600;
  background: rgba(160, 212, 104, 0.12);
}

/* Right: Actions + Status */
.navbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-action-btn {
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
  white-space: nowrap;
}

.run-btn {
  background: rgba(160, 212, 104, 0.18);
  border-color: rgba(160, 212, 104, 0.5);
  color: #a0d468;
}

.run-btn:hover:not(:disabled) {
  background: rgba(160, 212, 104, 0.28);
  border-color: #a0d468;
}

.run-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.save-btn {
  background: rgba(96, 165, 250, 0.12);
  border-color: rgba(96, 165, 250, 0.4);
  color: #93c5fd;
}

.save-btn:hover {
  background: rgba(96, 165, 250, 0.22);
  border-color: #93c5fd;
}

.delete-btn {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.35);
  color: #f87171;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: #f87171;
}

.catalog-btn,
.reimport-btn {
  background: rgba(255, 255, 255, 0.06);
  border-color: #404040;
  color: #9ca3af;
}

.catalog-btn:hover,
.reimport-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: #606060;
  color: #d1d5db;
}

/* Server Status */
.navbar-status {
  position: relative;
}

.agent-status-widget {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid #383838;
  background: rgba(45, 45, 45, 0.95);
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}

.agent-status-widget:hover {
  background: rgba(55, 55, 55, 0.95);
  border-color: #505050;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.online {
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
}

.status-dot.offline {
  background: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.6);
}

.status-dot.checking {
  background: #f59e0b;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.6);
}

.agent-label {
  font-size: 11px;
  font-weight: 600;
  color: #e5e7eb;
  white-space: nowrap;
}

.agent-status-text {
  transition: color 0.2s;
}

.agent-status-text.online { color: #22c55e; }
.agent-status-text.checking { color: #f59e0b; }
.agent-status-text.offline { color: #ef4444; }

.agent-details-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 240px;
  background: rgba(35, 35, 35, 0.98);
  border: 1px solid #404040;
  border-radius: 8px;
  padding: 10px;
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  z-index: 1001;
}

.agent-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #333;
}

.agent-detail-row:last-of-type {
  border-bottom: none;
}

.detail-label {
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
}

.detail-value {
  font-size: 12px;
  color: #e5e7eb;
  font-weight: 600;
  font-family: 'SF Mono', 'Consolas', monospace;
}

.detail-value.online { color: #22c55e; }
.detail-value.checking { color: #f59e0b; }
.detail-value.offline { color: #ef4444; }

.server-manage-btn {
  width: 100%;
  padding: 7px;
  margin-top: 6px;
  background: rgba(160, 212, 104, 0.12);
  border: 1px solid #a0d468;
  color: #a0d468;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.15s;
}

.server-manage-btn:hover {
  background: rgba(160, 212, 104, 0.22);
}

@media (max-width: 1024px) {
  .project-name { max-width: 120px; }
  .action-group { gap: 4px; }
  .nav-action-btn { padding: 4px 9px; font-size: 11px; }
}

@media (max-width: 768px) {
  .base-navbar { padding: 0 12px; height: 52px; }
  .navbar-text { font-size: 16px; }
  .navbar-links { gap: 2px; }
  .nav-link { padding: 4px 8px; font-size: 12px; }
}
</style>
