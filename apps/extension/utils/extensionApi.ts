type ExtensionApiLike = {
  runtime?: any;
  storage?: {
    local?: any;
  };
  notifications?: any;
  action?: any;
  windows?: any;
  sidePanel?: any;
};

export function getExtensionApi(): ExtensionApiLike | undefined {
  const globalObject = globalThis as typeof globalThis & {
    browser?: ExtensionApiLike;
    chrome?: ExtensionApiLike;
  };

  return globalObject.browser ?? globalObject.chrome;
}

export function getExtensionStorageArea() {
  return getExtensionApi()?.storage?.local;
}
