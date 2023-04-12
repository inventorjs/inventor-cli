const http = require('http')

const server = http.createServer((req, res) => {
  res.end('11:46')
})

server.listen(9000)
