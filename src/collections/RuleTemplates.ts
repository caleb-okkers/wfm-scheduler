import type { CollectionConfig } from 'payload'

const RuleTemplates: CollectionConfig = {
  slug: 'rule-templates',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    create: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'key',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      required: false,
    },
    {
      name: 'paramSchema',
      label: 'Parameter schema',
      type: 'json',
      required: true,
    },
  ],
}

export default RuleTemplates

