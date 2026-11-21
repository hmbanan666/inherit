import { createProgram, type Program, type ProjectOptions } from '@inherit/sandbox'
import { advanceGame, cloneCampaign, deployProject, getSurface, isStarterProject, type Campaign } from '@inherit/sim'

export type PreviewTicks = 100 | 500 | 2000

type Compile = (options: ProjectOptions) => Promise<Program>

async function simulate(campaign: Campaign, ticks: PreviewTicks, compile?: Compile) {
  const surface = getSurface(campaign)
  let program: Program | undefined
  let errors = 0
  let firstError = ''
  let cpuPeak = 0
  const delivered = () => Object.values(campaign.world.delivered).reduce((sum, amount) => sum + amount, 0)
  const startShipped = delivered()
  const startMoney = campaign.economy.money
  try {
    try {
      program = await compile?.({
        files: campaign.project.deployed,
        memory: campaign.memory,
        budget: surface.budget,
        unlockedEvents: surface.events,
      })
    } catch (error) {
      errors++
      firstError = String(error)
    }
    const idle = () => {}
    let controller = program
    for (let i = 0; i < ticks; i++) {
      try {
        advanceGame(campaign, controller ?? idle)
      } catch (error) {
        errors++
        firstError ||= String(error)
        controller = undefined
      }
      cpuPeak = Math.max(cpuPeak, program?.stats.used ?? 0)
    }
  } finally {
    program?.dispose()
  }
  const machines = campaign.world.machines
  return {
    shipped: delivered() - startShipped,
    money: campaign.economy.money - startMoney,
    idle: machines.filter((m) => m.status !== 'working' && m.status !== 'blocked').length,
    blocked: machines.filter((m) => m.status === 'blocked').length,
    errors,
    cpuPeak,
    firstError,
  }
}

export async function previewProject(live: Campaign, ticks: PreviewTicks, compile: Compile = createProgram) {
  const baseline = cloneCampaign(live)
  const draft = cloneCampaign(baseline)
  deployProject(draft)
  return {
    startTick: live.world.tick,
    ticks,
    draft: await simulate(draft, ticks, compile),
    baseline: await simulate(baseline, ticks, isStarterProject(baseline.project.deployed) ? undefined : compile),
  }
}
export type PreviewResult = Awaited<ReturnType<typeof previewProject>>
