import type {
  AnyRule,
  RunSchedulerInput,
  RunSchedulerOutput,
  SchedulerResult,
  SchedulerShift,
  SchedulerUser,
} from './types'
import {
  calculateShiftDurationHours,
  canAssignUserWithMaxHoursRule,
  extractHardRules,
  extractSoftRules,
  getEligibleUsersForShift,
  getMaxHoursPerWeekRule,
  sortEligibleUsersForShift,
} from './ruleEngine'

export function runScheduler(input: RunSchedulerInput): RunSchedulerOutput {
  const { users, shifts, rules } = input

  const hardRules = extractHardRules(rules as AnyRule[])
  const softRules = extractSoftRules(rules as AnyRule[])
  const maxHoursRule = getMaxHoursPerWeekRule(hardRules)

  const result: SchedulerResult = {
    assignments: [],
    unfilled: [],
  }

  const currentAssignedHoursByUser = new Map<string, number>()

  const sortedShifts = [...shifts].sort(
    (a: SchedulerShift, b: SchedulerShift) => a.start.getTime() - b.start.getTime(),
  )

  for (const shift of sortedShifts) {
    const eligibleUsers = getEligibleUsersForShift(users as SchedulerUser[], shift)

    const assignedUserIds: string[] = []
    let hadHardRuleBlock = false

    if (eligibleUsers.length > 0) {
      const orderedCandidates = sortEligibleUsersForShift(eligibleUsers, shift, softRules)

      for (const user of orderedCandidates) {
        if (assignedUserIds.length >= shift.staffingRequired) break

        const canAssign = canAssignUserWithMaxHoursRule({
          userId: user.id,
          shift,
          maxHoursRule,
          currentAssignedHoursByUser,
        })

        if (!canAssign) {
          hadHardRuleBlock = true
          continue
        }

        assignedUserIds.push(user.id)

        const duration = calculateShiftDurationHours(shift)
        const current = currentAssignedHoursByUser.get(user.id) ?? 0
        currentAssignedHoursByUser.set(user.id, current + duration)
      }
    }

    if (assignedUserIds.length > 0) {
      result.assignments.push({
        shiftId: shift.id,
        shiftTitle: shift.title,
        assignedUserIds,
      })
    }

    if (assignedUserIds.length < shift.staffingRequired) {
      const missingCount = shift.staffingRequired - assignedUserIds.length

      let reason:
        | 'No eligible users meet skill/level'
        | 'Eligible users exist but blocked by hard rule constraints (max hours)'

      if (eligibleUsers.length === 0) {
        reason = 'No eligible users meet skill/level'
      } else if (hadHardRuleBlock) {
        reason = 'Eligible users exist but blocked by hard rule constraints (max hours)'
      } else {
        reason = 'No eligible users meet skill/level'
      }

      result.unfilled.push({
        shiftId: shift.id,
        shiftTitle: shift.title,
        missingCount,
        reason,
      })
    }
  }

  const humanReadable = buildHumanReadableSummary(result)

  return {
    result,
    humanReadable,
  }
}

export function buildHumanReadableSummary(result: SchedulerResult): string {
  const lines: string[] = []

  for (const assignment of result.assignments) {
    const title = assignment.shiftTitle ?? assignment.shiftId
    const assignedIds = assignment.assignedUserIds.join(', ') || 'none'
    lines.push(
      `Shift ${title}: assigned ${assignment.assignedUserIds.length} user(s) [${assignedIds}]`,
    )
  }

  for (const unfilled of result.unfilled) {
    const title = unfilled.shiftTitle ?? unfilled.shiftId
    lines.push(
      `Shift ${title}: missing ${unfilled.missingCount} user(s) — ${unfilled.reason}`,
    )
  }

  return lines.join('\n')
}

