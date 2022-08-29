/**
 * 命令执行模块
 * @author: sunkeysun
 */
import { execa } from 'execa'
import { cwd as envCwd } from './env.js'

export interface Output {
  status: 'data' | 'error' | 'skip'
  output: Buffer
}

export interface Options {
  cwd?: string
  stdio?: 'pipe' | 'ignore'
  pipeOutput?: (buf: Buffer) => Output
  stdout?: 'stdout' | 'stderr'
}

export async function exec(bin: string, args: string[], options: Options = {}) {
  const {
    cwd = envCwd,
    stdio = 'pipe',
    stdout = 'stdout',
    pipeOutput = (buf) => ({ status: 'data', output: buf }),
  } = options
  const child = execa(bin, args, { cwd, stdio })
  if (stdio !== 'pipe') {
    return child
  }
  return new Promise((resolve, reject) => {
    child[stdout]?.on('data', (buf) => {
      const { status, output } = pipeOutput(buf)
      switch (status) {
        case 'data':
          process[stdout].write(output)
          break
        case 'error':
          process[stdout].write(output)
          reject()
          child.kill()
          break
      }
    })
    child[stdout]?.on('end', () => resolve(null))
  })
}
