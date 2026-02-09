import type { CollectionConfig } from 'payload'

const Rules: CollectionConfig = {
  slug: 'rules',
  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        {
          label: 'Hard',
          value: 'hard',
        },
        {
          label: 'Soft',
          value: 'soft',
        },
      ],
    },
    {
      name: 'enabled',
      type: 'checkbox',
      required: true,
      defaultValue: true,
    },
    {
      name: 'priority',
      type: 'number',
      required: true,
    },
    {
      name: 'template',
      type: 'relationship',
      relationTo: 'rule-templates',
      required: true,
    },
    {
      name: 'params',
      type: 'json',
      required: false,
    },
  ],
}

export default Rules

