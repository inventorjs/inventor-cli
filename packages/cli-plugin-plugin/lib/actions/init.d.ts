import { plugin } from '@inventorjs/cli-core';
interface Options {
    name?: string;
}
export default class Action extends plugin.Action {
    #private;
    name: string;
    description: string;
    options: never[];
    action(options: Options): Promise<void>;
}
export {};
