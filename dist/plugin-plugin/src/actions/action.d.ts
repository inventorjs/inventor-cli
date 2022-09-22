import { Action } from '@inventorjs/core';
export default class ActionAction extends Action {
    description: string;
    options: never[];
    action(): Promise<void>;
}
