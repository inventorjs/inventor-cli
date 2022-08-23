/**
 * git 相关操作
 * @author: sunkeysun
 */
import { execa } from 'execa'

interface InitOptions {
  cwd: string
}

export async function init({ cwd }: InitOptions) {
  return await execCmd(['init'], cwd)
}

function execCmd(args: string[], cwd: string) {
  const child = execa('git', args, { cwd, stdio: 'pipe' })
  return new Promise((resolve, reject) => {
    child.stdout?.on('data', (buf) => {
      process.stdout.write(buf)
    })
    child.stdout?.on('end', () => {
      resolve(null)
    })
    child.stdout?.on('error', () => {
      reject()
    })
  })
}
