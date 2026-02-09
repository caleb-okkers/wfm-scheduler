import type {
  AnyRule,
  HardRule,
  MaxHoursPerWeekRule,
  SchedulerShift,
  SchedulerUser,
  SkillLevel,
  SoftRule,
} from './types'

export const SKILL_LEVEL_ORDER: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'expert']

export const SKILL_LEVEL_RANK: Record<SkillLevel, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
  expert: 3,
}

export function skillLevelGte(userLevel: SkillLevel, required: SkillLevel): boolean {
  return SKILL_LEVEL_RANK[userLevel] >= SKILL_LEVEL_RANK[required]
}

export function getEligibleUsersForShift(
  users: SchedulerUser[],
  shift: SchedulerShift,
): SchedulerUser[] {
  return users.filter((user) =>
    user.skills.some(
      (s) => s.skillId === shift.requiredSkillId && skillLevelGte(s.level, shift.requiredLevel),
    ),
  )
}

export function calculateShiftDurationHours(shift: SchedulerShift): number {
  const ms = shift.end.getTime() - shift.start.getTime()
  if (ms <= 0) return 0
  return ms / (1000 * 60 * 60)
}

export function extractHardRules(rules: AnyRule[]): HardRule[] {
  return rules.filter((rule): rule is HardRule => rule.type === 'hard' && rule.enabled)
}

export function extractSoftRules(rules: AnyRule[]): SoftRule[] {
  return rules
    .filter((rule): rule is SoftRule => rule.type === 'soft' && rule.enabled)
    .sort((a, b) => a.priority - b.priority)
}

export function getMaxHoursPerWeekRule(hardRules: HardRule[]): MaxHoursPerWeekRule | undefined {
  return hardRules.find(
    (rule): rule is MaxHoursPerWeekRule =>
      rule.templateKey === 'MAX_HOURS_PER_WEEK' && rule.enabled,
  )
}

export function canAssignUserWithMaxHoursRule(args: {
  userId: string
  shift: SchedulerShift
  maxHoursRule?: MaxHoursPerWeekRule
  currentAssignedHoursByUser: Map<string, number>
}): boolean {
  const { userId, shift, maxHoursRule, currentAssignedHoursByUser } = args
  if (!maxHoursRule) return true

  const duration = calculateShiftDurationHours(shift)
  const current = currentAssignedHoursByUser.get(userId) ?? 0

  return current + duration <= maxHoursRule.params.maxHours
}

export function getUserSkillLevelForShift(
  user: SchedulerUser,
  shift: SchedulerShift,
): SkillLevel | undefined {
  const match = user.skills.find((s) => s.skillId === shift.requiredSkillId)
  return match?.level
}

export function sortEligibleUsersForShift(
  eligibleUsers: SchedulerUser[],
  shift: SchedulerShift,
  softRules: SoftRule[],
): SchedulerUser[] {
  if (eligibleUsers.length <= 1) return eligibleUsers

  const preferHigherSkillRule = softRules.find(
    (rule) => rule.templateKey === 'PREFER_HIGHER_SKILL_LEVEL' && rule.enabled,
  )

  const minimumLevel = preferHigherSkillRule?.params.minimumLevel

  const ordered = [...eligibleUsers]

  ordered.sort((a, b) => {
    const aLevel = getUserSkillLevelForShift(a, shift) ?? 'beginner'
    const bLevel = getUserSkillLevelForShift(b, shift) ?? 'beginner'

    const aRank = SKILL_LEVEL_RANK[aLevel]
    const bRank = SKILL_LEVEL_RANK[bLevel]

    if (minimumLevel) {
      const minRank = SKILL_LEVEL_RANK[minimumLevel]
      const aMeets = aRank >= minRank
      const bMeets = bRank >= minRank

      if (aMeets !== bMeets) {
        return aMeets ? -1 : 1
      }
    }

    if (aRank !== bRank) {
      return bRank - aRank
    }

    return a.id.localeCompare(b.id)
  })

  return ordered
}

