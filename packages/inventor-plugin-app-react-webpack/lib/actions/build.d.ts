/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/cli-core';
export default class BuildAction extends Action {
    description: string;
    options: {
        flags: string;
        description: string;
        defaultValue: boolean;
    }[];
    run(_params: string[], options: Record<string, unknown>): Promise<void>;
}
