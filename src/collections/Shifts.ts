import type { CollectionConfig } from 'payload'

const Shifts: CollectionConfig = {
  slug: 'shifts',
  fields: [
    {
      name: 'start',
      type: 'date',
      required: true,
    },
    {
      name: 'end',
      type: 'date',
      required: true,
    },
    {
      name: 'requiredSkill',
      type: 'relationship',
      relationTo: 'skills',
      required: true,
    },
    {
      name: 'requiredLevel',
      type: 'select',
      required: true,
      options: [
        {
          label: 'Beginner',
          value: 'beginner',
        },
        {
          label: 'Intermediate',
          value: 'intermediate',
        },
        {
          label: 'Advanced',
          value: 'advanced',
        },
        {
          label: 'Expert',
          value: 'expert',
        },
      ],
    },
    {
      name: 'staffingRequired',
      type: 'number',
      required: true,
    },
  ],
}

export default Shifts

