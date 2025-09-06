import React from 'react';
import { Button, Link, Text } from '@react-email/components';
import { BaseEmailTemplate } from './base-template';

interface TaskAssignedEmailProps {
  userName: string;
  taskTitle: string;
  taskDescription: string;
  projectName: string;
  dueDate?: string;
  priority?: string;
  assignedBy?: string;
  taskUrl: string;
  unsubscribeToken: string;
}

export function TaskAssignedEmail({
  userName,
  taskTitle,
  taskDescription,
  projectName,
  dueDate,
  priority,
  assignedBy,
  taskUrl,
  unsubscribeToken,
}: TaskAssignedEmailProps) {
  return (
    <BaseEmailTemplate
      preview={`You've been assigned to: ${taskTitle}`}
      heading="New Task Assignment"
      userName={userName}
      unsubscribeToken={unsubscribeToken}
    >
      <Text style={paragraph}>
        You've been assigned to a new task{assignedBy ? ` by ${assignedBy}` : ''}.
      </Text>

      <div style={taskCard}>
        <Text style={taskTitleStyle}>{taskTitle}</Text>
        <Text style={taskDescriptionStyle}>{taskDescription}</Text>
        
        <div style={taskMeta}>
          <Text style={metaItem}>
            <strong>Project:</strong> {projectName}
          </Text>
          {dueDate && (
            <Text style={metaItem}>
              <strong>Due Date:</strong> {dueDate}
            </Text>
          )}
          {priority && (
            <Text style={metaItem}>
              <strong>Priority:</strong> <span style={getPriorityStyle(priority)}>{priority}</span>
            </Text>
          )}
        </div>
      </div>

      <Button
        href={taskUrl}
        style={button}
      >
        View Task Details
      </Button>

      <Text style={helpText}>
        Need help? Reply to this email or visit our{' '}
        <Link href="https://taskmanagerai.honercloud.com/help" style={link}>
          help center
        </Link>
        .
      </Text>
    </BaseEmailTemplate>
  );
}

// Styles
const paragraph = {
  color: '#525252',
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '16px',
};

const taskCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '24px',
  border: '1px solid #e5e7eb',
};

const taskTitleStyle = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#1a1a1a',
  marginBottom: '8px',
};

const taskDescriptionStyle = {
  fontSize: '14px',
  color: '#525252',
  lineHeight: '20px',
  marginBottom: '16px',
};

const taskMeta = {
  borderTop: '1px solid #e5e7eb',
  paddingTop: '12px',
};

const metaItem = {
  fontSize: '14px',
  color: '#6b7280',
  marginBottom: '4px',
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '500',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
  marginBottom: '16px',
};

const helpText = {
  fontSize: '14px',
  color: '#6b7280',
  marginTop: '24px',
};

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
};

function getPriorityStyle(priority: string) {
  const colors: Record<string, any> = {
    high: { color: '#dc2626', fontWeight: '600' },
    medium: { color: '#f59e0b', fontWeight: '500' },
    low: { color: '#10b981', fontWeight: '500' },
    critical: { color: '#991b1b', fontWeight: '700' },
  };
  return colors[priority.toLowerCase()] || { color: '#6b7280' };
}