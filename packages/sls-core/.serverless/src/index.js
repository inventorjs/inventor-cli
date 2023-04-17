const http = require('http')

const server = http.createServer((req, res) => {
  res.end('18:00')
})

server.listen(9000)
