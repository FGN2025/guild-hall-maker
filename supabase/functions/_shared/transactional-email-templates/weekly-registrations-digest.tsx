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

interface Registrant {
  displayName: string
  handle?: string | null
  registeredAt: string // pre-formatted Pacific time string
}

interface Group {
  name: string
  subtitle?: string | null
  registrants: Registrant[]
}

interface Props {
  windowLabel?: string
  tournaments?: Group[]
  quests?: Group[]
  challenges?: Group[]
  totals?: { tournaments: number; quests: number; challenges: number }
}

const Section_ = ({ title, groups }: { title: string; groups: Group[] }) => (
  <Section style={sectionWrap}>
    <Text style={sectionHeading}>{title}</Text>
    {groups.length === 0 ? (
      <Text style={emptyText}>No new registrations this week.</Text>
    ) : (
      groups.map((g, gi) => (
        <Section key={gi} style={groupWrap}>
          <Text style={groupName}>
            {g.name}
            {g.subtitle ? <span style={groupSubtitle}> — {g.subtitle}</span> : null}
          </Text>
          {g.registrants.map((r, ri) => (
            <Text key={ri} style={registrant}>
              <span style={dot}>•</span> {r.displayName}
              {r.handle ? <span style={handle}> (@{r.handle})</span> : null}
              <span style={timestamp}> — {r.registeredAt}</span>
            </Text>
          ))}
        </Section>
      ))
    )}
  </Section>
)

const Email = ({
  windowLabel = 'the last 7 days',
  tournaments = [],
  quests = [],
  challenges = [],
  totals = { tournaments: 0, quests: 0, challenges: 0 },
}: Props) => {
  const totalAll = totals.tournaments + totals.quests + totals.challenges
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>FGN weekly registrations — {totalAll} new sign-ups in {windowLabel}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Weekly Registrations Digest</Heading>
          <Text style={meta}>Window: {windowLabel}</Text>
          <Text style={lead}>
            {totalAll === 0
              ? 'No new sign-ups across Tournaments, Quests, or Challenges this week.'
              : `${totalAll} new sign-ups across Tournaments, Quests, and Challenges this week.`}
          </Text>

          <Section_ title="Tournaments" groups={tournaments} />
          <Section_ title="Quests" groups={quests} />
          <Section_ title="Challenges" groups={challenges} />

          <Text style={footerText}>
            {totals.tournaments} new tournament registration{totals.tournaments === 1 ? '' : 's'} ·{' '}
            {totals.quests} new quest enrollment{totals.quests === 1 ? '' : 's'} ·{' '}
            {totals.challenges} new challenge enrollment{totals.challenges === 1 ? '' : 's'}
          </Text>
          <Text style={footerText}>
            Open the{' '}
            <Link href="https://play.fgn.gg/admin" style={link}>
              admin panel
            </Link>{' '}
            for details.
          </Text>
          <Text style={footerSmall}>
            Sent by FGN Play · To stop these reminders, ask the agent to disable the weekly registrations digest.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => {
    const t = (data?.totals?.tournaments ?? 0) + (data?.totals?.quests ?? 0) + (data?.totals?.challenges ?? 0)
    return `FGN weekly registrations — ${t} new sign-up${t === 1 ? '' : 's'}`
  },
  displayName: 'Weekly Registrations Digest',
  previewData: {
    windowLabel: 'Fri Jun 12 → Fri Jun 19',
    totals: { tournaments: 2, quests: 1, challenges: 1 },
    tournaments: [
      {
        name: 'Friday Night Showdown',
        subtitle: 'Rocket League',
        registrants: [
          { displayName: 'Ava Stone', handle: 'avastone', registeredAt: 'Mon Jun 15, 2:14 PM PT' },
          { displayName: 'Marcus Lee', handle: 'mlee', registeredAt: 'Tue Jun 16, 9:02 AM PT' },
        ],
      },
    ],
    quests: [
      {
        name: 'First Steps',
        registrants: [{ displayName: 'Jordan Park', handle: 'jpark', registeredAt: 'Wed Jun 17, 6:40 PM PT' }],
      },
    ],
    challenges: [
      {
        name: 'CDL Pre-Trip Inspection',
        registrants: [{ displayName: 'Sam Diaz', handle: 'sdiaz', registeredAt: 'Thu Jun 18, 11:20 AM PT' }],
      },
    ],
  },
  to: 'darcy@fgn.gg',
} satisfies TemplateEntry

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  margin: 0,
  padding: 0,
}
const container: React.CSSProperties = { maxWidth: '600px', margin: '0 auto', padding: '32px 28px' }
const h1: React.CSSProperties = { color: '#0a0a14', fontSize: '24px', fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.01em' }
const meta: React.CSSProperties = { color: '#8a8d99', fontSize: '13px', margin: '0 0 16px' }
const lead: React.CSSProperties = { color: '#2c2f3a', fontSize: '15px', lineHeight: '24px', margin: '0 0 24px' }
const sectionWrap: React.CSSProperties = { margin: '0 0 24px' }
const sectionHeading: React.CSSProperties = {
  color: '#0a0a14',
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  margin: '0 0 8px',
  paddingBottom: '6px',
  borderBottom: '1px solid #e6e9ef',
}
const emptyText: React.CSSProperties = { color: '#8a8d99', fontSize: '14px', fontStyle: 'italic', margin: '8px 0' }
const groupWrap: React.CSSProperties = { margin: '12px 0 16px' }
const groupName: React.CSSProperties = { color: '#0a0a14', fontSize: '15px', fontWeight: 600, margin: '0 0 4px' }
const groupSubtitle: React.CSSProperties = { color: '#6a6d78', fontWeight: 400 }
const registrant: React.CSSProperties = { color: '#1c1f2a', fontSize: '14px', lineHeight: '22px', margin: '2px 0 2px 8px' }
const dot: React.CSSProperties = { color: '#00e0ff', marginRight: '6px' }
const handle: React.CSSProperties = { color: '#6a6d78' }
const timestamp: React.CSSProperties = { color: '#8a8d99' }
const footerText: React.CSSProperties = { color: '#2c2f3a', fontSize: '14px', margin: '0 0 8px' }
const footerSmall: React.CSSProperties = { color: '#8a8d99', fontSize: '12px', margin: '12px 0 0' }
const link: React.CSSProperties = { color: '#7a5cff', textDecoration: 'underline' }
