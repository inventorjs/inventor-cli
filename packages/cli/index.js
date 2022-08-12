import { createRequire } from 'module'

const require = createRequire(import.meta.url)

try {
   console.log(await require.resolve('commander'))
} catch (err) {
   console.log(err, '----')
}

