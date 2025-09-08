'use client'

import React, { useState } from 'react'
import { 
  User, 
  Bell, 
  Palette, 
  Key, 
  Shield, 
  Download, 
  Plug,
  Settings as SettingsIcon,
  ChevronRight
} from 'lucide-react'

// Import settings sections
import { UserProfileSection } from '@/components/settings/UserProfileSection'
import { AccountSection } from '@/components/settings/AccountSection'
import { NotificationPreferencesSection } from '@/components/settings/NotificationPreferencesSection'
import { ThemeSectionNew } from '@/components/settings/theme-section-new'
import { APIKeySection } from '@/components/settings/APIKeySection'
import { IntegrationsSection } from '@/components/settings/IntegrationsSection'
import { SecuritySection } from '@/components/settings/SecuritySection'
import { DataSection } from '@/components/settings/DataSection'
import BackButton from '@/components/ui/BackButton'

type SettingsSection = 
  | 'profile'
  | 'account'
  | 'notifications'
  | 'theme'
  | 'api-keys'
  | 'integrations'
  | 'security'
  | 'data'

interface SettingsSectionConfig {
  id: SettingsSection
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const settingsSections: SettingsSectionConfig[] = [
  {
    id: 'profile',
    title: 'Profile',
    description: 'Manage your profile information and avatar',
    icon: User,
  },
  {
    id: 'account',
    title: 'Account',
    description: 'Password, email, and account deletion',
    icon: SettingsIcon,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Configure notification preferences',
    icon: Bell,
  },
  {
    id: 'theme',
    title: 'Appearance',
    description: 'Customize theme and display preferences',
    icon: Palette,
  },
  {
    id: 'api-keys',
    title: 'API Keys',
    description: 'Manage personal access tokens',
    icon: Key,
  },
  {
    id: 'integrations',
    title: 'Integrations',
    description: 'Connect third-party services',
    icon: Plug,
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Two-factor auth and session management',
    icon: Shield,
  },
  {
    id: 'data',
    title: 'Data Management',
    description: 'Export and import your data',
    icon: Download,
  },
]

function renderSettingsSection(section: SettingsSection) {
  switch (section) {
    case 'profile':
      return <UserProfileSection />
    case 'account':
      return <AccountSection />
    case 'notifications':
      return <NotificationPreferencesSection />
    case 'theme':
      return <ThemeSectionNew />
    case 'api-keys':
      return <APIKeySection />
    case 'integrations':
      return <IntegrationsSection />
    case 'security':
      return <SecuritySection />
    case 'data':
      return <DataSection />
    default:
      return <UserProfileSection />
  }
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <BackButton href="/dashboard" label="Back to Dashboard" className="mr-4" />
              <SettingsIcon className="w-8 h-8 text-foreground mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Settings</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="text-sm font-medium text-foreground uppercase tracking-wide">
                  Settings
                </h2>
              </div>
              <div className="divide-y divide-border">
                {settingsSections.map((section) => {
                  const IconComponent = section.icon
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full p-4 text-left hover:bg-accent transition-colors flex items-center justify-between group ${
                        activeSection === section.id
                          ? 'bg-primary/10 border-r-2 border-r-primary'
                          : ''
                      }`}
                    >
                      <div className="flex items-center min-w-0 flex-1">
                        <IconComponent
                          className={`w-5 h-5 mr-3 flex-shrink-0 ${
                            activeSection === section.id
                              ? 'text-primary'
                              : 'text-muted-foreground group-hover:text-accent-foreground'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-medium truncate ${
                              activeSection === section.id
                                ? 'text-primary'
                                : 'text-foreground'
                            }`}
                          >
                            {section.title}
                          </p>
                          <p
                            className={`text-xs truncate ${
                              activeSection === section.id
                                ? 'text-primary/80'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {section.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 flex-shrink-0 ${
                          activeSection === section.id
                            ? 'text-primary'
                            : 'text-muted-foreground group-hover:text-accent-foreground'
                        }`}
                      />
                    </button>
                  )
                })}
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-card rounded-lg border border-border">
              {renderSettingsSection(activeSection)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}