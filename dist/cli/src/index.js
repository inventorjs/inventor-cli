#!/usr/bin/env node
/**
 * inventor 命令行入口
 * @author: sunkeysun
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { readdir } from 'node:fs/promises';
import { Command } from 'commander';
import figlet from 'figlet';
import { Plugin, Action, log, rc, env } from '@inventorjs/core';
const BIN = 'inventor';
const DEFAULT_ACTION = 'index';
const require = createRequire(import.meta.url);
const corePlugins = [
    ['@inventorjs/plugin-plugin'],
    ['@inventorjs/plugin-app'],
];
async function loadActions(plugin) {
    const actionFiles = (await readdir(plugin.actionPath)).filter((file) => file.endsWith('.js'));
    const actions = [];
    for (const actionFile of actionFiles) {
        try {
            const actionPath = path.resolve(plugin.actionPath, actionFile);
            const { default: SubAction } = await import(actionPath);
            const action = new SubAction({
                entryPath: plugin.entryPath,
            });
            if (!(action instanceof Action)) {
                throw new Error('SubAction must extends from Action base class!');
            }
            const name = path.basename(actionFile, path.extname(actionFile));
            actions.push({ name, action });
        }
        catch (err) {
            console.log(`${path.basename(actionFile)} load error[skipped]: ${err.message}`);
        }
    }
    return actions;
}
async function registerPlugin(cli, pluginName, packageName) {
    const { default: SubPlugin } = await import(packageName);
    const entryPath = require.resolve(packageName);
    const plugin = new SubPlugin({ entryPath });
    if (!(plugin instanceof Plugin)) {
        throw new Error('SubPlugin must extends from Plugin base class!');
    }
    const actions = await loadActions(plugin);
    const cmd = cli.command(pluginName);
    cmd.description(plugin.description);
    for (const { name, action } of actions) {
        const actionCmd = cmd
            .command(name, { isDefault: name === DEFAULT_ACTION })
            .description(action.description);
        if (action.options) {
            action.options.forEach((option) => actionCmd.option(option.option, option.description));
        }
        actionCmd.action(async (options) => await action.action(options));
    }
}
async function searchPlugins() {
    const envContext = env.context();
    const config = await rc.load(envContext);
    const pluginList = corePlugins;
    if (config) {
        const { plugins } = config;
        pluginList.push(...plugins);
    }
    const result = pluginList.reduce((result, [packageName]) => {
        if (!result.find((plugin) => plugin.packageName === packageName)) {
            return [
                ...result,
                { pluginName: getPluginName(packageName), packageName }
            ];
        }
        return result;
    }, []);
    return result;
}
function welcome({ cliName }) {
    log.raw(log.color.cyan(figlet.textSync(cliName, { font: 'Speed' })));
}
function getPluginName(packageName) {
    return packageName.replace('@inventorjs/plugin-', '').replace(/(@\w+)?inventor-plugin-/g, '');
}
async function run() {
    const [, , pluginName] = process.argv;
    const packageJson = require('../package.json');
    const cli = new Command(BIN).version(packageJson.version);
    welcome({ cliName: BIN });
    let plugins = await searchPlugins();
    if (pluginName) {
        plugins = plugins.filter((plugin) => plugin.pluginName === pluginName);
    }
    for (const { pluginName, packageName } of plugins) {
        await registerPlugin(cli, pluginName, packageName);
    }
    cli.parse(process.argv);
}
process.on('uncaughtException', (err) => {
    log.error(`uncaughtException: ${err}`);
});
process.on('unhandledRejection', (reason) => {
    log.error(reason);
});
await run();
