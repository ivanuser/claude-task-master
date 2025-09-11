# Task Master Notification System Setup

The Task Master notification system now supports **email notifications**, **push notifications**, and **team invitations**. Here's how to set it up and test it.

## 🚀 Features Implemented

### ✅ Email Notifications
- Task assignment notifications
- Team invitation emails
- System notifications
- Daily digest emails
- Unsubscribe functionality

### ✅ Push Notifications
- Browser push notifications
- Service worker implementation
- VAPID key support
- Subscription management

### ✅ Team Invitations
- Email-based team invitations
- Invitation acceptance/decline
- New user signup flow
- Existing user notifications

### ✅ Notification Settings UI
- Channel preferences (email, push, in-app)
- Notification type controls
- Quiet hours configuration
- Test notification buttons
- Team invitation interface

## 📧 Email Setup

### 1. Environment Variables
Add these to your `.env` file:

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM="Task Master <noreply@taskmaster.dev>"

# App URL
NEXTAUTH_URL=http://localhost:3001
```

### 2. Gmail Setup (Example)
1. Enable 2-factor authentication on your Gmail account
2. Generate an app password: https://support.google.com/accounts/answer/185833
3. Use the app password as `SMTP_PASSWORD`

### 3. Test Email Notifications
1. Go to `/notifications` → Settings tab
2. Enable "Email Notifications"
3. Click "Test" button next to email notifications
4. Check your email inbox

## 📱 Push Notifications Setup

### 1. Generate VAPID Keys
```bash
npx web-push generate-vapid-keys
```

### 2. Environment Variables
Add to your `.env`:

```bash
# VAPID Keys for Push Notifications
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key
```

### 3. Test Push Notifications
1. Go to `/notifications` → Settings tab
2. Enable "Push Notifications" (browser will ask for permission)
3. Click "Test" button next to push notifications
4. You should receive a browser notification

## 👥 Team Invitations

### 1. Setup
No additional setup required if email is configured.

### 2. Send Invitations
1. Go to `/notifications` → Settings tab
2. Scroll to "Invite Team Members" section
3. Enter email address and select team
4. Add optional personal message
5. Click "Send Invitation"

### 3. Accept Invitations
- **Existing users**: Will receive in-app notification + email
- **New users**: Will receive email with signup link

## 🔧 Background Jobs

### 1. Notification Queue Processing
The system queues notifications for delivery. To process the queue:

#### Manual Processing (for testing)
```bash
curl -X POST http://localhost:3001/api/notifications/process-queue
```

#### Production Setup
Set up a cron job to run every minute:
```bash
# Add to crontab
* * * * * curl -X POST https://yourdomain.com/api/notifications/process-queue
```

Or use a service like Vercel Cron, GitHub Actions, or similar.

## 🧪 Testing the Full Flow

### 1. Test Email Notifications
```bash
# Send test email
curl -X POST http://localhost:3001/api/notifications/test-email \
  -H "Cookie: your-session-cookie"
```

### 2. Test Push Notifications
```bash
# Send test push
curl -X POST http://localhost:3001/api/notifications/test-push \
  -H "Cookie: your-session-cookie"
```

### 3. Test Team Invitations
```bash
# Send invitation
curl -X POST http://localhost:3001/api/invitations \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "email": "test@example.com",
    "teamId": "your-team-id",
    "message": "Join our awesome team!"
  }'
```

## 📊 Notification Analytics

View notification statistics at `/notifications` → Notifications tab.

## 🛠 Troubleshooting

### Email Not Sending
1. Check SMTP credentials in `.env`
2. Verify SMTP server settings
3. Check email logs in database (`EmailLog` table)
4. Test SMTP connection manually

### Push Notifications Not Working
1. Ensure VAPID keys are configured
2. Check browser permissions
3. Verify service worker registration
4. Check browser console for errors

### Invitations Not Working
1. Ensure email system is working
2. Check database for user records
3. Verify team permissions

## 🔍 Debugging

### Check Email Logs
```sql
SELECT * FROM EmailLog ORDER BY createdAt DESC LIMIT 10;
```

### Check Notification Queue
```sql
SELECT * FROM NotificationQueue WHERE status = 'PENDING';
```

### Check Push Subscriptions
```sql
SELECT * FROM WebPushSubscription WHERE isActive = true;
```

## 🚨 Production Considerations

1. **Rate Limiting**: Consider adding rate limiting to notification endpoints
2. **Email Reputation**: Use a dedicated email service like SendGrid or Amazon SES
3. **Push Reliability**: Monitor push notification delivery rates
4. **Background Jobs**: Use a proper job queue system like Bull or Agenda
5. **Error Handling**: Implement retry logic and dead letter queues
6. **Monitoring**: Set up alerts for failed notifications

## 📝 Next Steps

The notification system is now fully functional! You can:

1. **Customize Email Templates**: Edit templates in `src/lib/email/templates/`
2. **Add More Notification Types**: Extend the `NotificationType` enum
3. **Integration**: Connect to external services (Slack, Discord, etc.)
4. **Analytics**: Add more detailed notification analytics
5. **Mobile App**: Extend push notifications to mobile apps

## 🎉 Success!

Your notification system is now ready to keep users engaged and informed! 

**Test it out**: Go to `/notifications` → Settings tab and try sending yourself test notifications.