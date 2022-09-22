/**
 * 日志打印模块
 * @author: sunkeysun
 */
import chalk from 'chalk';
function log(msg) {
    console.log(msg);
}
export const color = chalk;
export function bye(msg) {
    log(`👋 ${color.green(msg)}`);
    process.exit();
}
export function info(msg) {
    log(`🌎 ${color.cyan(msg)}`);
}
export function success(msg) {
    log(`✅ ${color.green(msg)}`);
}
export function error(msg) {
    log(`❌ ${color.red(msg)}`);
}
export function clear() {
    log(process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H');
}
export function raw(msg) {
    log(msg);
}
