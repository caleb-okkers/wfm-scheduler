import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { runScheduler } from '../../../scheduler/scheduler'
import type {
  AnyRule,
  RunSchedulerInput,
  SchedulerShift,
  SchedulerUser,
  SkillLevel,
} from '../../../scheduler/types'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

interface RunScheduleBody {
  from: string
  to: string
}

export const POST = async (req: Request) => {
  let body: RunScheduleBody

  try {
    body = (await req.json()) as RunScheduleBody
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body?.from || !body?.to) {
    return Response.json({ ok: false, error: '`from` and `to` are required' }, { status: 400 })
  }

  const from = new Date(body.from)
  const to = new Date(body.to)

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return Response.json({ ok: false, error: 'Invalid `from` or `to` datetime' }, { status: 400 })
  }

  const payload = await getPayload({
    config: configPromise,
  })

  try {
    const [usersRes, shiftsRes, rulesRes] = await Promise.all([
      payload.find({
        collection: 'users',
        limit: 1000,
      }),
      payload.find({
        collection: 'shifts',
        where: {
          and: [
            { start: { greater_than_equal: from.toISOString() } },
            { end: { less_than_equal: to.toISOString() } },
          ],
        },
        limit: 1000,
      }),
      payload.find({
        collection: 'rules',
        where: {
          enabled: { equals: true },
        },
        depth: 1,
        limit: 100,
      }),
    ])

    const users: SchedulerUser[] = (usersRes.docs as any[]).map((user) => ({
      id: String(user.id),
      skills:
        (user.skills as any[] | undefined)?.map((entry) => {
          const skill = entry?.skill
          const skillId =
            typeof skill === 'string'
              ? skill
              : skill && typeof skill === 'object'
                ? String(skill.id)
                : ''

          return {
            skillId,
            level: entry.level as SkillLevel,
          }
        }) ?? [],
    }))

    const shifts: SchedulerShift[] = (shiftsRes.docs as any[]).map((shift) => {
      const requiredSkill = shift.requiredSkill
      const requiredSkillId =
        typeof requiredSkill === 'string'
          ? requiredSkill
          : requiredSkill && typeof requiredSkill === 'object'
            ? String(requiredSkill.id)
            : ''

      return {
        id: String(shift.id),
        title: (shift.title as string | undefined) ?? null,
        start: new Date(shift.start),
        end: new Date(shift.end),
        requiredSkillId,
        requiredLevel: shift.requiredLevel as SkillLevel,
        staffingRequired: Number(shift.staffingRequired ?? 0),
      }
    })

    const rules: AnyRule[] = ((rulesRes.docs as any[]) ?? [])
      .map((rule) => {
        const template = rule.template
        const templateDoc =
          template && typeof template === 'object' && 'key' in template ? template : null
        const templateKey = templateDoc?.key as string | undefined

        if (!templateKey) return null

        if (templateKey === 'MAX_HOURS_PER_WEEK') {
          const maxHours = Number((rule.params as any)?.maxHours ?? 0)

          return {
            id: String(rule.id),
            name: (rule.name as string | undefined) ?? null,
            type: 'hard',
            enabled: Boolean(rule.enabled),
            priority: Number(rule.priority ?? 0),
            templateKey: 'MAX_HOURS_PER_WEEK',
            params: {
              maxHours,
            },
          } as AnyRule
        }

        if (templateKey === 'PREFER_HIGHER_SKILL_LEVEL') {
          const minimumLevelRaw = (rule.params as any)?.minimumLevel as SkillLevel | undefined

          return {
            id: String(rule.id),
            name: (rule.name as string | undefined) ?? null,
            type: 'soft',
            enabled: Boolean(rule.enabled),
            priority: Number(rule.priority ?? 0),
            templateKey: 'PREFER_HIGHER_SKILL_LEVEL',
            params: {
              minimumLevel: minimumLevelRaw,
            },
          } as AnyRule
        }

        return null
      })
      .filter((r): r is AnyRule => r !== null)

    const schedulerInput: RunSchedulerInput = {
      users,
      shifts,
      rules,
    }

    const { result, humanReadable } = runScheduler(schedulerInput)

    await payload.create({
      collection: 'schedule-runs',
      data: {
        from,
        to,
        result: result as unknown as JsonValue,
        humanReadable,
      },
    })

    return Response.json(
      {
        ok: true,
        humanReadable,
        result,
      },
      { status: 200 },
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}

