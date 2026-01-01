const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// 找到项目根目录和工作区根目录
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. 让 Metro 监视整个 Monorepo 的代码变动（包括 packages/api）
config.watchFolders = [workspaceRoot];

// 2. 让 Metro 能够找到根目录下的 node_modules
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
];

// 3. 允许解析工作区内的软链接包
// 注意：在某些 pnpm 环境下，disableHierarchicalLookup 可能会导致找不到核心模块，暂时注释掉
// config.resolver.disableHierarchicalLookup = true;

module.exports = config;
