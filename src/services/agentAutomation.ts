import type { Agent } from '../data/agentData'
import { getResolvedAgentFrequency } from '../data/agentData'
import type { Payor } from '../data/payorData'

/**
 * Production: the job scheduler calls this for each due agent. Implement by querying
 * patients for `agent.payorId` + `agent.planId`, then invoking eligibility (or other) APIs.
 */
export async function runAgentScheduledJob(agent: Agent, payors: Payor[]): Promise<void> {
  if (agent.automationJob === 'none' || !agent.enabled) return
  if (agent.automationJob === 'eligibility_batch') {
    void getResolvedAgentFrequency(agent, payors)
    // Placeholder: connect to batch eligibility / pVerify here.
    return
  }
}
