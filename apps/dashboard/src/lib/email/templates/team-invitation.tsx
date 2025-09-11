import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface TeamInvitationEmailProps {
  userName?: string;
  teamName?: string;
  invitedBy?: string;
  invitationUrl?: string;
  message?: string;
  unsubscribeToken?: string;
}

const baseUrl = process.env.NEXTAUTH_URL || 'https://taskmanagerai.honercloud.com';

export const TeamInvitationEmail = ({
  userName = 'there',
  teamName = 'Your Team',
  invitedBy = 'A team member',
  invitationUrl = `${baseUrl}/dashboard`,
  message = '',
  unsubscribeToken = '',
}: TeamInvitationEmailProps) => (
  <Html>
    <Head />
    <Preview>
      You've been invited to join {teamName} on Task Master
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src={`${baseUrl}/logo.png`}
          width="170"
          height="50"
          alt="Task Master"
          style={logo}
        />
        <Text style={paragraph}>Hi {userName},</Text>
        <Text style={paragraph}>
          <strong>{invitedBy}</strong> has invited you to join <strong>{teamName}</strong> on Task Master.
        </Text>
        {message && (
          <Section style={messageSection}>
            <Text style={messageText}>"{message}"</Text>
          </Section>
        )}
        <Text style={paragraph}>
          Join your team to collaborate on tasks, track progress, and stay organized together.
        </Text>
        <Section style={btnContainer}>
          <Button style={button} href={invitationUrl}>
            Accept Invitation
          </Button>
        </Section>
        <Text style={paragraph}>
          Best,
          <br />
          The Task Master Team
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          This invitation was sent to you by {invitedBy}. If you don't want to receive these emails, you can{' '}
          <a href={`${baseUrl}/unsubscribe?token=${unsubscribeToken}`} style={link}>
            unsubscribe here
          </a>.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default TeamInvitationEmail;

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
};

const logo = {
  margin: '0 auto',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#333',
};

const btnContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#5d5dff',
  borderRadius: '3px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px',
  maxWidth: '240px',
  margin: '0 auto',
};

const messageSection = {
  backgroundColor: '#f8f9fa',
  borderLeft: '4px solid #5d5dff',
  padding: '16px',
  margin: '24px 0',
};

const messageText = {
  fontSize: '14px',
  fontStyle: 'italic',
  color: '#666',
  margin: '0',
};

const hr = {
  borderColor: '#cccccc',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
};

const link = {
  color: '#5d5dff',
  textDecoration: 'underline',
};