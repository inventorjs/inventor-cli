import toml from '@iarna/toml'
import { readFile } from 'fs/promises'

console.log(toml.stringify(JSON.parse(await readFile('./.inventorrc', 'utf8'))))
