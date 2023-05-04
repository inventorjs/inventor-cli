const http = require('http')

const server = http.createServer((req, res) => {
  res.end('hello, inventor sls')
})

server.listen(process.env.SERVER_PORT)
