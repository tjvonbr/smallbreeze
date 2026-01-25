const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

/** @type {import('metro-config').ConfigT} */
const config = getDefaultConfig(projectRoot);

// Watch the entire monorepo for changes
config.watchFolders = [monorepoRoot];

// Ensure Metro resolves modules correctly in a monorepo
// Order matters: local node_modules first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Prevent duplicate React by forcing resolution from mobile's node_modules
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Always resolve 'react' from the mobile app's node_modules
  if (moduleName === 'react') {
    return context.resolveRequest(
      { ...context, originModulePath: path.resolve(projectRoot, 'package.json') },
      moduleName,
      platform
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

