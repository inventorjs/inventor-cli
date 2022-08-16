/**
 * 插件注册 action (局部注册 | 全局注册)
 * @author: sunkeysun
 */
import { plugin } from '@inventorjs/cli-core';
export default class Action extends plugin.Action {
    name: string;
    description: string;
    options: {
        option: string;
        description: string;
    }[];
    action(options: Record<string, string>): Promise<void>;
}
