import JsZip from 'jszip'
import fs from 'fs/promises'

async function run() {
  const zip = new JsZip()
  //   const result = await zip.loadAsync(await fs.readFile('./pkg.zip'))
  //   console.log(result.file('pkg.json'))
  //   console.log(result.file('package.json'))
  zip.file('pkg.json', await fs.readlink('./pkg.json'), {
    unixPermissions: 41471,
  })
  zip.file('package.json', await fs.readFile('./package.json'))
  const buffer = await zip.generateAsync({
    platform: 'UNIX',
    type: 'nodebuffer',
  })

  //   fs.writeFile('./test.zip', buffer)

  console.log((await fs.lstat('./pkg.json')).mode)
  console.log((await fs.lstat('./package.json')).mode)
}

run()
