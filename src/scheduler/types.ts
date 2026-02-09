export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

export interface UserSkill {
  skillId: string
  level: SkillLevel
}

export interface SchedulerUser {
  id: string
  skills: UserSkill[]
}

export interface SchedulerShift {
  id: string
  title: string | null
  start: Date
  end: Date
  requiredSkillId: string
  requiredLevel: SkillLevel
  staffingRequired: number
}

export type RuleType = 'hard' | 'soft'

export type RuleTemplateKey = 'MAX_HOURS_PER_WEEK' | 'PREFER_HIGHER_SKILL_LEVEL'

export interface BaseRule {
  id: string
  name: string | null
  type: RuleType
  enabled: boolean
  priority: number
  templateKey: RuleTemplateKey
}

export interface MaxHoursPerWeekParams {
  maxHours: number
}

export interface MaxHoursPerWeekRule extends BaseRule {
  type: 'hard'
  templateKey: 'MAX_HOURS_PER_WEEK'
  params: MaxHoursPerWeekParams
}

export interface PreferHigherSkillLevelParams {
  /**
   * Optional minimum level to prefer.
   * If omitted, higher levels are still preferred globally.
   */
  minimumLevel?: SkillLevel
}

export interface PreferHigherSkillLevelRule extends BaseRule {
  type: 'soft'
  templateKey: 'PREFER_HIGHER_SKILL_LEVEL'
  params: PreferHigherSkillLevelParams
}

export type HardRule = MaxHoursPerWeekRule
export type SoftRule = PreferHigherSkillLevelRule
export type AnyRule = HardRule | SoftRule

export interface AssignmentEntry {
  shiftId: string
  shiftTitle: string | null
  assignedUserIds: string[]
}

export type UnfilledReason =
  | 'No eligible users meet skill/level'
  | 'Eligible users exist but blocked by hard rule constraints (max hours)'

export interface UnfilledEntry {
  shiftId: string
  shiftTitle: string | null
  missingCount: number
  reason: UnfilledReason
}

export interface SchedulerResult {
  assignments: AssignmentEntry[]
  unfilled: UnfilledEntry[]
}

export interface RunSchedulerInput {
  users: SchedulerUser[]
  shifts: SchedulerShift[]
  rules: AnyRule[]
}

export interface RunSchedulerOutput {
  result: SchedulerResult
  humanReadable: string
}

