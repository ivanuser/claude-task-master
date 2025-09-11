#!/usr/bin/env node

/**
 * Test script for Task Master notification system
 * Tests email, push, and invitation endpoints
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

// Test colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`)
};

// Test configuration status
async function testConfigStatus() {
  log.header('Testing Configuration Status');
  
  try {
    const response = await fetch(`${API_BASE}/api/notifications/config`);
    const data = await response.json();
    
    if (response.ok) {
      log.success('Configuration endpoint accessible');
      
      // Check email config
      if (data.email?.configured) {
        log.success('Email configuration detected');
        log.info(`SMTP Host: ${data.email.host}`);
      } else {
        log.warn('Email not configured - please check SMTP settings in .env.local');
      }
      
      // Check push config
      if (data.push?.configured) {
        log.success('Push notification configuration detected');
        log.info('VAPID keys configured');
      } else {
        log.warn('Push notifications not configured - please check VAPID keys in .env.local');
      }
      
      return data;
    } else {
      log.error('Configuration check failed');
      return null;
    }
  } catch (error) {
    log.error(`Configuration test failed: ${error.message}`);
    return null;
  }
}

// Test email notification
async function testEmailNotification(sessionCookie) {
  log.header('Testing Email Notifications');
  
  if (!sessionCookie) {
    log.warn('No session cookie provided - skipping authenticated tests');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/notifications/test-email`, {
      method: 'POST',
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      log.success('Test email sent successfully');
      log.info(`Email ID: ${data.emailId}`);
      log.info('Check your inbox for the test email');
    } else {
      log.error(`Email test failed: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    log.error(`Email test failed: ${error.message}`);
  }
}

// Test push notification
async function testPushNotification(sessionCookie) {
  log.header('Testing Push Notifications');
  
  if (!sessionCookie) {
    log.warn('No session cookie provided - skipping authenticated tests');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/notifications/test-push`, {
      method: 'POST',
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      if (data.sent > 0) {
        log.success(`Test push notification sent to ${data.sent} device(s)`);
        log.info('Check your browser for the notification');
      } else {
        log.warn('No push subscriptions found - enable push notifications in browser first');
      }
    } else {
      log.error(`Push test failed: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    log.error(`Push test failed: ${error.message}`);
  }
}

// Test notification queue
async function testNotificationQueue() {
  log.header('Testing Notification Queue');
  
  try {
    const response = await fetch(`${API_BASE}/api/notifications/process-queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      log.success('Queue processing triggered');
      log.info(`Processed: ${data.processed || 0} notifications`);
      log.info(`Failed: ${data.failed || 0} notifications`);
      
      if (data.errors && data.errors.length > 0) {
        log.warn('Some notifications failed:');
        data.errors.forEach(err => log.error(`  - ${err}`));
      }
    } else {
      log.error(`Queue processing failed: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    log.error(`Queue test failed: ${error.message}`);
  }
}

// Test health check
async function testHealthCheck() {
  log.header('Testing API Health');
  
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    const data = await response.json();
    
    if (response.ok && data.status === 'ok') {
      log.success('API is healthy');
      log.info(`Uptime: ${data.uptime || 'Unknown'}`);
      log.info(`Environment: ${data.environment || 'Unknown'}`);
    } else {
      log.error('API health check failed');
    }
  } catch (error) {
    log.error(`Health check failed: ${error.message}`);
    log.warn('Is the server running? Check: npm run dev');
  }
}

// Main test runner
async function runTests() {
  console.log(colors.bright + '\n🔔 Task Master Notification System Test Suite\n' + colors.reset);
  
  // Get session cookie from command line args if provided
  const sessionCookie = process.argv[2];
  
  if (!sessionCookie) {
    log.warn('No session cookie provided. Usage: node test-notifications.js "your-session-cookie"');
    log.info('To get your session cookie:');
    log.info('1. Login to the dashboard');
    log.info('2. Open browser DevTools → Application → Cookies');
    log.info('3. Copy the value of "next-auth.session-token"');
    log.info('');
    log.info('Running basic tests only...');
  }
  
  // Run tests
  await testHealthCheck();
  
  const config = await testConfigStatus();
  
  if (sessionCookie) {
    if (config?.email?.configured) {
      await testEmailNotification(sessionCookie);
    }
    
    if (config?.push?.configured) {
      await testPushNotification(sessionCookie);
    }
  }
  
  await testNotificationQueue();
  
  // Summary
  log.header('Test Summary');
  
  if (!sessionCookie) {
    log.warn('Limited tests run - provide session cookie for full test suite');
  }
  
  if (!config?.email?.configured) {
    log.warn('Email not configured - update SMTP settings in .env.local');
  }
  
  if (!config?.push?.configured) {
    log.warn('Push not configured - add VAPID keys to .env.local');
  }
  
  if (config?.email?.configured && config?.push?.configured) {
    log.success('All notification channels configured!');
    log.info('Visit /notifications in the dashboard to manage settings');
  }
  
  console.log('');
}

// Run the tests
runTests().catch(console.error);