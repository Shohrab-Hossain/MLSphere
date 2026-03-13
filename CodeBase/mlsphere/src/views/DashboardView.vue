<template>
  <project-dashboard 
    :desktopAgentState="desktopAgentState"
    :desktopAgentLabel="desktopAgentLabel"
    :desktopAgentHostPort="desktopAgentHostPort"
    :desktopAgentTooltip="desktopAgentTooltip"
    :desktopAgentRestarting="desktopAgentRestarting"
    :desktopAgentActionLabel="desktopAgentActionLabel"
    :desktopAgentActionTitle="desktopAgentActionTitle"
    :desktopAgentDownloadUrl="desktopAgentDownloadUrl"
    :desktopAgentInstalled="desktopAgentInstalled"
    @restart-agent="handleRestartAgent"
    @download-agent="handleDownloadAgent"
    @agent-installed="handleAgentInstalled"
    @refresh-agent-status="handleRefreshAgentStatus"
    @port-changed="handlePortChange"
    @project-selected="handleProjectSelected"
  />
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import ProjectDashboard from '../components/Dashboard.vue';

export default {
  name: 'DashboardView',
  components: {
    ProjectDashboard
  },
  computed: {
    ...mapState('agent', {
      desktopAgentState: 'state',
      desktopAgentRestarting: 'restarting',
      desktopAgentDownloadUrl: 'downloadUrl',
      desktopAgentInstalled: 'installed'
    }),
    ...mapGetters('agent', {
      desktopAgentLabel: 'label',
      desktopAgentHostPort: 'hostPort',
      desktopAgentTooltip: 'tooltip',
      desktopAgentActionLabel: 'actionLabel',
      desktopAgentActionTitle: 'actionTitle'
    })
  },
  methods: {
    handleRestartAgent() {
      this.$emit('restart-agent');
    },
    handleDownloadAgent() {
      this.$emit('download-agent');
    },
    handleAgentInstalled() {
      this.$emit('agent-installed');
    },
    handleRefreshAgentStatus() {
      this.$emit('refresh-agent-status');
    },
    handlePortChange(port) {
      this.$emit('port-changed', port);
    },
    handleProjectSelected(project) {
      this.$emit('project-selected', project);
    }
  }
};
</script>
