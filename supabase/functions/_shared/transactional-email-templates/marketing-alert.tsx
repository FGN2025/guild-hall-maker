/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  tenantName?: string
  category?: string
  title?: string
  message?: string
  link?: string
}

const LABELS: Record<string, string> = {
  dispatch_error: 'Dispatch error',
  undeliverable: 'Undeliverable post',
  overdue: 'Overdue approval',
  schedule_conflict: 'Schedule conflict',
  draft_new: 'New agent draft',
  draft_resubmitted: 'Draft revised',
}

const Email = ({
  tenantName = 'your tenant',
  category = 'dispatch_error',
  title = 'Marketing pipeline alert',
  message = '',
  link,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{LABELS[category] || 'Alert'} — {tenantName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={meta}>{tenantName} · {LABELS[category] || category}</Text>
        <Heading style={h1}>{title}</Heading>
        <Section style={box}>
          <Text style={body}>{message}</Text>
        </Section>
        {link ? (
          <Text style={ctaWrap}>
            <Link href={link} style={cta}>Open in FGN Play →</Link>
          </Text>
        ) : null}
        <Text style={footerSmall}>
          This alert was sent because you are an admin or manager for {tenantName}.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `[${(data?.tenantName as string) || 'FGN'}] ${(data?.title as string) || 'Marketing alert'}`,
  displayName: 'Marketing Pipeline Alert',
  previewData: {
    tenantName: 'Acme Broadband',
    category: 'dispatch_error',
    title: 'Scheduled post failed to publish',
    message: 'HTTP 400: No active social_connection for facebook.',
    link: 'https://play.fgn.gg/tenant/marketing?tab=scheduled',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Arial, sans-serif', margin: 0, padding: 0 }
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '32px 28px' }
const meta: React.CSSProperties = { color: '#8a8d99', fontSize: '12px', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 8px' }
const h1: React.CSSProperties = { color: '#0a0a14', fontSize: '22px', fontWeight: 700, margin: '0 0 16px' }
const box: React.CSSProperties = { backgroundColor: '#f6f8fb', border: '1px solid #e6e9ef', borderRadius: '10px', padding: '16px 18px', margin: '0 0 20px' }
const body: React.CSSProperties = { color: '#1c1f2a', fontSize: '14px', lineHeight: '22px', margin: 0 }
const ctaWrap: React.CSSProperties = { margin: '8px 0 24px' }
const cta: React.CSSProperties = { color: '#7a5cff', textDecoration: 'underline', fontWeight: 600 }
const footerSmall: React.CSSProperties = { color: '#8a8d99', fontSize: '12px', margin: '16px 0 0' }
