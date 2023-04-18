const http = require('http')

const server = http.createServer((req, res) => {
  res.end('12:01')
})

server.listen(9000)
