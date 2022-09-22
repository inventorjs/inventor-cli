import { Action } from '@inventorjs/core';
export default class InitAction extends Action {
    #private;
    description: string;
    options: never[];
    action(): Promise<void>;
}
