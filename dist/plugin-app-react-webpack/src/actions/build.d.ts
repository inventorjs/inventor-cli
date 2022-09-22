/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/core';
export default class BuildAction extends Action {
    description: string;
    options: never[];
    action(): Promise<void>;
}
