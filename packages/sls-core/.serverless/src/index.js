const http = require('http')

const server = http.createServer((req, res) => {
  res.end('14:15')
})

server.listen(9000)
