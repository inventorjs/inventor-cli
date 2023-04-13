const http = require('http')

const server = http.createServer((req, res) => {
  res.end('15:39')
})

server.listen(9000)
