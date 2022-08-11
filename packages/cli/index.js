//const path = '/data/developer/.config/yarn/global/node_modules/qs/lib/index.js'

try {
   const qs = await import('qs')
   console.log(Object.keys(qs))
} catch (err) {
   console.log(err, '----')
}

