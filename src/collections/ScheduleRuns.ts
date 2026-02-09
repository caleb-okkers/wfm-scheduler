import type { CollectionConfig } from 'payload'

const ScheduleRuns: CollectionConfig = {
  slug: 'schedule-runs',
  admin: {
    useAsTitle: 'humanReadable',
  },
  fields: [
    {
      name: 'from',
      type: 'date',
      required: true,
    },
    {
      name: 'to',
      type: 'date',
      required: true,
    },
    {
      name: 'result',
      type: 'json',
      required: true,
    },
    {
      name: 'humanReadable',
      type: 'textarea',
      required: true,
    },
  ],
}

export default ScheduleRuns

