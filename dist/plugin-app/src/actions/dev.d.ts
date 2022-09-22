/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/core';
export default class DevAction extends Action {
    description: string;
    options: never[];
    action(): Promise<void>;
}
