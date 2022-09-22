/**
 * 配置读写模块
 * @author: sunkeysun
 */
import { cosmiconfig } from 'cosmiconfig';
import { pwd, homedir } from './env.js';
const explorer = cosmiconfig('inventor');
export async function search(dirname) {
    try {
        const result = await explorer.search(dirname) ?? {};
        return result;
    }
    catch (err) {
        return { config: {} };
    }
}
export async function load(from = 'local') {
    const location = from === 'global' ? homedir() : pwd();
    const result = await search(location);
    return result?.config ?? null;
}
