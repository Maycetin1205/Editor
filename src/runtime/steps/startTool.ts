import type { RuntimeStartToolStep } from '../../core/data/steps/startTool'
import type { StepRunner } from './stepRunner'

export const startToolRunner: StepRunner<RuntimeStartToolStep> = {
  kind: 'START_TOOL',
  run(step, run) {
    const toolNumber = step.toolNumber.trim()
    if (toolNumber === '') return Promise.resolve({ failed: true })
    const params = step.parameter.map((binding) => run.host.resolveParameter(binding, run.parameterValues))
    return Promise.resolve({ failed: !run.host.startTool(toolNumber, params) })
  },
}
