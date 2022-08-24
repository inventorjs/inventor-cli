/**
 * husky 相关操作
 * @author: sunkeysun
 */
import { execa } from 'execa'

interface InstallOptions {
  cwd: string
}

export async function install({ cwd }: InstallOptions) {
  return execCmd(['install'], cwd)
}

export async function uninstall({ cwd }: InstallOptions) {
  return execCmd(['install'], cwd)
}

export async function add(hookName: string, hookAction: string, { cwd }: InstallOptions) {
  return execCmd(['add', `.husky/${hookName}`, hookAction], cwd)
}

function execCmd(args: string[], cwd: string) {
  const child = execa('pnpm', ['husky', ...args], { cwd, stdio: 'pipe' })
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
