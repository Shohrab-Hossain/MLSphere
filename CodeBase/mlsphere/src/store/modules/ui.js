import { TOAST_ICONS } from '@/services/constants/appUi';

export default {
  namespaced: true,
  state() {
    return {
      showHelpModal: false,
      showHomeModal: false,
      homeModalMode: 'unsaved',
      showCatalogEditor: false,
      showLeftSidebar: true,
      showRightSidebar: false,
      showClearConfirmModal: false,
      showAnalyticsExpanded: false,
      showAgentInstructionsModal: false,
      toasts: [],
      toastIdCounter: 0
    };
  },
  mutations: {
    setShowHelpModal(state, value) {
      state.showHelpModal = value;
    },
    setShowHomeModal(state, value) {
      state.showHomeModal = value;
    },
    setHomeModalMode(state, value) {
      state.homeModalMode = value;
    },
    setShowCatalogEditor(state, value) {
      state.showCatalogEditor = value;
    },
    setShowLeftSidebar(state, value) {
      state.showLeftSidebar = value;
    },
    setShowRightSidebar(state, value) {
      state.showRightSidebar = value;
    },
    setShowClearConfirmModal(state, value) {
      state.showClearConfirmModal = value;
    },
    setShowAnalyticsExpanded(state, value) {
      state.showAnalyticsExpanded = value;
    },
    setShowAgentInstructionsModal(state, value) {
      state.showAgentInstructionsModal = value;
    },
    addToast(state, toast) {
      state.toasts.push(toast);
    },
    removeToast(state, id) {
      const index = state.toasts.findIndex(t => t.id === id);
      if (index > -1) {
        state.toasts.splice(index, 1);
      }
    },
    incrementToastCounter(state) {
      state.toastIdCounter++;
    }
  },
  actions: {
    showToast({ state, commit }, { message, type = 'info', duration = 3000 }) {
      const toast = {
        id: state.toastIdCounter,
        message,
        type,
        icon: TOAST_ICONS[type] || TOAST_ICONS.info
      };
      
      commit('incrementToastCounter');
      commit('addToast', toast);
      
      if (duration > 0) {
        setTimeout(() => commit('removeToast', toast.id), duration);
      }
    }
  }
};
