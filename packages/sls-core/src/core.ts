/**
 * core logic
 */
import {
  InstanceService,
  type SlsConfig,
  type Options,
} from './instance.service.js'

export class Sls {
  private instanceService: InstanceService

  constructor(
    private readonly config: SlsConfig,
    private readonly options: Options = {},
  ) {
    this.instanceService = new InstanceService(this.config, this.options)
  }

  async deploy() {
    return this.instanceService.run('deploy')
  }

  async remove() {
    return this.instanceService.run('remove')
  }

  async info() {
    return this.instanceService.info()
  }

  async dev() {
    console.log('dev...')
  }
}
