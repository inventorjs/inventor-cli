/**
 * 依赖包管理模块
 * @author: sunkeysun
 */
import { execa } from 'execa';
import { error } from './log.js';
export const bin = 'pnpm';
export async function init({ cwd }) {
    return execCmd(bin, ['init'], cwd);
}
export async function install({ cwd }) {
    return execCmd(bin, ['install'], cwd);
}
export async function addDependencies(packageNames, { cwd }) {
    return execCmd(bin, ['add', ...packageNames], cwd);
}
export async function addDevDependencies(packageNames, { cwd }) {
    return execCmd(bin, ['add', ...packageNames, '-D'], cwd);
}
export async function removeDependencies(packageNames, { cwd }) {
    return execCmd(bin, ['remove', ...packageNames], cwd);
}
export async function removeDevDependencies(packageNames, { cwd }) {
    return execCmd(bin, ['remove', ...packageNames, '-D'], cwd);
}
function execCmd(cmd, args, cwd) {
    const child = execa(cmd, args, { cwd, stdio: 'pipe' });
    let isError = false;
    return new Promise((resolve, reject) => {
        child.stdout?.on('data', (buf) => {
            const str = buf.toString();
            if (/ERR_PNPM/.test(str)) {
                isError = true;
                error(str);
                reject();
                return;
            }
            !isError && process.stdout.write(buf);
        });
        child.stdout?.on('end', () => {
            resolve(null);
        });
    });
}
