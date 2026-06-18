/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

// Keep this list in sync with .lovable/backlog/discord.md
const BACKLOG_ITEMS: string[] = [
  'Create #fgn-play-feed channel in the Fiber Gaming Network server.',
  'Grant FGN Play bot View Channel + Send Messages + Embed Links on that channel.',
  'Copy the new channel ID (Developer Mode → right-click → Copy Channel ID).',
  'Add the bot route in Admin → Ecosystem → Discord for tournament_published (tenant blank).',
  'Test send from the admin panel and confirm the embed lands.',
  'Add remaining purposes (tournament_completed, tenant_event_published, challenge_published, quest_published, prize_redeemed, achievement_earned) for the same channel.',
  'Register slash commands so /leaderboard, /tournaments, /challenges work in the FGN server.',
  '(Optional) Add per-tenant routes for partner tenants that want their own feed.',
]

interface Props {
  date?: string
  items?: string[]
}

const Email = ({
  date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  items = BACKLOG_ITEMS,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>FGN Discord backlog — {items.length} open items as of {date}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Discord Integration Backlog</Heading>
        <Text style={meta}>Daily reminder · {date}</Text>
        <Text style={lead}>
          You asked to be reminded each day so you can decide when to tackle the
          remaining Discord setup work. Reply or open the admin panel when you're
          ready to knock one out.
        </Text>

        <Section style={listWrap}>
          {items.map((item, i) => (
            <Text key={i} style={listItem}>
              <span style={badge}>{i + 1}</span> {item}
            </Text>
          ))}
        </Section>

        <Text style={footerText}>
          Manage routes in{' '}
          <Link href="https://play.fgn.gg/admin/ecosystem" style={link}>
            Admin → Ecosystem → Discord
          </Link>
          .
        </Text>
        <Text style={footerSmall}>
          Sent by FGN Play · To stop these reminders, ask the agent to disable the
          daily Discord backlog reminder.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: () => `FGN Discord backlog — ${BACKLOG_ITEMS.length} open items`,
  displayName: 'Discord Backlog Daily Reminder',
  previewData: {},
  to: 'darcy@fgn.gg',
} satisfies TemplateEntry

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  margin: 0,
  padding: 0,
}
const container: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 28px',
}
const h1: React.CSSProperties = {
  color: '#0a0a14',
  fontSize: '24px',
  fontWeight: 700,
  margin: '0 0 4px',
  letterSpacing: '-0.01em',
}
const meta: React.CSSProperties = {
  color: '#8a8d99',
  fontSize: '13px',
  margin: '0 0 20px',
}
const lead: React.CSSProperties = {
  color: '#2c2f3a',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 24px',
}
const listWrap: React.CSSProperties = {
  backgroundColor: '#f6f8fb',
  border: '1px solid #e6e9ef',
  borderRadius: '10px',
  padding: '8px 16px',
  margin: '0 0 24px',
}
const listItem: React.CSSProperties = {
  color: '#1c1f2a',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '12px 0',
}
const badge: React.CSSProperties = {
  display: 'inline-block',
  minWidth: '22px',
  textAlign: 'center',
  backgroundColor: '#00e0ff',
  color: '#0a0a14',
  borderRadius: '999px',
  fontWeight: 700,
  fontSize: '12px',
  padding: '2px 6px',
  marginRight: '8px',
}
const footerText: React.CSSProperties = {
  color: '#2c2f3a',
  fontSize: '14px',
  margin: '0 0 8px',
}
const footerSmall: React.CSSProperties = {
  color: '#8a8d99',
  fontSize: '12px',
  margin: '8px 0 0',
}
const link: React.CSSProperties = {
  color: '#7a5cff',
  textDecoration: 'underline',
}
