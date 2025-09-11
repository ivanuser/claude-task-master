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

interface SystemNotificationEmailProps {
  userName?: string;
  notificationTitle?: string;
  notificationMessage?: string;
  actionUrl?: string;
  projectName?: string;
  tasksAdded?: number;
  tasksUpdated?: number;
  unsubscribeToken?: string;
}

const baseUrl = process.env.NEXTAUTH_URL || 'https://taskmanagerai.honercloud.com';

export const SystemNotificationEmail = ({
  userName = 'there',
  notificationTitle = 'System Notification',
  notificationMessage = 'You have a new system notification.',
  actionUrl = `${baseUrl}/dashboard`,
  projectName,
  tasksAdded,
  tasksUpdated,
  unsubscribeToken = '',
}: SystemNotificationEmailProps) => (
  <Html>
    <Head />
    <Preview>
      {notificationTitle}
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
          {notificationMessage}
        </Text>
        
        {projectName && (tasksAdded !== undefined || tasksUpdated !== undefined) && (
          <Section style={statsSection}>
            <Text style={statsTitle}>Sync Results for {projectName}</Text>
            {tasksAdded !== undefined && (
              <Text style={statsItem}>📝 {tasksAdded} tasks added</Text>
            )}
            {tasksUpdated !== undefined && (
              <Text style={statsItem}>✏️ {tasksUpdated} tasks updated</Text>
            )}
          </Section>
        )}

        <Section style={btnContainer}>
          <Button style={button} href={actionUrl}>
            View Dashboard
          </Button>
        </Section>
        
        <Text style={paragraph}>
          Best,
          <br />
          The Task Master Team
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          This is an automated system notification. If you don't want to receive these emails, you can{' '}
          <a href={`${baseUrl}/unsubscribe?token=${unsubscribeToken}`} style={link}>
            unsubscribe here
          </a>.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default SystemNotificationEmail;

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

const statsSection = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  border: '1px solid #e9ecef',
};

const statsTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#333',
  margin: '0 0 12px 0',
};

const statsItem = {
  fontSize: '14px',
  color: '#666',
  margin: '4px 0',
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