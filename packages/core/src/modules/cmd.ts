/**
 * 命令执行模块
 * @author: sunkeysun
 */
import { Command } from 'commander'
import { type Options as ExecaOptions, execa } from 'execa'
import { cwd as envCwd } from './env.js'

export interface Output {
  status?: 'data' | 'error'
  output?: Buffer | string
}

type SupportedExecaOptions = 'cwd' | 'timeout' | 'env' | 'stdio'

export interface Options extends Pick<ExecaOptions, SupportedExecaOptions> {
  output?: boolean
  pipeline?: 'stdout' | 'stderr'
  pipe?: (buf: Buffer) => Output 
}

export { Command }

export async function exec(bin: string, args: string[], options: Options = {}) {
  const {
    cwd = envCwd,
    output = true,
    stdio = 'pipe',
    timeout,
    env,
    pipeline = 'stdout',
    pipe = (buf) => ({ status: 'data', output: buf }),
  } = options

  const child = execa(bin, args, { cwd, stdio, timeout, env })
  if (!output) {
    return child
  }
  return new Promise((resolve, reject) => {
    child[pipeline]?.on('data', (buf) => {
      const { status, output = '' } = pipe(buf)
      switch (status) {
        case 'data':
          process[pipeline].write(output)
          break
        case 'error':
          child.kill()
          reject(output.toString())
          break
      }
    })
    child[pipeline]?.on('end', () => resolve(null))
    child.catch((err) => reject(err))
  })
}
