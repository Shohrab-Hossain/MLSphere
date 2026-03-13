import { ref, computed } from 'vue';

export function useProjectManagement() {
  const currentProject = ref({
    id: null,
    name: 'New Project',
    type: 'blank',
    blocks: [],
    config: {}
  });

  const localSyncState = ref('unlinked');
  const localSyncPath = ref('');

  const localSyncLabel = computed(() => {
    if (localSyncState.value === 'checking') return 'Sync: checking...';
    if (localSyncState.value === 'linked') return 'Sync: linked';
    if (localSyncState.value === 'error') return 'Sync: error';
    return 'Sync: not linked';
  });

  const localSyncTooltip = computed(() => {
    if (localSyncState.value === 'linked' && localSyncPath.value) {
      return `Local sync folder: ${localSyncPath.value}`;
    }
    if (localSyncState.value === 'checking') {
      return 'Checking local sync folder...';
    }
    if (localSyncState.value === 'error') {
      return 'Unable to verify local sync folder';
    }
    return 'No local sync folder linked yet';
  });

  const makeStorageSafeProject = (project, options = {}) => {
    const minimal = Boolean(options.minimal);
    const safeProject = { ...(project || {}) };

    const sourceFiles = Array.isArray(project?.pythonFiles) ? project.pythonFiles : [];
    safeProject.pythonFiles = minimal
      ? []
      : sourceFiles.map(file => ({
        name: file?.name || '',
        path: file?.path || '',
        relativePath: file?.relativePath || file?.path || '',
        size: Number(file?.size || 0),
        type: file?.type || ''
      }));

    return safeProject;
  };

  const saveProjectToStorage = (project) => {
    const projects = JSON.parse(localStorage.getItem('ml_projects') || '[]');
    const existingIndex = projects.findIndex(item => item.id === project.id);
    const safeProject = makeStorageSafeProject(project);

    if (existingIndex >= 0) {
      projects[existingIndex] = safeProject;
    } else {
      projects.push(safeProject);
    }

    try {
      localStorage.setItem('ml_projects', JSON.stringify(projects));
    } catch (error) {
      if (error.name === 'QuotaExceededError' || error.code === 22) {
        const minimalSafeProject = makeStorageSafeProject(project, { minimal: true });
        if (existingIndex >= 0) {
          projects[existingIndex] = minimalSafeProject;
        } else {
          projects.push(minimalSafeProject);
        }
        localStorage.setItem('ml_projects', JSON.stringify(projects));
      } else {
        throw error;
      }
    }
  };

  return {
    currentProject,
    localSyncState,
    localSyncPath,
    localSyncLabel,
    localSyncTooltip,
    makeStorageSafeProject,
    saveProjectToStorage
  };
}
