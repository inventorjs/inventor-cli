import { Command } from 'commander';
import Plugin from './Plugin.js';
import Action from './Action.js';
declare function init(cli: Command): Promise<void>;
export { Plugin, Action, init };
