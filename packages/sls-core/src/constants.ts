export const RUN_STATUS = {
  resolve: { value: 'resolve', label: '解析配置文件' },
  readSrc: { value: 'readSrc', label: '读取src文件内容' },
  compress: { value: 'compress', label: '压缩变更文件' },
  upload: { value: 'upload', label: '上传压缩包' },
  deploy: { value: 'deploy', label: '部署组件实例' },
  remove: { value: 'remove', label: '删除组件实例' },
  pollDeploy: { value: 'pollDeploy', label: '等待部署完成' },
  pollRemove: { value: 'pollRemove', label: '等待删除完成' },
  deployFinish: { value: 'deployFinish', label: '部署已完成' },
  removeFinish: { value: 'removeFinish', label: '删除已完成' },
}
