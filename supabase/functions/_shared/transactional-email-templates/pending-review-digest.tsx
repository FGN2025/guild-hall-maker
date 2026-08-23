/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Item {
  title: string
  platform?: string
  scheduledAt?: string
  window?: string
  state?: string
}

interface Props {
  tenantName?: string
  total?: number
  lapsed?: number
  dueSoon?: number
  items?: Item[]
  link?: string
  dateLabel?: string
}

const Email = ({
  tenantName = 'your tenant',
  total = 0,
  lapsed = 0,
  dueSoon = 0,
  items = [],
  link = 'https://play.fgn.gg/tenant/marketing?tab=agent',
  dateLabel = '',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{total} items awaiting review — {tenantName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={meta}>{tenantName} · Awaiting review{dateLabel ? ` · ${dateLabel}` : ''}</Text>
        <Heading style={h1}>{total} item{total === 1 ? '' : 's'} sitting in review</Heading>
        <Text style={body}>
          {lapsed} past their publish window, {dueSoon} due in the next 48 hours.
          Nothing publishes until a human approves it.
        </Text>
        <Section style={box}>
          {items.map((it, i) => (
            <Text key={i} style={row}>
              <strong>{it.title}</strong>
              {it.platform ? ` · ${it.platform}` : ''}
              {it.scheduledAt ? ` · ${it.scheduledAt}` : ''}
              {it.window ? ` — ${it.window}` : ''}
            </Text>
          ))}
        </Section>
        <Text style={ctaWrap}>
          <Link href={link} style={cta}>Open the review queue →</Link>
        </Text>
        <Text style={footerSmall}>
          Sent once a day while items are waiting. No email is sent on a day when the queue is empty.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `[${data?.tenantName || 'FGN'}] ${data?.total ?? 0} items awaiting review${(data?.lapsed ?? 0) > 0 ? ` · ${data.lapsed} past window` : ''}`,
  displayName: 'Pending Review Daily Digest',
  previewData: {
    tenantName: 'Acme Broadband',
    total: 17,
    lapsed: 13,
    dueSoon: 1,
    items: [{ title: 'Mario Kart Night', platform: 'facebook', scheduledAt: '2026-08-23 20:00Z', window: 'due in 4h' }],
  },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Arial, sans-serif', margin: 0, padding: 0 }
const container: React.CSSProperties = { maxWidth: '600px', margin: '0 auto', padding: '32px 28px' }
const meta: React.CSSProperties = { color: '#8a8d99', fontSize: '12px', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 8px' }
const h1: React.CSSProperties = { color: '#0a0a14', fontSize: '22px', fontWeight: 700, margin: '0 0 16px' }
const box: React.CSSProperties = { backgroundColor: '#f6f8fb', border: '1px solid #e6e9ef', borderRadius: '10px', padding: '16px 18px', margin: '0 0 18px' }
const body: React.CSSProperties = { color: '#1c1f2a', fontSize: '14px', lineHeight: '22px', margin: '0 0 16px' }
const row: React.CSSProperties = { color: '#1c1f2a', fontSize: '13px', lineHeight: '20px', margin: '0 0 6px' }
const ctaWrap: React.CSSProperties = { margin: '8px 0 24px' }
const cta: React.CSSProperties = { color: '#7a5cff', textDecoration: 'underline', fontWeight: 600 }
const footerSmall: React.CSSProperties = { color: '#8a8d99', fontSize: '12px', margin: '16px 0 0' }
