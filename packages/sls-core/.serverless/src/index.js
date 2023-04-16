const http = require('http')

const server = http.createServer((req, res) => {
  res.end('23:09')
})

server.listen(9000)
