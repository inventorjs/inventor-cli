/**
 * action 入口
 * @author: <%- author %>
 */
import { Action } from '@inventorjs/core';
export default class InitAction extends Action {
    description: string;
    options: never[];
    action(): Promise<void>;
}
