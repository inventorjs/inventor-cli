/**
 * demo action
 * @author: <%- author %>
 */
import { plugin } from '../../../../../../core/index.js';
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
