'use client'

import React, { useMemo, useState } from 'react'

type RunScheduleResponse =
  | { ok: true; id: string; humanReadable: string; result: unknown }
  | { ok: false; error: string }

function isoStartOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.toISOString()
}

function isoEndOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x.toISOString()
}

export default function RunSchedulerBeforeList() {
  const defaults = useMemo(() => {
    const now = new Date()
    const from = new Date(now)
    from.setDate(now.getDate())
    const to = new Date(now)
    to.setDate(now.getDate() + 7)
    return { from: isoStartOfDay(from), to: isoEndOfDay(to) }
  }, [])

  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ id: string; humanReadable: string } | null>(null)

  const run = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/run-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to }),
      })

      const json = (await res.json()) as RunScheduleResponse

      if (!res.ok || !json.ok) {
        setError('error' in json ? json.error : 'Failed to run scheduler')
        return
      }

      setSuccess({ id: json.id, humanReadable: json.humanReadable })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        padding: 16,
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 8,
        marginBottom: 16,
        background: 'var(--theme-elevation-0)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0 }}>Run Scheduler</h3>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
            Runs scheduling for shifts within the selected ISO date range and saves a Schedule Run.
          </div>
        </div>

        <button
          type="button"
          onClick={run}
          disabled={loading}
          style={{
            padding: '10px 12px',
            borderRadius: 6,
            border: '1px solid var(--theme-elevation-150)',
            background: 'var(--theme-elevation-50)',
            cursor: loading ? 'not-allowed' : 'pointer',
            height: 40,
            alignSelf: 'end',
          }}
        >
          {loading ? 'Running…' : 'Run Scheduler'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12 }}>From (ISO)</label>
          <input value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 340 }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12 }}>To (ISO)</label>
          <input value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 340 }} />
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 12, color: 'var(--theme-error-500)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ marginTop: 12, fontSize: 13 }}>
          <div>
            Saved run:{' '}
            <a href={`/admin/collections/schedule-runs/${success.id}`} style={{ textDecoration: 'underline' }}>
              open result
            </a>
          </div>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              margin: '8px 0 0 0',
              padding: 12,
              borderRadius: 6,
              background: 'var(--theme-elevation-50)',
              border: '1px solid var(--theme-elevation-150)',
            }}
          >
            {success.humanReadable}
          </pre>
        </div>
      )}
    </div>
  )
}