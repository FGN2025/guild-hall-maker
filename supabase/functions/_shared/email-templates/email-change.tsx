/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your new email for FGN</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img src="https://yrhwzmkenjgiujhofucx.supabase.co/storage/v1/object/public/email-assets/fgn-logo.png" alt="FGN" width="120" height="auto" style={logo} />
        </Section>
        <Heading style={h1}>Confirm your new email</Heading>
        <Text style={text}>
          You requested to change your FGN email from{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link> to{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <Text style={text}>
          Hit the button below to lock it in:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirm Email Change
        </Button>
        <Text style={footer}>
          Didn't request this? Secure your account immediately.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
const link = { color: '#00b8b8', textDecoration: 'underline' }
const button = {
  backgroundColor: '#00e6e6',
  color: '#0a0d14',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  fontFamily: "'Orbitron', 'Rajdhani', Arial, sans-serif",
  borderRadius: '8px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'block' as const,
  textAlign: 'center' as const,
  margin: '8px 25px 28px',
}
const footer = { fontSize: '12px', color: '#999', margin: '0 25px 24px' }
