'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Save, RefreshCw, Shield, Bell, Database, Globe } from 'lucide-react';

export default function AdminSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    // General Settings
    siteName: 'Task Master AI',
    siteDescription: 'AI-powered task management platform',
    supportEmail: 'support@taskmaster.ai',
    
    // Security Settings
    sessionTimeout: '30',
    maxLoginAttempts: '5',
    passwordMinLength: '8',
    requireTwoFactor: false,
    
    // Notification Settings
    emailNotifications: true,
    systemAnnouncements: true,
    maintenanceMode: false,
    maintenanceMessage: '',
    
    // Database Settings
    backupFrequency: 'daily',
    retentionDays: '30',
    autoOptimize: true,
    
    // API Settings
    apiRateLimit: '1000',
    apiTimeout: '30',
    corsEnabled: true,
    allowedOrigins: 'https://taskmaster.ai'
  });

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: 'Settings saved',
        description: 'System settings have been updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    toast({
      title: 'Settings reset',
      description: 'All settings have been reset to defaults',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
          <p className="text-muted-foreground">
            Configure system-wide settings and preferences
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            General Settings
          </CardTitle>
          <CardDescription>
            Basic system configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name</Label>
              <Input
                id="siteName"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="siteDescription">Site Description</Label>
            <Textarea
              id="siteDescription"
              value={settings.siteDescription}
              onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Authentication and security configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
              <Input
                id="maxLoginAttempts"
                type="number"
                value={settings.maxLoginAttempts}
                onChange={(e) => setSettings({ ...settings, maxLoginAttempts: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passwordMinLength">Min Password Length</Label>
              <Input
                id="passwordMinLength"
                type="number"
                value={settings.passwordMinLength}
                onChange={(e) => setSettings({ ...settings, passwordMinLength: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Require 2FA for all admin accounts
              </p>
            </div>
            <Switch
              checked={settings.requireTwoFactor}
              onCheckedChange={(checked) => setSettings({ ...settings, requireTwoFactor: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            System notifications and announcements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send system emails to users
              </p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>System Announcements</Label>
              <p className="text-sm text-muted-foreground">
                Display system-wide announcements
              </p>
            </div>
            <Switch
              checked={settings.systemAnnouncements}
              onCheckedChange={(checked) => setSettings({ ...settings, systemAnnouncements: checked })}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">
                Enable maintenance mode for all users
              </p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
            />
          </div>
          {settings.maintenanceMode && (
            <div className="space-y-2">
              <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
              <Textarea
                id="maintenanceMessage"
                value={settings.maintenanceMessage}
                onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                placeholder="Enter message to display during maintenance"
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Database Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Settings
          </CardTitle>
          <CardDescription>
            Database backup and optimization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="backupFrequency">Backup Frequency</Label>
              <Select 
                value={settings.backupFrequency}
                onValueChange={(value) => setSettings({ ...settings, backupFrequency: value })}
              >
                <SelectTrigger id="backupFrequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="retentionDays">Retention Period (days)</Label>
              <Input
                id="retentionDays"
                type="number"
                value={settings.retentionDays}
                onChange={(e) => setSettings({ ...settings, retentionDays: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Auto-Optimize</Label>
              <p className="text-sm text-muted-foreground">
                Automatically optimize database performance
              </p>
            </div>
            <Switch
              checked={settings.autoOptimize}
              onCheckedChange={(checked) => setSettings({ ...settings, autoOptimize: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* API Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            API Settings
          </CardTitle>
          <CardDescription>
            API rate limiting and CORS configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="apiRateLimit">Rate Limit (requests/hour)</Label>
              <Input
                id="apiRateLimit"
                type="number"
                value={settings.apiRateLimit}
                onChange={(e) => setSettings({ ...settings, apiRateLimit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiTimeout">Timeout (seconds)</Label>
              <Input
                id="apiTimeout"
                type="number"
                value={settings.apiTimeout}
                onChange={(e) => setSettings({ ...settings, apiTimeout: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Enable CORS</Label>
              <p className="text-sm text-muted-foreground">
                Allow cross-origin requests to the API
              </p>
            </div>
            <Switch
              checked={settings.corsEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, corsEnabled: checked })}
            />
          </div>
          {settings.corsEnabled && (
            <div className="space-y-2">
              <Label htmlFor="allowedOrigins">Allowed Origins</Label>
              <Textarea
                id="allowedOrigins"
                value={settings.allowedOrigins}
                onChange={(e) => setSettings({ ...settings, allowedOrigins: e.target.value })}
                placeholder="Enter allowed origins (one per line)"
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}