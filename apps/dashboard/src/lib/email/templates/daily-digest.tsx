import React from 'react';
import { Button, Link, Text } from '@react-email/components';
import { BaseEmailTemplate } from './base-template';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
}

interface DailyDigestEmailProps {
  userName: string;
  date: string;
  tasksDueToday: Task[];
  tasksOverdue: Task[];
  tasksCompleted: Task[];
  newAssignments: Task[];
  dashboardUrl: string;
  unsubscribeToken: string;
}

export function DailyDigestEmail({
  userName,
  date,
  tasksDueToday,
  tasksOverdue,
  tasksCompleted,
  newAssignments,
  dashboardUrl,
  unsubscribeToken,
}: DailyDigestEmailProps) {
  const totalTasks = tasksDueToday.length + tasksOverdue.length;
  
  return (
    <BaseEmailTemplate
      preview={`Daily Digest: ${totalTasks} tasks need your attention`}
      heading="Your Daily Task Digest"
      userName={userName}
      unsubscribeToken={unsubscribeToken}
    >
      <Text style={dateStyle}>{date}</Text>
      
      <Text style={paragraph}>
        Here's your daily overview of tasks and activities.
      </Text>

      {/* Summary Stats */}
      <div style={statsContainer}>
        <div style={statCard}>
          <Text style={statNumber}>{tasksOverdue.length}</Text>
          <Text style={statLabel}>Overdue</Text>
        </div>
        <div style={statCard}>
          <Text style={statNumber}>{tasksDueToday.length}</Text>
          <Text style={statLabel}>Due Today</Text>
        </div>
        <div style={statCard}>
          <Text style={statNumber}>{tasksCompleted.length}</Text>
          <Text style={statLabel}>Completed</Text>
        </div>
        <div style={statCard}>
          <Text style={statNumber}>{newAssignments.length}</Text>
          <Text style={statLabel}>New</Text>
        </div>
      </div>

      {/* Overdue Tasks */}
      {tasksOverdue.length > 0 && (
        <div style={section}>
          <Text style={sectionTitle}>⚠️ Overdue Tasks</Text>
          {tasksOverdue.map((task) => (
            <div key={task.id} style={taskItem}>
              <Text style={taskItemTitle}>{task.title}</Text>
              <Text style={overdueDate}>
                Due: {task.dueDate}
              </Text>
            </div>
          ))}
        </div>
      )}

      {/* Tasks Due Today */}
      {tasksDueToday.length > 0 && (
        <div style={section}>
          <Text style={sectionTitle}>📅 Due Today</Text>
          {tasksDueToday.map((task) => (
            <div key={task.id} style={taskItem}>
              <Text style={taskItemTitle}>{task.title}</Text>
              <Text style={taskPriority}>
                Priority: {task.priority}
              </Text>
            </div>
          ))}
        </div>
      )}

      {/* New Assignments */}
      {newAssignments.length > 0 && (
        <div style={section}>
          <Text style={sectionTitle}>✨ New Assignments</Text>
          {newAssignments.map((task) => (
            <div key={task.id} style={taskItem}>
              <Text style={taskItemTitle}>{task.title}</Text>
              {task.dueDate && (
                <Text style={taskDueDate}>
                  Due: {task.dueDate}
                </Text>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Completed Tasks */}
      {tasksCompleted.length > 0 && (
        <div style={section}>
          <Text style={sectionTitle}>✅ Completed Yesterday</Text>
          <Text style={completedSummary}>
            Great job! You completed {tasksCompleted.length} task{tasksCompleted.length !== 1 ? 's' : ''}.
          </Text>
        </div>
      )}

      <Button
        href={dashboardUrl}
        style={button}
      >
        View Full Dashboard
      </Button>

      <Text style={tipText}>
        <strong>Tip:</strong> You can adjust your email preferences in your{' '}
        <Link href={`${dashboardUrl}/settings`} style={link}>
          settings
        </Link>
        .
      </Text>
    </BaseEmailTemplate>
  );
}

// Styles
const dateStyle = {
  fontSize: '14px',
  color: '#6b7280',
  marginBottom: '16px',
};

const paragraph = {
  color: '#525252',
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '24px',
};

const statsContainer = {
  display: 'flex',
  gap: '12px',
  marginBottom: '32px',
  flexWrap: 'wrap' as const,
};

const statCard = {
  flex: '1',
  minWidth: '120px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center' as const,
  border: '1px solid #e5e7eb',
};

const statNumber = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#1a1a1a',
  marginBottom: '4px',
};

const statLabel = {
  fontSize: '12px',
  color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const section = {
  marginBottom: '32px',
};

const sectionTitle = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#1a1a1a',
  marginBottom: '12px',
  borderBottom: '2px solid #e5e7eb',
  paddingBottom: '8px',
};

const taskItem = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '12px',
  marginBottom: '8px',
};

const taskItemTitle = {
  fontSize: '15px',
  fontWeight: '500',
  color: '#1a1a1a',
  marginBottom: '4px',
};

const taskPriority = {
  fontSize: '13px',
  color: '#6b7280',
};

const taskDueDate = {
  fontSize: '13px',
  color: '#6b7280',
};

const overdueDate = {
  fontSize: '13px',
  color: '#dc2626',
  fontWeight: '500',
};

const completedSummary = {
  fontSize: '14px',
  color: '#10b981',
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
  marginTop: '32px',
  marginBottom: '16px',
};

const tipText = {
  fontSize: '14px',
  color: '#6b7280',
  marginTop: '24px',
  padding: '12px',
  backgroundColor: '#fef3c7',
  borderRadius: '6px',
  border: '1px solid #fcd34d',
};

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
};