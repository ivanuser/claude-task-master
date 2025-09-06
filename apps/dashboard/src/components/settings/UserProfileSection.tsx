'use client'

import React, { useState, useRef, useEffect } from 'react'
import { User, Camera, Save, Upload, X } from 'lucide-react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'

interface UserProfile {
  id: string
  name: string
  email: string
  username?: string
  bio?: string
  location?: string
  timezone?: string
  avatar?: string
}

export function UserProfileSection() {
  const { data: session, update } = useSession()
  
  const [profile, setProfile] = useState<UserProfile>({
    id: session?.user?.id || '1',
    name: session?.user?.name || '',
    email: session?.user?.email || '',
    username: '',
    bio: '',
    location: '',
    timezone: 'America/Los_Angeles',
    avatar: session?.user?.image || undefined,
  })
  
  // Update profile when session changes
  useEffect(() => {
    if (session?.user) {
      setProfile(prev => ({
        ...prev,
        id: session.user.id || prev.id,
        name: session.user.name || prev.name,
        email: session.user.email || prev.email,
        avatar: session.user.image || prev.avatar,
      }))
    }
  }, [session])
  
  const [loading, setLoading] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAvatarRemove = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    setProfile(prev => ({ ...prev, avatar: undefined }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // Prepare form data for avatar upload if needed
      const formData = new FormData()
      if (avatarFile) {
        formData.append('avatar', avatarFile)
      }
      
      console.log('Sending profile update:', {
        name: profile.name,
        username: profile.username,
        bio: profile.bio,
        location: profile.location,
        timezone: profile.timezone,
      });
      
      // Update profile via API
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin', // Ensure cookies are sent
        body: JSON.stringify({
          name: profile.name,
          username: profile.username,
          bio: profile.bio,
          location: profile.location,
          timezone: profile.timezone,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Profile update failed:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to update profile')
      }
      
      const updatedProfile = await response.json()
      
      // If there's a new avatar, upload it separately
      if (avatarFile) {
        const avatarResponse = await fetch('/api/user/avatar', {
          method: 'POST',
          body: formData,
        })
        
        if (avatarResponse.ok) {
          const { avatarUrl } = await avatarResponse.json()
          setProfile(prev => ({ ...prev, avatar: avatarUrl }))
          // Update session with new avatar
          await update({ image: avatarUrl })
        }
        
        setAvatarFile(null)
        setAvatarPreview(null)
      }
      
      // Update session with new name if changed
      if (profile.name !== session?.user?.name) {
        await update({ name: profile.name })
      }
      
      console.log('Profile updated successfully')
    } catch (error: any) {
      console.error('Failed to update profile:', error)
      console.error('Error message:', error.message)
      alert(`Failed to update profile: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getAvatarSrc = () => {
    if (avatarPreview) return avatarPreview
    if (profile.avatar) return profile.avatar
    return null
  }

  return (
    <div className="p-6">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-lg font-medium text-gray-900">Profile Information</h2>
        <p className="text-sm text-gray-500 mt-1">
          Update your profile information and avatar.
        </p>
      </div>

      <div className="space-y-6">
        {/* Avatar Section */}
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
              {getAvatarSrc() ? (
                <Image
                  src={getAvatarSrc()!}
                  alt="Avatar"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
            {(avatarPreview || profile.avatar) && (
              <button
                onClick={handleAvatarRemove}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                title="Remove avatar"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Camera className="w-4 h-4 mr-2" />
              Change Avatar
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
              className="hidden"
            />
            <p className="text-xs text-gray-500 mt-2">
              JPG, GIF or PNG. Max size of 2MB.
            </p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              value={profile.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your full name"
            />
          </div>

          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={profile.username || ''}
              onChange={(e) => handleInputChange('username', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your username"
            />
          </div>

          {/* Email */}
          <div className="md:col-span-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={profile.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="your.email@example.com"
            />
          </div>

          {/* Bio */}
          <div className="md:col-span-2">
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
              Bio
            </label>
            <textarea
              id="bio"
              value={profile.bio || ''}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Tell us about yourself..."
            />
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              id="location"
              value={profile.location || ''}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="City, State/Country"
            />
          </div>

          {/* Timezone */}
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <select
              id="timezone"
              value={profile.timezone || ''}
              onChange={(e) => handleInputChange('timezone', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select timezone</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">Greenwich Mean Time (GMT)</option>
              <option value="Europe/Paris">Central European Time (CET)</option>
              <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
              <option value="Australia/Sydney">Australian Eastern Time (AET)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}