import traverse from 'traverse'

function isObject(data) {
  return data && typeof data === 'object'
}

function resolveSlsTemplateVariables(template) {
  const variableRegex = /\$\{([\w:-]+)\}/g
  for (let instanceName in template.instances) {
    const instance = template.instances[instanceName]
    traverse(instance).forEach(function (val) {
      if (typeof val === 'string') {
        let updateValue = val
        variableRegex.lastIndex = 0
        val.match(variableRegex)?.forEach((v) => {
          variableRegex.lastIndex = 0
          const [, key] = variableRegex.exec(v)
          let resolvedValue = v
          if (key.startsWith('env:')) {
            const envName = key.split(':')[1] ?? ''
            resolvedValue = process.env[envName] ?? val
          } else {
            const innerVal = instance[key]
            if (innerVal && !isObject(innerVal)) {
              resolvedValue = innerVal
            }
          }
          updateValue = updateValue.replace(`\$\{${key}\}`, resolvedValue)
        })
        if (updateValue !== val) {
          this.update(updateValue)
        }
      }
    })
  }
  return template
}

console.log(
  JSON.stringify(
    resolveSlsTemplateVariables({
      app: 'test',
      instances: {
        ins1: {
          app: 'test',
          stage: 'dev',
          component: 'scf',
          inputs: {
            name: '${app}-${stage}',
            vpc: '${env:vpcxxx}',
          },
        },
      },
    }),
    null,
    2,
  ),
)
