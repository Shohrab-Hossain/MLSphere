import { createStore } from 'vuex';
import ui from './modules/ui';
import agent from './modules/agent';
import sync from './modules/sync';

const createDefaultProject = () => ({
  id: null,
  name: 'New Project',
  type: 'blank',
  blocks: [],
  config: {}
});

export default createStore({
  modules: {
    ui,
    agent,
    sync
  },
  state() {
    return {
      currentProject: createDefaultProject()
    };
  },
  getters: {
    currentProject(state) {
      return state.currentProject;
    }
  },
  mutations: {
    setCurrentProject(state, project) {
      state.currentProject = project || createDefaultProject();
    },
    resetCurrentProject(state) {
      state.currentProject = createDefaultProject();
    },
    updateCurrentProjectFiles(state, files) {
      if (state.currentProject) {
        state.currentProject = { ...state.currentProject, pythonFiles: files };
      }
    }
  }
});
