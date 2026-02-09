import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    {
      name: 'skills',
      type: 'array',
      fields: [
        {
          name: 'skill',
          type: 'relationship',
          relationTo: 'skills',
          required: true,
        },
        {
          name: 'level',
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
      ],
    },
  ],
}
