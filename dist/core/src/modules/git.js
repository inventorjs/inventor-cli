/**
 * git 相关操作
 * @author: sunkeysun
 */
import { exec } from './cmd.js';
export const bin = 'git';
export async function init(options) {
    return await execBin(['init'], options);
}
function execBin(args, options = {}) {
    const { cwd, stdio = 'pipe' } = options;
    return exec(bin, args, { cwd, stdio });
}
