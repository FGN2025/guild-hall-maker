/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Item { kind?: string; id?: string; title?: string; link?: string }
interface Props {
  tenantName?: string
  agentSource?: string
  items?: Item[]
  link?: string
}

const Email = ({ tenantName = 'your tenant', agentSource = 'agent', items = [], link }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{items.length} new draft{items.length === 1 ? '' : 's'} from {agentSource}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={meta}>{tenantName} · Draft digest</Text>
        <Heading style={h1}>{items.length} new draft{items.length === 1 ? '' : 's'} ready for review</Heading>
        <Text style={lead}>Proposed by <strong>{agentSource}</strong>. Review and approve when ready.</Text>
        <Section style={listWrap}>
          {items.map((it, i) => (
            <Text key={i} style={listItem}>
              <span style={badge}>{i + 1}</span>
              {it.link ? <Link href={it.link} style={link1}>{it.title || it.kind || 'Draft'}</Link> : (it.title || it.kind || 'Draft')}
              {it.kind ? <span style={kind}> · {it.kind}</span> : null}
            </Text>
          ))}
        </Section>
        {link ? (
          <Text style={ctaWrap}><Link href={link} style={cta}>Open agent drafts →</Link></Text>
        ) : null}
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => {
    const n = Array.isArray(data?.items) ? data.items.length : 0
    const t = (data?.tenantName as string) || 'FGN'
    return `[${t}] ${n} new agent draft${n === 1 ? '' : 's'} to review`
  },
  displayName: 'Marketing Agent Draft Digest',
  previewData: {
    tenantName: 'Acme Broadband',
    agentSource: 'claude-mcp',
    items: [
      { kind: 'scheduled_post', title: 'Facebook post — Friday launch', link: 'https://play.fgn.gg/tenant/marketing?tab=agent' },
      { kind: 'campaign', title: 'August summer promo', link: 'https://play.fgn.gg/tenant/marketing?tab=agent' },
    ],
    link: 'https://play.fgn.gg/tenant/marketing?tab=agent',
  },
} satisfies TemplateEntry

const main: React.CSSProperties = { backgroundColor: '#ffffff', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Arial, sans-serif', margin: 0, padding: 0 }
const container: React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '32px 28px' }
const meta: React.CSSProperties = { color: '#8a8d99', fontSize: '12px', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 8px' }
const h1: React.CSSProperties = { color: '#0a0a14', fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }
const lead: React.CSSProperties = { color: '#2c2f3a', fontSize: '14px', lineHeight: '22px', margin: '0 0 16px' }
const listWrap: React.CSSProperties = { backgroundColor: '#f6f8fb', border: '1px solid #e6e9ef', borderRadius: '10px', padding: '8px 16px', margin: '0 0 20px' }
const listItem: React.CSSProperties = { color: '#1c1f2a', fontSize: '14px', lineHeight: '22px', margin: '10px 0' }
const badge: React.CSSProperties = { display: 'inline-block', minWidth: '20px', textAlign: 'center', backgroundColor: '#00e0ff', color: '#0a0a14', borderRadius: '999px', fontWeight: 700, fontSize: '12px', padding: '2px 6px', marginRight: '8px' }
const kind: React.CSSProperties = { color: '#8a8d99', fontSize: '12px' }
const link1: React.CSSProperties = { color: '#7a5cff', textDecoration: 'underline' }
const ctaWrap: React.CSSProperties = { margin: '8px 0' }
const cta: React.CSSProperties = { color: '#7a5cff', textDecoration: 'underline', fontWeight: 600 }
