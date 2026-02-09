# Project Overview — WFM Scheduler (Payload CMS v3)

Goal

Build a Payload CMS v3 project (Next.js-native) that can automatically schedule call center staff into shifts based on multiple skills with skill levels.

Scheduling must enforce hard rules and apply soft rules by unique priority.

Rules must be configurable via Payload Admin UI (no separate custom frontend required).

Scheduling is manually triggered and returns a single best schedule.
  
If a complete schedule cannot be produced due to hard rules, return a partial schedule and report unfilled shifts.
   
Output is human-readable only.
    
No decision explanations and no compliance/audit logging required.
     
Rule changes apply only to future runs. No versioning/audit history for rules.

Confirmed Requirements (from PO call)
- Users can have multiple skills.
- Skills have levels (not binary).
- Shifts require exactly one skill and a minimum required level.
- Shifts can span multiple days (start/end datetimes).
- A user can be assigned to multiple shifts in the same run if rules allow.
- Hard rules example: labour laws / legal max working hours.
- Soft rules examples: optimize schedule; prioritize higher skill level.
- Soft rules have explicit unique priority levels; no two soft rules share the same priority → deterministic ordering, no conflicts.
- Admin UI is in scope; single admin manages rules.
- Rules are not fully dynamic logic; they are selected from predefined rule templates with configurable parameters.
- Scheduling is manually triggered.
- Performance is a concern at least conceptually; keep algorithm efficient and deterministic.
- Return a single best schedule (not multiple).
- Output: human-readable only.
- No requirement to explain “why assigned/not assigned”.
- No compliance/audit logs required.

Tech Stack
- Payload CMS v3 (Next.js App Router integration)
- MongoDB via @payloadcms/db-mongodb
- TypeScript
- Use Payload Admin UI at /admin to manage data and rules.

Core Entities / Collections (Payload)
1) users (auth enabled)
   - skills: array of { skill (relationship -> skills), level (enum: junior/mid/senior or numeric 1-3) }
2) skills
   - name (unique), description
3) shifts
   - title
   - start (datetime)
   - end (datetime)
   - requiredSkill (relationship -> skills)
   - requiredLevel (enum)
   - staffingRequired (number >= 1)
4) rule-templates (predefined set, seeded; not editable much)
   - key (unique, e.g. MAX_HOURS_PER_WEEK, PREFER_HIGHER_SKILL_LEVEL)
   - name, description
   - paramSchema (json) to guide params expected
5) rules (instances configured by admin)
   - name
   - type: hard|soft
   - enabled: boolean
   - priority: number (unique ordering for soft rules; hard can also have order but must always be enforced)
   - template (relationship -> rule-templates)
   - params: json
6) schedule-runs
   - from (datetime)
   - to (datetime)
   - result (json structured)
   - humanReadable (textarea)
   - timestamps

Rule Templates to Implement (minimum viable)
- Hard: MAX_HOURS_PER_WEEK
  params: { maxHours: number }
  behavior: prevent assigning a shift if user’s total assigned hours in the run window would exceed maxHours.
- Soft: PREFER_HIGHER_SKILL_LEVEL
  params: {}
  behavior: within eligible users, prefer higher skill level for the required skill.

Scheduling Behavior
- Triggered manually via API route (Next.js route handler), e.g. POST /api/run-schedule with JSON body { from, to }.
- Fetch shifts within range. Each shift needs staffingRequired number of users.
- Eligible user criteria: has requiredSkill AND userSkillLevel >= shift.requiredLevel.
- Hard rules must never be violated (enforce at assignment time).
- Soft rules applied by priority order (unique priorities) to rank candidates. Deterministic.
- Assign users greedily per shift (sorted by shift start time) to satisfy staffingRequired.
- Users may be assigned multiple shifts if hard rules allow (no constraint forbidding it unless added later).
- Produce single schedule output.
- If staffingRequired cannot be fully met: keep assigned portion, mark unfilled with reason.
  Reasons (simple):
  - No eligible users meet skill/level
  - Eligible users exist but blocked by hard rule constraints (max hours)
- Save schedule run to schedule-runs collection (result + humanReadable).

Output Format
- Human-readable: summary text lines listing each shift with assigned count/users and unfilled shifts with missing count + reason.
- JSON result: { assignments: [{ shiftId, shiftTitle, assignedUserIds }], unfilled: [{ shiftId, shiftTitle, missingCount, reason }] }

Non-Requirements / Explicitly Out of Scope
- No audit/version history of rule changes.
- No compliance logging or decision trace.
- No explanation of why each user was chosen.
- No automated scheduling triggers (manual only).
- No complex optimization solver required; greedy deterministic acceptable.

Implementation Notes
- Use Next.js App Router. Do not use Express server.ts patterns (Payload v2 style).
- Use Payload Local API (server-side) from route handlers to query collections and create schedule-runs.
- Keep code modular:
  /src/scheduler/ (types, ruleEngine, scheduler)
  /src/app/api/run-schedule/route.ts (API entry)
- Keep rule engine template-driven; do not implement arbitrary rule logic editor.
- Ensure .env is not committed; commit .env.example.
- Seed rule-templates early (either a seed script or manual creation in admin; prefer simple seed if time allows).

Deliverable Expectations (Interview)
- Repo builds and runs locally.
- /admin works for CRUD on collections.
- Running POST /api/run-schedule produces a schedule-run record and returns the result.
- Clean commit history and README with setup instructions (npm install, env, mongodb, run dev).

README Must Include
- Setup steps
- Required env vars (.env.example)
- How to access /admin
- How to seed rule templates / create rules
- Example request to run schedule (curl)
- What the scheduler currently supports (hard max hours + soft prefer higher level)

Git Hygiene
- Use a feature branch optional, but acceptable.
- Never commit node_modules or .env.
- Provide .env.example.

End of prompt.
