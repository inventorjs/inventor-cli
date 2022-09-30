import { execa } from 'execa'

const result = await execa('pnpm', ['root', '-g'])

console.log(result)
