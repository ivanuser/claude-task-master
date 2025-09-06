import React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface BaseEmailTemplateProps {
  preview: string;
  heading: string;
  children: React.ReactNode;
  unsubscribeToken?: string;
  userName?: string;
}

export function BaseEmailTemplate({
  preview,
  heading,
  children,
  unsubscribeToken,
  userName = 'there',
}: BaseEmailTemplateProps) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://taskmanagerai.honercloud.com';
  
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Img
              src={`${baseUrl}/icon-192x192.png`}
              width="48"
              height="48"
              alt="Task Master"
              style={logo}
            />
            <Text style={logoText}>Task Master</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={h1}>{heading}</Heading>
            <Text style={greeting}>Hi {userName},</Text>
            {children}
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              Task Master - Your AI-Powered Task Management System
            </Text>
            {unsubscribeToken && (
              <Text style={footerLinks}>
                <Link
                  href={`${baseUrl}/unsubscribe?token=${unsubscribeToken}`}
                  style={footerLink}
                >
                  Unsubscribe
                </Link>
                {' • '}
                <Link
                  href={`${baseUrl}/settings`}
                  style={footerLink}
                >
                  Manage Preferences
                </Link>
              </Text>
            )}
            <Text style={copyright}>
              © {new Date().getFullYear()} Task Master. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '24px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #e6ebf1',
};

const logo = {
  margin: '0 auto',
  marginBottom: '12px',
};

const logoText = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#1a1a1a',
  margin: '0',
};

const content = {
  padding: '24px',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.25',
  marginBottom: '24px',
};

const greeting = {
  color: '#525252',
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '16px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  padding: '24px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '20px',
  marginBottom: '8px',
};

const footerLinks = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '20px',
  marginBottom: '8px',
};

const footerLink = {
  color: '#3b82f6',
  textDecoration: 'underline',
};

const copyright = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
};