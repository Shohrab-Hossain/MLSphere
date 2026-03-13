import { ref, computed } from 'vue';

export function useCatalogEditor() {
  const catalogEditorMode = ref('visual');
  const catalogDraft = ref([]);
  const catalogJsonValue = ref('');
  const availablePackages = ref([]);
  const showCatalogEditor = ref(false);

  const catalogSections = [
    'Data',
    'Processing',
    'Feature',
    'Model',
    'Training',
    'Evaluation',
    'Visualization',
    'Analysis',
    'Uncategorized'
  ];

  const normalizePackageName = (value) => {
    return String(value || '').trim();
  };

  const normalizeBlockName = (value, packageName) => {
    const raw = String(value || '').trim();
    if (raw) {
      return raw;
    }
    return packageName
      .split('.')
      .pop()
      .split(/[_-]/g)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Custom Block';
  };

  const getSectionIcon = (section) => {
    const iconMap = {
      Data: '📥',
      Processing: '🔧',
      Feature: '🧮',
      Model: '🤖',
      Training: '⚡',
      Evaluation: '📈',
      Visualization: '📊',
      Analysis: '🔍',
      Uncategorized: '📦'
    };
    return iconMap[section] || '📦';
  };

  const syncCatalogJson = () => {
    catalogJsonValue.value = JSON.stringify(catalogDraft.value, null, 2);
  };

  const switchCatalogMode = (mode) => {
    if (mode === catalogEditorMode.value) {
      return;
    }

    if (mode === 'json') {
      syncCatalogJson();
    } else {
      try {
        const parsed = JSON.parse(catalogJsonValue.value);
        const entries = Array.isArray(parsed) ? parsed : Array.isArray(parsed.blocks) ? parsed.blocks : [];
        catalogDraft.value = entries.map((entry) => {
          const packageName = normalizePackageName(entry.package);
          return {
            package: packageName,
            blockName: normalizeBlockName(entry.blockName, packageName),
            section: catalogSections.includes(entry.section) ? entry.section : 'Uncategorized'
          };
        }).filter(entry => entry.package);

        if (catalogDraft.value.length === 0) {
          catalogDraft.value = [{ package: '', blockName: '', section: 'Uncategorized' }];
        }
      } catch (error) {
        alert(`Invalid catalog JSON: ${error.message}`);
        return;
      }
    }

    catalogEditorMode.value = mode;
  };

  const addCatalogRow = () => {
    const hasEmptyRow = catalogDraft.value.some(entry => !String(entry.package || '').trim());
    if (hasEmptyRow) {
      return;
    }
    
    catalogDraft.value.push({
      package: '',
      blockName: '',
      section: 'Uncategorized'
    });
    syncCatalogJson();
  };

  const removeCatalogRow = (index) => {
    catalogDraft.value.splice(index, 1);
    syncCatalogJson();
  };

  const addPackageToMapping = (packageName) => {
    const normalized = String(packageName || '').trim();
    if (!normalized) {
      return;
    }

    const exists = catalogDraft.value.some(entry => String(entry.package || '').trim() === normalized);
    if (exists) {
      return;
    }

    const blockName = normalizeBlockName('', normalized);
    const newEntry = {
      package: normalized,
      blockName,
      section: 'Uncategorized'
    };

    const emptyRowIndex = catalogDraft.value.findIndex(entry => !String(entry.package || '').trim());
    
    if (emptyRowIndex !== -1) {
      catalogDraft.value[emptyRowIndex] = newEntry;
    } else {
      catalogDraft.value.push(newEntry);
    }
    
    syncCatalogJson();
  };

  const refreshAvailablePackages = (currentProject) => {
    const allPackages = Array.isArray(currentProject?.config?.localPackages)
      ? currentProject.config.localPackages
      : [];
    const mappedPackageSet = new Set(catalogDraft.value.map(entry => String(entry.package || '').trim()).filter(Boolean));
    availablePackages.value = allPackages.filter(packageName => !mappedPackageSet.has(packageName));
  };

  return {
    catalogEditorMode,
    catalogDraft,
    catalogJsonValue,
    availablePackages,
    showCatalogEditor,
    catalogSections,
    normalizePackageName,
    normalizeBlockName,
    getSectionIcon,
    syncCatalogJson,
    switchCatalogMode,
    addCatalogRow,
    removeCatalogRow,
    addPackageToMapping,
    refreshAvailablePackages
  };
}
