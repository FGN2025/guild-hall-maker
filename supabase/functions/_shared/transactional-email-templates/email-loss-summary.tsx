/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Group {
  label: string
  count: number
  detail?: string
}

interface Props {
  total?: number
  rangeLabel?: string
  byTemplate?: Group[]
  byCategory?: Group[]
  lapsedPosts?: number
  note?: string
}

const Email = ({
  total = 0,
  rangeLabel = '',
  byTemplate = [],
  byCategory = [],
  lapsedPosts = 0,
  note = '',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{total} marketing emails were never delivered — one-time summary</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={meta}>FGN · Email pipeline incident</Text>
        <Heading style={h1}>{total} marketing emails never reached you</Heading>
        <Text style={body}>
          Between {rangeLabel}, every marketing notification email was queued in a payload
          shape the sender could not read, so each one failed silently and was discarded.
          The send path has been repaired and this message is proof it now works. The lost
          messages are summarised below and are not being replayed.
        </Text>

        <Section style={box}>
          <Text style={h2}>By template</Text>
          {byTemplate.map((g) => (
            <Text key={g.label} style={row}>
              {g.label} — <strong>{g.count}</strong>{g.detail ? ` · ${g.detail}` : ''}
            </Text>
          ))}
        </Section>

        <Section style={box}>
          <Text style={h2}>By category</Text>
          {byCategory.map((g) => (
            <Text key={g.label} style={row}>
              {g.label} — <strong>{g.count}</strong>{g.detail ? ` · ${g.detail}` : ''}
            </Text>
          ))}
        </Section>

        <Text style={body}>
          <strong>{lapsedPosts}</strong> of these concerned scheduled posts whose publish
          window has since passed. Those posts are still awaiting review and have not been
          published.
        </Text>
        {note ? <Text style={footerSmall}>{note}</Text> : null}
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `[FGN] ${data?.total ?? 0} marketing emails were lost — one-time summary`,
  displayName: 'Email Loss Summary (one-time)',
  previewData: {
    total: 65,
    rangeLabel: '24 July and 22 August 2026',
    byTemplate: [{ label: 'marketing-alert', count: 46 }],
    byCategory: [{ label: 'overdue', count: 27 }],
    lapsedPosts: 14,
  },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Arial, sans-serif', margin: 0, padding: 0 }
const container: React.CSSProperties = { maxWidth: '600px', margin: '0 auto', padding: '32px 28px' }
const meta: React.CSSProperties = { color: '#8a8d99', fontSize: '12px', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 8px' }
const h1: React.CSSProperties = { color: '#0a0a14', fontSize: '22px', fontWeight: 700, margin: '0 0 16px' }
const h2: React.CSSProperties = { color: '#0a0a14', fontSize: '14px', fontWeight: 700, margin: '0 0 10px' }
const box: React.CSSProperties = { backgroundColor: '#f6f8fb', border: '1px solid #e6e9ef', borderRadius: '10px', padding: '16px 18px', margin: '0 0 18px' }
const body: React.CSSProperties = { color: '#1c1f2a', fontSize: '14px', lineHeight: '22px', margin: '0 0 16px' }
const row: React.CSSProperties = { color: '#1c1f2a', fontSize: '13px', lineHeight: '20px', margin: '0 0 4px' }
const footerSmall: React.CSSProperties = { color: '#8a8d99', fontSize: '12px', margin: '16px 0 0' }
