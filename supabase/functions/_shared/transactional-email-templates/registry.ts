import type { ComponentType } from 'npm:react@18.3.1'
import { template as discordBacklogReminder } from './discord-backlog-reminder.tsx'
import { template as weeklyRegistrationsDigest } from './weekly-registrations-digest.tsx'
import { template as marketingAlert } from './marketing-alert.tsx'
import { template as marketingDraftDigest } from './marketing-draft-digest.tsx'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'discord-backlog-reminder': discordBacklogReminder,
  'weekly-registrations-digest': weeklyRegistrationsDigest,
  'marketing-alert': marketingAlert,
  'marketing-draft-digest': marketingDraftDigest,
}
