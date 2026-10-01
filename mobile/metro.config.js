// Expo Metro config, extended so the app can import the repo-level
// shared/ design foundation (tokens/content/typography) which lives OUTSIDE
// the mobile project root. Metro only bundles files under watchFolders, so the
// sibling shared/ dir must be added explicitly.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '..', 'shared');

const config = getDefaultConfig(projectRoot);

// Let Metro watch + bundle the shared design foundation.
config.watchFolders = [sharedRoot];

// Resolve modules only from the mobile package's own node_modules.
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = config;
