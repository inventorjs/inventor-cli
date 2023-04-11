const http = require('http')

const server = http.createServer((req, res) => {
  res.end('14:23')
})

server.listen(9000)
