/**
 * 面向web的路由
 *
 * $author : sunkeysun
 */

export default (router) => {
    router.get('/api', 'index/Index@api')
    router.get('*', 'index/Index@index')
}
