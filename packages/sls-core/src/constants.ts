export const RUN_STATUS = {
  run: { status: 'run', statusText: '运行组件实例' },
  poll: { status: 'poll', statusText: '轮询实例状态' },
  resolve: { status: 'resolve', statusText: '解析配置文件' },
  processSrc: { status: 'processSrc', statusText: '处理src文件夹' },
  readSrc: { status: 'readSrc', statusText: '读取src文件夹内容' },
  zipSrc: { status: 'zipSrc', statusText: '压缩src变更文件' },
  uploadSrc: { status: 'uploadSrc', statusText: '上传src压缩包' },
  updateCode: { status: 'updateCode', statusText: '更新函数代码' },
}

export const REPORT_START = 'start'
export const REPORT_END = 'end'

export const COMPONENT_SCF = 'scf'
export const COMPONENT_MULTI_SCF = 'multi_scf'
export const COMPONENT_APIGATEWAY = 'apigateway'
