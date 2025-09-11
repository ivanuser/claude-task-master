# Quick Email Setup Guide

## Gmail Setup (5 minutes)

### Step 1: Enable 2-Factor Authentication
1. Go to https://myaccount.google.com/security
2. Click on "2-Step Verification"
3. Follow the setup process

### Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" as the app
3. Select "Other" as device and name it "Task Master"
4. Copy the generated 16-character password

### Step 3: Update Your .env.local
```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your.email@gmail.com          # Your Gmail address
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx       # The 16-character app password
SMTP_FROM="Task Master" <your.email@gmail.com>
```

### Step 4: Restart the Server
```bash
# Kill current server (Ctrl+C)
# Start again
npm run dev
```

### Step 5: Test It!
1. Go to http://localhost:3001/notifications
2. Click on "Settings" tab
3. Enable "Email Notifications"
4. Click "Test" button next to email
5. Check your inbox!

## Alternative: Mailgun (Free Tier)

### Step 1: Sign Up
1. Go to https://signup.mailgun.com/new/signup
2. Create free account (no credit card required)
3. You get a sandbox domain immediately for testing

### Step 2: Get Credentials
1. Dashboard → Sending → Domain settings
2. Click on your sandbox domain
3. Go to "SMTP credentials" tab
4. Copy the credentials

### Step 3: Update Your .env.local
```bash
# Mailgun Configuration
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@sandbox123456.mailgun.org  # From Mailgun
SMTP_PASSWORD=your-mailgun-password              # From Mailgun
SMTP_FROM="Task Master" <postmaster@sandbox123456.mailgun.org>
```

### Step 4: Add Authorized Recipients (Sandbox Only)
Since you're using sandbox, you need to authorize email addresses:
1. Go to Mailgun Dashboard
2. Sending → Overview
3. Add your email to "Authorized Recipients"
4. Verify the email

## Production Recommendations

For production at taskmanagerai.honercloud.com:

### Best Option: SendGrid
- **Free tier**: 100 emails/day forever
- **Great deliverability**: Emails won't go to spam
- **Analytics**: Track opens, clicks, bounces
- **Easy setup**: Just an API key

### Setup for Production:
1. Sign up at https://sendgrid.com
2. Verify your domain (taskmanagerai.honercloud.com)
3. Create API key
4. Update production environment variables:

```bash
# SendGrid for Production
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxx  # Your SendGrid API key
SMTP_FROM="Task Master" <noreply@taskmanagerai.honercloud.com>
```

## Troubleshooting

### Gmail: "Less secure app" error
- You MUST use App Password, not your regular password
- Make sure 2FA is enabled

### Emails going to spam
- Use a service like SendGrid or Mailgun
- Verify your domain (SPF, DKIM records)
- Use a proper "from" address with your domain

### Connection timeout
- Check firewall isn't blocking port 587
- Try port 465 with SMTP_SECURE=true
- Some ISPs block SMTP, use a VPN

## Test Command

Once configured, test with:
```bash
node scripts/test-notifications.js
```

Or test the API directly:
```bash
curl -X GET http://localhost:3001/api/notifications/config | jq .
```

You should see:
```json
{
  "email": {
    "configured": true,
    "host": "smtp.gmail.com"
  }
}
```

## Success! 🎉

Once emails are working:
1. Team invitations will send
2. Daily digests can be scheduled
3. Task notifications will deliver
4. Users can manage preferences at /notifications

No email server needed - just use Gmail or any email service!