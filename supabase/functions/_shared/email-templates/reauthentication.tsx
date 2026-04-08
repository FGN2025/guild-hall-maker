/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your FGN verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img src="https://yrhwzmkenjgiujhofucx.supabase.co/storage/v1/object/public/email-assets/fgn-logo.png" alt="FGN" width="120" height="auto" style={logo} />
        </Section>
        <Heading style={h1}>Verification code</Heading>
        <Text style={text}>Use this code to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code expires shortly. If you didn't request it, ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Rajdhani', 'Segoe UI', Arial, sans-serif" }
const container = { padding: '0', maxWidth: '600px', margin: '0 auto' }
const header = { backgroundColor: '#0a0d14', padding: '24px 25px 16px', textAlign: 'center' as const }
const logo = { margin: '0 auto' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  fontFamily: "'Orbitron', 'Rajdhani', Arial, sans-serif",
  color: '#0a0d14',
  margin: '24px 25px 16px',
}
const text = {
  fontSize: '15px',
  color: '#444',
  lineHeight: '1.6',
  margin: '0 25px 20px',
}
const codeStyle = {
  fontFamily: "'Orbitron', Courier, monospace",
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#00b8b8',
  letterSpacing: '4px',
  margin: '0 25px 28px',
  textAlign: 'center' as const,
}
const footer = { fontSize: '12px', color: '#999', margin: '0 25px 24px' }
