/**
 * 常用正则表达式
 * @author: sunkeysun
 */
export const name = /^[a-zA-Z-_]{1,10}$/
export const actionName = /^[a-z]([a-z-:]{0,8}[a-z])?$/
export const desc = /^[\sa-z-\u4e00-\u9fa5]{5,30}$/
export const author = /^[\s\w-\u4e00-\u9fa5]{1,20}$/
export const packageName = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/
export const slsOrgName = /^[a-z][a-z0-9_-]{1,20}[a-z0-9]$/
export const slsAppName = /^[a-z][a-z0-9_-]{1,20}[a-z0-9]$/
export const slsStageName = /^[a-z][a-z0-9_-]{1,20}[a-z0-9]$/
