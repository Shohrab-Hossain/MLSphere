export function splitModuleName(fileName) {
  const normalized = String(fileName || '').trim();
  const dotIndex = normalized.lastIndexOf('.');
  if (dotIndex <= 0) {
    return { baseName: normalized, extension: '' };
  }

  return {
    baseName: normalized.slice(0, dotIndex),
    extension: normalized.slice(dotIndex)
  };
}

export function getModuleBaseName(fileName) {
  return splitModuleName(fileName).baseName;
}

export function getModuleDisplayExt(fileName) {
  return splitModuleName(fileName).extension;
}

export function getModuleDisplayFilename(fileName) {
  const parsed = splitModuleName(fileName);
  return `${parsed.baseName}${parsed.extension}`;
}
