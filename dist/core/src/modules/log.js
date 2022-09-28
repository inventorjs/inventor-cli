import chalk from 'chalk';
import boxen from 'boxen';
function log(msg, options) {
    let realMeg = msg;
    if (options?.boxen) {
        const boxenOptions = options.boxen;
        if (boxenOptions === true) {
            realMeg = boxen(msg, { padding: 1, borderColor: 'green' });
        }
        else {
            realMeg = boxen(msg, boxenOptions);
        }
    }
    console.log(realMeg);
}
export const color = chalk;
export function bye(msg, options) {
    log(`👋 ${color.green(msg)}`, options);
    process.exit();
}
export function info(msg, options) {
    log(`🌎 ${color.cyan(msg)}`, options);
}
export function success(msg, options) {
    log(`✅ ${color.green(msg)}`, options);
}
export function error(msg, options) {
    log(`❌ ${color.red(msg)}`, options);
}
export function clear() {
    log(process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H');
}
export function raw(msg, options) {
    log(msg, options);
}
