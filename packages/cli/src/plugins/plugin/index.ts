/**
 * 插件管理插件
 * @author: sunkeysun
 */
import { prompts } from '../../core'

async function init() {
  await prompts([{
    type: 'text',
    name: 'start',
    message: '是否开始初始化插件',
  }])
}

async function register() {
  await prompts([{
    type: 'text',
    name: 'start',
    message: '是否开始注册插件',
  }])
}

export async function getInitOptions() {
  return {
    name: 'plugin',
    options: [
      { option: '-i --init', description: 'init a inventor plugin from template.' },
      { option: '-r --register', description: 'register a inventor plugin global.' },
    ],
    action: async (options: Record<string, boolean>) => {
      if (options.init) {
        await init()
      } else if (options.register) {
        await register()
      }
    },
  }
}
