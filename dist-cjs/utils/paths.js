"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClaudeFlowRoot = getClaudeFlowRoot;
exports.getClaudeFlowBin = getClaudeFlowBin;
exports.resolveProjectPath = resolveProjectPath;
const path_1 = require("path");
const url_1 = require("url");
const fs_1 = require("fs");
// Handle both ES modules and CommonJS
let __filename;
let __dirname;
if (typeof import.meta !== 'undefined' && import.meta.url) {
    __filename = (0, url_1.fileURLToPath)(import.meta.url);
    __dirname = (0, path_1.dirname)(__filename);
}
else {
    // CommonJS fallback
    __filename = __filename || '';
    __dirname = __dirname || '';
}
function getClaudeFlowRoot() {
    // Try multiple strategies to find the root
    const strategies = [
        // Strategy 1: From current file location
        (0, path_1.resolve)(__dirname, '../..'),
        // Strategy 2: From process.cwd()
        process.cwd(),
        // Strategy 3: From npm global location
        (0, path_1.resolve)(process.execPath, '../../lib/node_modules/claude-flow'),
        // Strategy 4: From environment variable
        process.env.CLAUDE_FLOW_ROOT || ''
    ];
    for (const path of strategies) {
        if (path && (0, fs_1.existsSync)((0, path_1.join)(path, 'package.json'))) {
            try {
                const pkg = require((0, path_1.join)(path, 'package.json'));
                if (pkg.name === 'claude-flow') {
                    return path;
                }
            }
            catch { }
        }
    }
    // Fallback to current working directory
    return process.cwd();
}
function getClaudeFlowBin() {
    return (0, path_1.join)(getClaudeFlowRoot(), 'bin', 'claude-flow');
}
function resolveProjectPath(relativePath) {
    const root = getClaudeFlowRoot();
    return (0, path_1.resolve)(root, relativePath);
}
//# sourceMappingURL=paths.js.map