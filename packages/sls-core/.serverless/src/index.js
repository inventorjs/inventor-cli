const http = require('http')

const server = http.createServer((req, res) => {
  process.stdout.write(JSON.stringify({ helloworld: '33333333333333', SCF_Message: '-' }) + '\n')
  res.end('17:40')
})

server.listen(9000)
