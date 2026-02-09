import type { CollectionConfig } from 'payload'

const Skills: CollectionConfig = {
  slug: 'skills',
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'description',
      type: 'textarea',
      required: false,
    },
  ],
}

export default Skills

