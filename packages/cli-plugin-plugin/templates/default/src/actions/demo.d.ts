/**
 * demo action
 * @author: <%- author %>
 */
import { plugin } from '@inventorjs/cli-core';
declare type Options = {
    name?: string;
};
export default class Action extends plugin.Action {
    name: string;
    description: string;
    options: {
        option: string;
        description: string;
    }[];
    action(options: Options): Promise<void>;
}
export {};
