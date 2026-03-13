import { getDesktopAgentDownloadUrl } from '@/services/agent/desktopAgentClient';

export default {
  namespaced: true,
  state() {
    return {
      state: 'checking',
      port: '51751',
      host: '127.0.0.1',
      restarting: false,
      failedChecks: 0,
      downloadUrl: '',
      installed: false
    };
  },
  getters: {
    label(state) {
      if (state.state === 'online') return 'ONLINE';
      if (state.state === 'offline') return 'OFFLINE';
      return 'Checking...';
    },
    hostPort(state) {
      return `${state.host}:${state.port}`;
    },
    tooltip(state, getters) {
      if (state.state === 'online') {
        return `MLSphere server connected on ${getters.hostPort}`;
      }
      if (state.state === 'offline') {
        return 'MLSphere server is offline. Install/download and start the MLSphere server from browser controls.';
      }
      return 'Checking MLSphere server...';
    },
    actionLabel(state) {
      return state.state === 'online' ? 'Restart' : 'Start';
    },
    actionTitle(state) {
      return state.state === 'online'
        ? 'Restart MLSphere server'
        : 'Start MLSphere server from browser';
    }
  },
  mutations: {
    setState(state, value) {
      state.state = value;
    },
    setPort(state, value) {
      state.port = value;
    },
    setHost(state, value) {
      state.host = value;
    },
    setRestarting(state, value) {
      state.restarting = value;
    },
    setFailedChecks(state, value) {
      state.failedChecks = value;
    },
    incrementFailedChecks(state) {
      state.failedChecks++;
    },
    setDownloadUrl(state, value) {
      state.downloadUrl = value;
    },
    setInstalled(state, value) {
      state.installed = value;
      if (value) {
        localStorage.setItem('mlsphere-agent-installed', '1');
      } else {
        localStorage.removeItem('mlsphere-agent-installed');
      }
    }
  },
  actions: {
    initialize({ commit }) {
      commit('setDownloadUrl', getDesktopAgentDownloadUrl());
      const installed = localStorage.getItem('mlsphere-agent-installed') === '1';
      commit('setInstalled', installed);
    }
  }
};
