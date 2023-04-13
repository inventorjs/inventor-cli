import JsZip from 'jszip'
import fs from 'fs/promises'

async function run() {
  const zip = new JsZip()
  const stat = await fs.lstat('./nms_data/husky')
  console.log(stat.isSymbolicLink())
}

run()
