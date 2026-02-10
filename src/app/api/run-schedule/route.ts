import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { runScheduler } from '../../../scheduler/scheduler'
import type { AnyRule, RunSchedulerInput, SchedulerShift, SchedulerUser, SkillLevel } from '../../../scheduler/types'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

interface RunScheduleBody {
  from: string
  to: string
}

const fmt = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 16)

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

  const payload = await getPayload({ config: configPromise })

  try {
    const [usersRes, shiftsRes, rulesRes] = await Promise.all([
      payload.find({
        collection: 'users',
        depth: 2, // get email + populated skills.skill
        limit: 1000,
      }),
      payload.find({
        collection: 'shifts',
        depth: 1, // get requiredSkill populated
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
        where: { enabled: { equals: true } },
        depth: 1,
        limit: 100,
      }),
    ])

    // Lookups for human-readable output
    const userEmailById = new Map<string, string>()
    const skillNameById = new Map<string, string>()
    const shiftById = new Map<
      string,
      { title: string | null; start: Date; end: Date; requiredSkillName: string | null; requiredLevel: SkillLevel }
    >()

    const users: SchedulerUser[] = (usersRes.docs as any[]).map((user) => {
      userEmailById.set(String(user.id), String(user.email ?? ''))

      const skills =
        (user.skills as any[] | undefined)?.map((entry) => {
          const skill = entry?.skill
          const skillId =
            typeof skill === 'string'
              ? skill
              : skill && typeof skill === 'object'
                ? String(skill.id)
                : ''

          const skillName =
            skill && typeof skill === 'object' && 'name' in skill ? String(skill.name ?? '') : null
          if (skillId && skillName) skillNameById.set(skillId, skillName)

          return { skillId, level: entry.level as SkillLevel }
        }) ?? []

      return { id: String(user.id), skills }
    })

    const shifts: SchedulerShift[] = (shiftsRes.docs as any[]).map((shift) => {
      const requiredSkill = shift.requiredSkill
      const requiredSkillId =
        typeof requiredSkill === 'string'
          ? requiredSkill
          : requiredSkill && typeof requiredSkill === 'object'
            ? String(requiredSkill.id)
            : ''

      const requiredSkillName =
        requiredSkill && typeof requiredSkill === 'object' && 'name' in requiredSkill
          ? String(requiredSkill.name ?? '')
          : null

      if (requiredSkillId && requiredSkillName) skillNameById.set(requiredSkillId, requiredSkillName)

      const id = String(shift.id)
      const title = (shift.title as string | undefined) ?? null
      const start = new Date(shift.start)
      const end = new Date(shift.end)
      const requiredLevel = shift.requiredLevel as SkillLevel

      shiftById.set(id, { title, start, end, requiredSkillName, requiredLevel })

      return {
        id,
        title,
        start,
        end,
        requiredSkillId,
        requiredLevel,
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
            params: { maxHours },
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
            params: { minimumLevel: minimumLevelRaw },
          } as AnyRule
        }

        return null
      })
      .filter((r): r is AnyRule => r !== null)

    const schedulerInput: RunSchedulerInput = { users, shifts, rules }

    const { result } = runScheduler(schedulerInput)

    // Enrich result for humans (keep IDs too)
    const enriched = {
      ...result,
      assignments: result.assignments.map((a) => {
        const shiftMeta = shiftById.get(a.shiftId)
        return {
          ...a,
          shiftTitle: shiftMeta?.title ?? a.shiftTitle ?? null,
          assignedUsers: a.assignedUserIds.map((id) => ({
            id,
            email: userEmailById.get(id) ?? id,
          })),
        }
      }),
      unfilled: result.unfilled.map((u) => {
        const shiftMeta = shiftById.get(u.shiftId)
        return {
          ...u,
          shiftTitle: shiftMeta?.title ?? u.shiftTitle ?? null,
        }
      }),
    }

    // Better human-readable summary
    const lines: string[] = []
    lines.push(`Schedule Run: ${fmt(from)} → ${fmt(to)}`)
    lines.push('')

    for (const a of enriched.assignments) {
      const meta = shiftById.get(a.shiftId)
      const shiftLabel =
        meta?.title ?? a.shiftTitle ?? `Shift ${a.shiftId}`
      const skillLabel = meta?.requiredSkillName ? ` (${meta.requiredSkillName} – ${meta.requiredLevel})` : ''
      const timeLabel = meta ? ` [${fmt(meta.start)}–${fmt(meta.end)}]` : ''
      lines.push(`${shiftLabel}${skillLabel}${timeLabel}`)
      lines.push(`- Assigned (${a.assignedUsers.length}):`)
      for (const u of a.assignedUsers) lines.push(`  • ${u.email}`)
      lines.push('')
    }

    for (const u of enriched.unfilled) {
      const meta = shiftById.get(u.shiftId)
      const shiftLabel =
        meta?.title ?? u.shiftTitle ?? `Shift ${u.shiftId}`
      lines.push(`${shiftLabel}`)
      lines.push(`- Unfilled (${u.missingCount}): ${u.reason}`)
      lines.push('')
    }

    const humanReadable = lines.join('\n').trim()

    const created = await payload.create({
      collection: 'schedule-runs',
      data: {
        from,
        to,
        result: enriched as unknown as JsonValue,
        humanReadable,
      },
    })

    return Response.json(
      {
        ok: true,
        id: String(created.id),
        humanReadable,
        result: enriched,
      },
      { status: 200 },
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
