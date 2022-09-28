/**
 * action 入口
 * @author: <%- author %>
 */
import { Action } from '@inventorjs/core';
export default class InitAction extends Action {
    description = '<%- description %>';
    options = [];
    async action() {
        const nameRegex = /\w{3}/;
        const anwsers = await this.prompt([
            {
                name: 'name',
                type: 'text',
                message: '请输入项目名称',
                validate: (name) => !nameRegex.test(name)
                    ? `请输入合法的项目名称(${nameRegex.toString()})`
                    : true,
            },
        ]);
        this.log.raw(`您输入的项目名称为 ${anwsers.name}`, { boxen: true });
    }
}
