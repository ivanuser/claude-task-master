'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { pushManager } from '@/lib/notifications/push-manager';
import { 
  Bell, 
  Mail, 
  Smartphone, 
  MessageSquare, 
  Clock,
  Volume2,
  Vibrate,
  TestTube,
  Send,
  Users
} from 'lucide-react';

interface NotificationPreferences {
  enabled: boolean;
  inApp: boolean;
  email: boolean;
  push: boolean;
  sms: boolean;
  slack: boolean;
  discord: boolean;
  mobileApp: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  notificationTypes: {
    TASK_ASSIGNED: boolean;
    TASK_UPDATED: boolean;
    TASK_COMPLETED: boolean;
    TEAM_INVITATION: boolean;
    SYNC_COMPLETED: boolean;
    SYNC_FAILED: boolean;
    SYSTEM_NOTIFICATION: boolean;
  };
}

export function NotificationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    inApp: true,
    email: false,
    push: false,
    sms: false,
    slack: false,
    discord: false,
    mobileApp: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    soundEnabled: true,
    vibrationEnabled: true,
    notificationTypes: {
      TASK_ASSIGNED: true,
      TASK_UPDATED: true,
      TASK_COMPLETED: false,
      TEAM_INVITATION: true,
      SYNC_COMPLETED: false,
      SYNC_FAILED: true,
      SYSTEM_NOTIFICATION: true,
    }
  });

  const [inviteForm, setInviteForm] = useState({
    email: '',
    teamId: '',
    message: ''
  });

  const [teams, setTeams] = useState([]);

  useEffect(() => {
    loadPreferences();
    checkPushSupport();
    loadTeams();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences');
      if (response.ok) {
        const data = await response.json();
        if (data.preferences) {
          setPreferences(prev => ({ ...prev, ...data.preferences }));
        }
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPushSupport = async () => {
    const supported = pushManager.isSupported();
    setPushSupported(supported);
    
    if (supported) {
      const subscribed = await pushManager.isSubscribed();
      setPushSubscribed(subscribed);
    }
  };

  const loadTeams = async () => {
    try {
      const response = await fetch('/api/projects?limit=50');
      if (response.ok) {
        const data = await response.json();
        setTeams(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });

      if (response.ok) {
        toast({
          title: 'Settings saved',
          description: 'Your notification preferences have been updated.',
        });
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save notification preferences.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      const result = await pushManager.subscribe();
      if (result.success) {
        setPushSubscribed(true);
        setPreferences(prev => ({ ...prev, push: true }));
        toast({
          title: 'Push notifications enabled',
          description: 'You will now receive push notifications.',
        });
      } else {
        toast({
          title: 'Failed to enable push notifications',
          description: result.error || 'Please check your browser settings.',
          variant: 'destructive',
        });
      }
    } else {
      const result = await pushManager.unsubscribe();
      if (result.success) {
        setPushSubscribed(false);
        setPreferences(prev => ({ ...prev, push: false }));
        toast({
          title: 'Push notifications disabled',
          description: 'You will no longer receive push notifications.',
        });
      } else {
        toast({
          title: 'Failed to disable push notifications',
          description: result.error || 'Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  const testEmailNotification = async () => {
    setTestingEmail(true);
    try {
      const response = await fetch('/api/notifications/test-email', {
        method: 'POST'
      });

      if (response.ok) {
        toast({
          title: 'Test email sent',
          description: 'Check your email inbox for the test notification.',
        });
      } else {
        throw new Error('Failed to send test email');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send test email notification.',
        variant: 'destructive',
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const testPushNotification = async () => {
    setTestingPush(true);
    try {
      const result = await pushManager.sendTestNotification();
      
      if (result.success) {
        toast({
          title: 'Test push notification sent',
          description: 'You should receive a push notification shortly.',
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send test push notification.',
        variant: 'destructive',
      });
    } finally {
      setTestingPush(false);
    }
  };

  const sendInvitation = async () => {
    if (!inviteForm.email || !inviteForm.teamId) {
      toast({
        title: 'Error',
        description: 'Please fill in email and select a team.',
        variant: 'destructive',
      });
      return;
    }

    setSendingInvite(true);
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm)
      });

      if (response.ok) {
        toast({
          title: 'Invitation sent',
          description: `Team invitation has been sent to ${inviteForm.email}.`,
        });
        setInviteForm({ email: '', teamId: '', message: '' });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send invitation');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSendingInvite(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-muted-foreground">Loading notification settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                In-App Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Show notifications within the application
              </p>
            </div>
            <Switch
              checked={preferences.inApp}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, inApp: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <div className="flex items-center gap-2">
              {preferences.email && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={testEmailNotification}
                  disabled={testingEmail}
                >
                  <TestTube className="w-4 h-4 mr-1" />
                  {testingEmail ? 'Testing...' : 'Test'}
                </Button>
              )}
              <Switch
                checked={preferences.email}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, email: checked }))
                }
              />
            </div>
          </div>

          {pushSupported && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Push Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications from your browser
                </p>
              </div>
              <div className="flex items-center gap-2">
                {pushSubscribed && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={testPushNotification}
                    disabled={testingPush}
                  >
                    <TestTube className="w-4 h-4 mr-1" />
                    {testingPush ? 'Testing...' : 'Test'}
                  </Button>
                )}
                <Switch
                  checked={pushSubscribed}
                  onCheckedChange={handlePushToggle}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Choose which types of notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(preferences.notificationTypes).map(([type, enabled]) => (
            <div key={type} className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>{type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</Label>
                <p className="text-sm text-muted-foreground">
                  {getNotificationTypeDescription(type)}
                </p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({
                    ...prev,
                    notificationTypes: {
                      ...prev.notificationTypes,
                      [type]: checked
                    }
                  }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Team Invitation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Invite Team Members
          </CardTitle>
          <CardDescription>
            Send email invitations to join your teams
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-team">Team</Label>
              <Select 
                value={inviteForm.teamId}
                onValueChange={(value) => setInviteForm(prev => ({ ...prev, teamId: value }))}
              >
                <SelectTrigger id="invite-team">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team: any) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-message">Personal Message (Optional)</Label>
            <Textarea
              id="invite-message"
              placeholder="Add a personal message to your invitation..."
              value={inviteForm.message}
              onChange={(e) => setInviteForm(prev => ({ ...prev, message: e.target.value }))}
              rows={3}
            />
          </div>
          <Button onClick={sendInvitation} disabled={sendingInvite}>
            <Send className="w-4 h-4 mr-2" />
            {sendingInvite ? 'Sending...' : 'Send Invitation'}
          </Button>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Set times when you don't want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Quiet Hours</Label>
            <Switch
              checked={preferences.quietHoursEnabled}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, quietHoursEnabled: checked }))
              }
            />
          </div>
          {preferences.quietHoursEnabled && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quiet-start">Start Time</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={preferences.quietHoursStart}
                  onChange={(e) => 
                    setPreferences(prev => ({ ...prev, quietHoursStart: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiet-end">End Time</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={preferences.quietHoursEnd}
                  onChange={(e) => 
                    setPreferences(prev => ({ ...prev, quietHoursEnd: e.target.value }))
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Settings */}
      <div className="flex justify-end">
        <Button onClick={savePreferences} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}

function getNotificationTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    TASK_ASSIGNED: 'When you are assigned a new task',
    TASK_UPDATED: 'When a task you are involved in is updated',
    TASK_COMPLETED: 'When a task you created or assigned is completed',
    TEAM_INVITATION: 'When someone invites you to join a team',
    SYNC_COMPLETED: 'When project synchronization completes successfully',
    SYNC_FAILED: 'When project synchronization fails',
    SYSTEM_NOTIFICATION: 'Important system updates and announcements'
  };
  
  return descriptions[type] || 'System notification';
}