/**
 * 日志打印模块
 * @author: sunkeysun
 */
import figlet from 'figlet';
import chalk from 'chalk';
function log(msg) {
    console.log(msg);
}
export function welcome({ cliName, version }) {
    log(chalk.green(figlet.textSync(cliName, { font: 'Kban' })));
    log(chalk.yellow(`welecome ${cliName} v${version} !`));
}
export function info(msg) {
    log(`🪙 ${chalk.cyan(msg)}`);
}
export function success(msg) {
    log(`✅ ${chalk.green(msg)}`);
}
export function error(msg) {
    log(`❌ ${chalk.red(msg)}`);
}
