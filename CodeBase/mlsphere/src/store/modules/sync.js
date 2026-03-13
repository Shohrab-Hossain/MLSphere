export default {
  namespaced: true,
  state() {
    return {
      state: 'unlinked',
      path: ''
    };
  },
  getters: {
    label(state) {
      if (state.state === 'checking') return 'Sync: checking...';
      if (state.state === 'linked') return 'Sync: linked';
      if (state.state === 'error') return 'Sync: error';
      return 'Sync: not linked';
    },
    tooltip(state) {
      if (state.state === 'linked' && state.path) {
        return `Local sync folder: ${state.path}`;
      }
      if (state.state === 'checking') {
        return 'Checking local sync folder...';
      }
      if (state.state === 'error') {
        return 'Unable to verify local sync folder';
      }
      return 'No local sync folder linked yet';
    }
  },
  mutations: {
    setState(state, value) {
      state.state = value;
    },
    setPath(state, value) {
      state.path = value;
    }
  }
};
