/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/cli-core'

export default class extends Action {
  description = '添加应用附加能力'
  options = []
  async action() {
    const anwsers = await this.prompt([
      {
        type: 'checkbox',
        name: 'addon',
        message: '选择要添加的应用附加能力',
        choices: [
          { name: 'Husky', value: 'husky' },
          { name: 'Eslint [husky, lint-staged, pre-commit hook]', value: 'eslint' },
          { name: 'Commitlint [husky, commit-msg hook]', value: 'commitlint' },
        ]
      },
    ])

    type Option = 'husky'|'eslint'|'commitlint'
    const { addon } = anwsers as { addon: Option[] }
    
    await this.runTaskContext(async () => {
      addon.includes('husky') && await this.addHusky();
      addon.includes('eslint') && await this.addEslint();
      addon.includes('commitlint') && await this.addCommitLint();
    })
  }
}
