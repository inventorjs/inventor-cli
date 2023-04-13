const http = require('http')

const server = http.createServer((req, res) => {
  res.end('13:14')
})

server.listen(9000)
