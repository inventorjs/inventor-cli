/**
 * action 入口
 * @author: <%- author %>
 */
import { Action } from '@inventorjs/cli-core';
export default class {
}
 % -capitalName %  > Action;
Action;
{
    description = '<%- description %>';
    options = [];
    async;
    action();
    {
        const nameRegex = /^\w{3}$/;
        const anwsers = await this.prompt([
            {
                name: 'name',
                type: 'text',
                message: '请输入你的名字',
                validate: (name) => !nameRegex.test(name)
                    ? `请输入合法的名字(${nameRegex.toString()})`
                    : true,
            },
        ]);
        const { name } = anwsers;
        this.log.info(`Hello，${name}!`);
    }
}
