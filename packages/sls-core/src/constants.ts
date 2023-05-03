export const RUN_STATUS = {
  run: { status: 'run', statusText: '运行组件实例' },
  poll: { status: 'poll', statusText: '轮询实例状态' },
  resolve: { status: 'resolve', statusText: '解析配置文件' },
  updateCode: { status: 'updateCode', statusText: '更新云端代码' },
}

export const REPORT_START = 'start'
export const REPORT_END = 'end'

export const COMPONENT_SCF = 'scf'
export const COMPONENT_CLS = 'cls'
export const COMPONENT_LAYER = 'layer'
export const COMPONENT_MULTI_SCF = 'multi-scf'
export const COMPONENT_APIGATEWAY = 'apigateway'
