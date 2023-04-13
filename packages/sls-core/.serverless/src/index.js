const http = require('http')

const server = http.createServer((req, res) => {
  res.end('20:49')
})

server.listen(9000)
