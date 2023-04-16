export const RUN_STATUS = {
  resolve: { status: 'resolve', statusText: '解析配置文件' },
  readSrc: { status: 'readSrc', statusText: '读取src文件内容' },
  compress: { status: 'compress', statusText: '压缩变更文件' },
  upload: { status: 'upload', statusText: '上传压缩包' },
  deploy: { status: 'deploy', statusText: '部署组件实例' },
  remove: { status: 'remove', statusText: '删除组件实例' },
  poll: { status: 'poll', statusText: '轮询实例状态' },
  run: { status: 'run', statusText: '运行组件实例' },
}
