import Koa from 'koa'
import Router from '@koa/router'

const app = new Koa()
const router = new Router()

router.get('/', (ctx) => {
  ctx.body = '<%- helloworld %>'
})

app.use(router.routes())
app.listen(process.env.SERVER_PORT, () => {
  console.log(`server listen on ${process.env.SERVER_PORT}`)
})
