/**
 * 命令执行模块
 * @author: sunkeysun
 */
import { execa } from 'execa'
import { cwd as envCwd } from './env.js'

export interface Output {
  status: 'data' | 'error' | 'skip'
  output?: Buffer | string
}

export interface Options {
  cwd?: string
  stdio?: 'pipe' | 'ignore' | 'inherit'
  stdout?: 'stdout' | 'stderr'
  pipe?: (buf: Buffer) => Output
}

export async function exec(bin: string, args: string[], options: Options = {}) {
  const {
    cwd = envCwd,
    stdio = 'pipe',
    stdout = 'stdout',
    pipe = (buf) => ({ status: 'data', output: buf }),
  } = options

  console.log({ bin, args, cwd, stdio })

  const child = execa(bin, args, { cwd, stdio })
  if (stdio !== 'pipe') {
    return child
  }
  return new Promise((resolve, reject) => {
    child[stdout]?.on('data', (buf) => {
      const { status, output = '' } = pipe(buf)
      switch (status) {
        case 'data':
          process[stdout].write(output)
          break
        case 'error':
          child.kill()
          reject(output.toString())
          break
      }
    })
    child[stdout]?.on('end', () => resolve(null))
    child.on('error', (err) => {
      reject(err)
    })
  })
}
