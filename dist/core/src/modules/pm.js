/**
 * 依赖包管理模块
 * @author: sunkeysun
 */
import { exec } from './cmd.js';
export const bin = 'pnpm';
export async function init(options) {
    return execBin(['init'], options);
}
export async function install(options) {
    return execBin(['install'], options);
}
export async function addDependencies(packageNames, options) {
    return execBin(['add', ...packageNames], options);
}
export async function addDevDependencies(packageNames, options) {
    return execBin(['add', ...packageNames, '-D'], options);
}
export async function removeDependencies(packageNames, options) {
    return execBin(['remove', ...packageNames], options);
}
export async function removeDevDependencies(packageNames, options) {
    return execBin(['remove', ...packageNames, '-D'], options);
}
async function execBin(args, options = {}) {
    const { cwd, stdio = 'pipe' } = options;
    return exec(bin, args, {
        ...options,
        cwd,
        stdio,
        pipe: (buf) => {
            const str = buf.toString();
            if (/ERR_PNPM/.test(str)) {
                return { status: 'error', output: str };
            }
            if (/(Progress: resolved|\+{3,}|Virtual store is at|Update available|WARN)/.test(str)) {
                return {};
            }
            return { status: 'data', output: buf };
        },
    });
}
