import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import { prisma } from '@/lib/database';
import { EmailType, EmailStatus } from '@prisma/client';
import { TaskAssignedEmail } from './templates/task-assigned';
import { DailyDigestEmail } from './templates/daily-digest';
import { TeamInvitationEmail } from './templates/team-invitation';
import { SystemNotificationEmail } from './templates/system-notification';

// Create reusable transporter
const createTransporter = () => {
  // Use environment variables for email configuration
  const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  };

  return nodemailer.createTransporter(emailConfig);
};

interface SendEmailOptions {
  to: string;
  subject: string;
  template: EmailType;
  data: any;
  userId: string;
  unsubscribeToken?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = createTransporter();
  }

  // Verify SMTP connection
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('SMTP connection verified');
      return true;
    } catch (error) {
      console.error('SMTP connection failed:', error);
      return false;
    }
  }

  // Send email with template
  async sendEmail({
    to,
    subject,
    template,
    data,
    userId,
    unsubscribeToken,
  }: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Check if user has unsubscribed
      if (unsubscribeToken) {
        const preferences = await prisma.emailPreferences.findFirst({
          where: {
            userId,
            unsubscribedAt: { not: null },
          },
        });

        if (preferences) {
          console.log(`User ${userId} has unsubscribed from emails`);
          return { success: false, error: 'User has unsubscribed' };
        }
      }

      // Render email template
      const { html, text } = await this.renderTemplate(template, {
        ...data,
        unsubscribeToken,
      });

      // Create email log entry
      const emailLog = await prisma.emailLog.create({
        data: {
          userId,
          to,
          from: process.env.SMTP_FROM || 'noreply@taskmaster.dev',
          subject,
          template: template,
          type: template,
          status: EmailStatus.SENDING,
          htmlContent: html,
          textContent: text,
          attempts: 1,
          lastAttemptAt: new Date(),
        },
      });

      // Send email
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Task Master" <noreply@taskmaster.dev>',
        to,
        subject,
        text,
        html,
      });

      // Update email log with success
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: EmailStatus.SENT,
          messageId: info.messageId,
          sentAt: new Date(),
          provider: 'smtp',
        },
      });

      console.log(`Email sent successfully: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error('Failed to send email:', error);

      // Log failed attempt
      if (userId) {
        await prisma.emailLog.create({
          data: {
            userId,
            to,
            from: process.env.SMTP_FROM || 'noreply@taskmaster.dev',
            subject,
            template: template,
            type: template,
            status: EmailStatus.FAILED,
            errorMessage: error.message,
            attempts: 1,
            lastAttemptAt: new Date(),
          },
        });
      }

      return { success: false, error: error.message };
    }
  }

  // Render email template based on type
  private async renderTemplate(
    template: EmailType,
    data: any
  ): Promise<{ html: string; text: string }> {
    let emailComponent: React.ReactElement;

    switch (template) {
      case EmailType.TASK_ASSIGNED:
        emailComponent = TaskAssignedEmail(data);
        break;
      
      case EmailType.WEEKLY_REPORT:
      case EmailType.MONTHLY_DIGEST:
        emailComponent = DailyDigestEmail(data);
        break;

      case 'TEAM_INVITATION' as any:
        emailComponent = TeamInvitationEmail(data);
        break;

      case 'SYSTEM_NOTIFICATION' as any:
        emailComponent = SystemNotificationEmail(data);
        break;

      // Add more templates as needed
      default:
        throw new Error(`Unknown email template: ${template}`);
    }

    const html = render(emailComponent);
    const text = render(emailComponent, { plainText: true });

    return { html, text };
  }

  // Send task assignment notification
  async sendTaskAssignedEmail(
    userId: string,
    taskData: {
      taskTitle: string;
      taskDescription: string;
      projectName: string;
      dueDate?: string;
      priority?: string;
      assignedBy?: string;
      taskUrl: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user details and preferences
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          emailPreferences: true,
        },
      });

      if (!user || !user.email) {
        return { success: false, error: 'User not found or no email' };
      }

      // Check if user wants task assignment emails
      if (user.emailPreferences && !user.emailPreferences.taskAssigned) {
        return { success: false, error: 'User has disabled task assignment emails' };
      }

      return await this.sendEmail({
        to: user.email,
        subject: `New Task: ${taskData.taskTitle}`,
        template: EmailType.TASK_ASSIGNED,
        data: {
          userName: user.name || 'there',
          ...taskData,
        },
        userId,
        unsubscribeToken: user.emailPreferences?.unsubscribeToken,
      });
    } catch (error: any) {
      console.error('Failed to send task assigned email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send daily digest email
  async sendDailyDigest(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          emailPreferences: true,
        },
      });

      if (!user || !user.email) {
        return { success: false, error: 'User not found or no email' };
      }

      // Check email frequency preference
      if (
        user.emailPreferences &&
        user.emailPreferences.emailDigest !== 'DAILY'
      ) {
        return { success: false, error: 'User does not want daily digests' };
      }

      // TODO: Fetch actual task data from database
      const mockData = {
        userName: user.name || 'there',
        date: new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        tasksDueToday: [],
        tasksOverdue: [],
        tasksCompleted: [],
        newAssignments: [],
        dashboardUrl: process.env.NEXTAUTH_URL || 'https://taskmanagerai.honercloud.com',
      };

      return await this.sendEmail({
        to: user.email,
        subject: `Daily Task Digest - ${mockData.date}`,
        template: EmailType.WEEKLY_REPORT,
        data: mockData,
        userId,
        unsubscribeToken: user.emailPreferences?.unsubscribeToken,
      });
    } catch (error: any) {
      console.error('Failed to send daily digest:', error);
      return { success: false, error: error.message };
    }
  }

  // Process unsubscribe
  async unsubscribe(token: string): Promise<boolean> {
    try {
      const preferences = await prisma.emailPreferences.findUnique({
        where: { unsubscribeToken: token },
      });

      if (!preferences) {
        return false;
      }

      await prisma.emailPreferences.update({
        where: { id: preferences.id },
        data: {
          unsubscribedAt: new Date(),
          emailDigest: 'NEVER',
        },
      });

      return true;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();