"use client"

import { useEffect } from 'react'
import { Badge } from "@/components/ui/badge"
import { EnhancedButton } from "@/components/ui/enhanced-button"
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card"
import { StatCard } from "@/components/ui/stat-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Globe, Mail, Eye, Bookmark, Sun, Moon, BookOpen, Settings, User, Bell, Shield, Palette } from "@/components/ui/icons"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { useTheme } from "next-themes"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useReaderStore } from '@/store/useReaderStore'
import { useAppStore } from '@/store/useAppStore'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  
  // Use our reader store instead of local state
  const {
    fontSize,
    lineHeight,
    fontFamily,
    theme: readerTheme,
    colorTemperature,
    contrast,
    autoTheme,
    setFontSize,
    setLineHeight,
    setFontFamily,
    setTheme: setReaderTheme,
    setColorTemperature,
    setContrast,
    toggleAutoTheme,
    resetSettings
  } = useReaderStore();
  
  // Use our app store for global preferences
  const {
    reduceMotion,
    highContrast,
    setReduceMotion,
    setHighContrast,
    setTheme: setAppTheme,
    resetAppSettings
  } = useAppStore();
  
  // Sync next-themes and app theme when theme changes
  useEffect(() => {
    if (theme) {
      setAppTheme(theme as any);
    }
  }, [theme, setAppTheme]);
  
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-vg-fade-in">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-vg-primary-600 to-vg-sanskrit-600 bg-clip-text text-transparent flex items-center gap-3">
            <Settings className="h-10 w-10 text-vg-primary-600" />
            Settings
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full backdrop-blur-md bg-white/70 dark:bg-gray-800/70 border border-white/20">
          <TabsTrigger value="account" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-vg-primary-600 data-[state=active]:to-vg-sanskrit-600 data-[state=active]:text-white">Account</TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-vg-primary-600 data-[state=active]:to-vg-sanskrit-600 data-[state=active]:text-white">Security</TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-vg-primary-600 data-[state=active]:to-vg-sanskrit-600 data-[state=active]:text-white">Notifications</TabsTrigger>
          <TabsTrigger value="appearance" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-vg-primary-600 data-[state=active]:to-vg-sanskrit-600 data-[state=active]:text-white">Appearance</TabsTrigger>
          <TabsTrigger value="advanced" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-vg-primary-600 data-[state=active]:to-vg-sanskrit-600 data-[state=active]:text-white">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          <EnhancedCard variant="elevated">
            <EnhancedCardHeader>
              <EnhancedCardTitle className="bg-gradient-to-r from-vg-primary-600 to-vg-sanskrit-600 bg-clip-text text-transparent flex items-center gap-2">
                <User className="h-5 w-5 text-vg-primary-600" />
                Account Information
              </EnhancedCardTitle>
              <EnhancedCardDescription>Update your account details and personal information</EnhancedCardDescription>
            </EnhancedCardHeader>
            <EnhancedCardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" defaultValue="John Doe" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" defaultValue="john.doe@example.com" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Input id="role" defaultValue="Administrator" readOnly className="bg-muted" />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Contact Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" defaultValue="+1 (555) 123-4567" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" defaultValue="123 Library Lane, Bookville, BK 12345" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Connected Accounts</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Google</p>
                        <p className="text-sm text-muted-foreground">Connected to john.doe@gmail.com</p>
                      </div>
                    </div>
                    <EnhancedButton variant="outline" size="sm">
                      Disconnect
                    </EnhancedButton>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Microsoft</p>
                        <p className="text-sm text-muted-foreground">Not connected</p>
                      </div>
                    </div>
                    <EnhancedButton variant="vg-primary" size="sm">Connect</EnhancedButton>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <EnhancedButton variant="outline">Cancel</EnhancedButton>
                <EnhancedButton variant="vg-success">Save Changes</EnhancedButton>
              </div>
            </EnhancedCardContent>
          </EnhancedCard>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <EnhancedCard variant="elevated">
            <EnhancedCardHeader>
              <EnhancedCardTitle className="bg-gradient-to-r from-vg-primary-600 to-vg-sanskrit-600 bg-clip-text text-transparent flex items-center gap-2">
                <Shield className="h-5 w-5 text-vg-primary-600" />
                Security Settings
              </EnhancedCardTitle>
              <EnhancedCardDescription>Manage your password and security preferences</EnhancedCardDescription>
            </EnhancedCardHeader>
            <EnhancedCardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium bg-gradient-to-r from-vg-primary-600 to-vg-sanskrit-600 bg-clip-text text-transparent">Change Password</h3>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <div className="relative">
                      <Input id="current-password" type="password" />
                      <EnhancedButton variant="ghost" size="icon" className="absolute right-0 top-0 h-full">
                        <Eye className="h-4 w-4" />
                      </EnhancedButton>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input id="new-password" type="password" />
                      <EnhancedButton variant="ghost" size="icon" className="absolute right-0 top-0 h-full">
                        <Eye className="h-4 w-4" />
                      </EnhancedButton>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <div className="relative">
                      <Input id="confirm-password" type="password" />
                      <EnhancedButton variant="ghost" size="icon" className="absolute right-0 top-0 h-full">
                        <Eye className="h-4 w-4" />
                      </EnhancedButton>
                    </div>
                  </div>
                  <EnhancedButton variant="vg-success">Update Password</EnhancedButton>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium bg-gradient-to-r from-vg-primary-600 to-vg-sanskrit-600 bg-clip-text text-transparent">Two-Factor Authentication</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                  </div>
                  <Switch id="two-factor" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Authenticator App</p>
                    <p className="text-sm text-muted-foreground">
                      Use an authenticator app to generate verification codes
                    </p>
                  </div>
                  <EnhancedButton variant="outline" size="sm">
                    Setup
                  </EnhancedButton>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">SMS Authentication</p>
                    <p className="text-sm text-muted-foreground">Receive verification codes via SMS</p>
                  </div>
                  <EnhancedButton variant="outline" size="sm">
                    Setup
                  </EnhancedButton>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium bg-gradient-to-r from-vg-primary-600 to-vg-sanskrit-600 bg-clip-text text-transparent">Session Management</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Current Session</p>
                      <p className="text-sm text-muted-foreground">Chrome on Windows • Last active: Just now</p>
                    </div>
                    <Badge variant="outline">Current</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Mobile App</p>
                      <p className="text-sm text-muted-foreground">iPhone 13 • Last active: 2 hours ago</p>
                    </div>
                    <EnhancedButton variant="outline" size="sm">
                      Revoke
                    </EnhancedButton>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Firefox</p>
                      <p className="text-sm text-muted-foreground">Firefox on MacOS • Last active: Yesterday</p>
                    </div>
                    <EnhancedButton variant="outline" size="sm">
                      Revoke
                    </EnhancedButton>
                  </div>
                  <EnhancedButton variant="vg-error">Revoke All Other Sessions</EnhancedButton>
                </div>
              </div>
            </EnhancedCardContent>
          </EnhancedCard>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <EnhancedCard variant="elevated">
            <EnhancedCardHeader>
              <EnhancedCardTitle className="bg-gradient-to-r from-vg-primary-600 to-vg-sanskrit-600 bg-clip-text text-transparent flex items-center gap-2">
                <Bell className="h-5 w-5 text-vg-primary-600" />
                Notification Settings
              </EnhancedCardTitle>
              <EnhancedCardDescription>Manage how and when you receive notifications</EnhancedCardDescription>
            </EnhancedCardHeader>
            <EnhancedCardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium bg-gradient-to-r from-vg-primary-600 to-vg-sanskrit-600 bg-clip-text text-transparent">Email Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Due Date Reminders</p>
                      <p className="text-sm text-muted-foreground">Receive reminders before books are due</p>
                    </div>
                    <Switch id="due-date-email" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">New Book Availability</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified when books on your wishlist become available
                      </p>
                    </div>
                    <Switch id="book-availability-email" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">System Announcements</p>
                      <p className="text-sm text-muted-foreground">Important updates about the library system</p>
                    </div>
                    <Switch id="system-announcements-email" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Marketing & Promotions</p>
                      <p className="text-sm text-muted-foreground">Newsletters and promotional content</p>
                    </div>
                    <Switch id="marketing-email" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium bg-gradient-to-r from-vg-primary-600 to-vg-sanskrit-600 bg-clip-text text-transparent">In-App Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Due Date Reminders</p>
                      <p className="text-sm text-muted-foreground">Receive in-app reminders before books are due</p>
                    </div>
                    <Switch id="due-date-app" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Request Status Updates</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified when your borrow requests change status
                      </p>
                    </div>
                    <Switch id="request-status-app" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Messages</p>
                      <p className="text-sm text-muted-foreground">
                        Notifications for new messages from librarians or teachers
                      </p>
                    </div>
                    <Switch id="messages-app" defaultChecked />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium bg-gradient-to-r from-vg-primary-600 to-vg-sanskrit-600 bg-clip-text text-transparent">Push Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable Push Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications even when you're not using the app
                      </p>
                    </div>
                    <Switch id="push-notifications" defaultChecked />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notification-time">Quiet Hours</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="start-time" className="text-sm text-muted-foreground">
                          Start
                        </Label>
                        <Input id="start-time" type="time" defaultValue="22:00" />
                      </div>
                      <div>
                        <Label htmlFor="end-time" className="text-sm text-muted-foreground">
                          End
                        </Label>
                        <Input id="end-time" type="time" defaultValue="08:00" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <EnhancedButton variant="outline">Reset to Defaults</EnhancedButton>
                <EnhancedButton variant="vg-success">Save Changes</EnhancedButton>
              </div>
            </EnhancedCardContent>
          </EnhancedCard>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <EnhancedCard variant="elevated">
            <EnhancedCardHeader>
              <EnhancedCardTitle className="bg-gradient-to-r from-vg-primary-600 to-vg-sanskrit-600 bg-clip-text text-transparent flex items-center gap-2">
                <Palette className="h-5 w-5 text-vg-primary-600" />
                Appearance Settings
              </EnhancedCardTitle>
              <EnhancedCardDescription>Customize how the application looks and feels</EnhancedCardDescription>
            </EnhancedCardHeader>
            <EnhancedCardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium bg-gradient-to-r from-vg-primary-600 to-vg-sanskrit-600 bg-clip-text text-transparent">Theme</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div 
                    className={`border rounded-md p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-primary ${theme === 'light' ? 'border-primary' : ''}`}
                    onClick={() => setTheme('light')}
                  >
                    <div className="w-full h-20 bg-white rounded-md border"></div>
                    <p className="font-medium">Light</p>
                  </div>
                  <div 
                    className={`border rounded-md p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-primary ${theme === 'dark' ? 'border-primary' : ''}`}
                    onClick={() => setTheme('dark')}
                  >
                    <div className="w-full h-20 bg-gray-900 rounded-md border"></div>
                    <p className="font-medium">Dark</p>
                  </div>
                  <div 
                    className={`border rounded-md p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-primary ${theme === 'system' ? 'border-primary' : ''}`}
                    onClick={() => setTheme('system')}
                  >
                    <div className="w-full h-20 bg-gradient-to-b from-white to-gray-900 rounded-md border"></div>
                    <p className="font-medium">System</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium bg-gradient-to-r from-vg-primary-600 to-vg-sanskrit-600 bg-clip-text text-transparent">Reader Preferences</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reader-theme">Default Reader Theme</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div 
                        className={`border rounded-md p-3 flex items-center justify-center gap-2 cursor-pointer hover:border-primary ${readerTheme === 'light' ? 'border-primary' : ''}`}
                        onClick={() => setReaderTheme('light')}
                      >
                        <Sun className="h-4 w-4" />
                        <span className="text-sm">Light</span>
                      </div>
                      <div 
                        className={`border rounded-md p-3 flex items-center justify-center gap-2 cursor-pointer hover:border-primary ${readerTheme === 'dark' ? 'border-primary' : ''}`}
                        onClick={() => setReaderTheme('dark')}
                      >
                        <Moon className="h-4 w-4" />
                        <span className="text-sm">Dark</span>
                      </div>
                      <div 
                        className={`border rounded-md p-3 flex items-center justify-center gap-2 cursor-pointer hover:border-primary ${readerTheme === 'eye-comfort' ? 'border-primary' : ''}`}
                        onClick={() => setReaderTheme('eye-comfort')}
                      >
                        <BookOpen className="h-4 w-4" />
                        <span className="text-sm">Eye Comfort</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="color-temperature">Color Temperature</Label>
                      <span className="text-sm">{colorTemperature}%</span>
                    </div>
                    <Slider 
                      id="color-temperature"
                      min={0} 
                      max={100} 
                      step={5}
                      value={[colorTemperature]}
                      onValueChange={(value) => setColorTemperature(value[0])}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">Adjust the warmth of the screen to reduce eye strain</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="contrast">Contrast</Label>
                      <span className="text-sm">{contrast.toFixed(1)}</span>
                    </div>
                    <Slider 
                      id="contrast"
                      min={0.5} 
                      max={1.5} 
                      step={0.1}
                      value={[contrast]}
                      onValueChange={(value) => setContrast(value[0])}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">Adjust the contrast between text and background</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="font-family">Default Font</Label>
                    <Select 
                      value={fontFamily}
                      onValueChange={(value) => setFontFamily(value)}
                    >
                      <SelectTrigger id="font-family">
                        <SelectValue placeholder="Select font" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="Merriweather">Merriweather</SelectItem>
                        <SelectItem value="Source Serif Pro">Source Serif Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="font-size">Font Size</Label>
                      <span className="text-sm">{fontSize}px</span>
                    </div>
                    <Slider 
                      id="font-size"
                      min={12} 
                      max={24} 
                      step={1}
                      value={[fontSize]}
                      onValueChange={(value) => setFontSize(value[0])}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="line-height">Line Height</Label>
                      <span className="text-sm">{lineHeight.toFixed(1)}</span>
                    </div>
                    <Slider 
                      id="line-height"
                      min={1} 
                      max={2} 
                      step={0.1}
                      value={[lineHeight]}
                      onValueChange={(value) => setLineHeight(value[0])}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="auto-theme"
                      checked={autoTheme}
                      onCheckedChange={toggleAutoTheme}
                    />
                    <Label htmlFor="auto-theme">Auto Theme (Based on Time)</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">Automatically switch to dark theme at night and light theme during day</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Accessibility</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Reduce Motion</p>
                      <p className="text-sm text-muted-foreground">Minimize animations throughout the interface</p>
                    </div>
                    <Switch 
                      id="reduce-motion" 
                      checked={reduceMotion}
                      onCheckedChange={setReduceMotion}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">High Contrast</p>
                      <p className="text-sm text-muted-foreground">Increase contrast for better readability</p>
                    </div>
                    <Switch 
                      id="high-contrast" 
                      checked={highContrast}
                      onCheckedChange={setHighContrast}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <EnhancedButton
                  variant="outline"
                  onClick={resetSettings}
                >
                  Reset to Defaults
                </EnhancedButton>
                <EnhancedButton variant="vg-success">Save Changes</EnhancedButton>
              </div>
            </EnhancedCardContent>
          </EnhancedCard>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <EnhancedCard variant="elevated">
            <EnhancedCardHeader>
              <EnhancedCardTitle className="bg-gradient-to-r from-vg-primary-600 to-vg-sanskrit-600 bg-clip-text text-transparent flex items-center gap-2">
                <Settings className="h-5 w-5 text-vg-primary-600" />
                Advanced Settings
              </EnhancedCardTitle>
              <EnhancedCardDescription>Configure advanced system settings and integrations</EnhancedCardDescription>
            </EnhancedCardHeader>
            <EnhancedCardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium bg-gradient-to-r from-vg-primary-600 to-vg-sanskrit-600 bg-clip-text text-transparent">Data Management</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Save Reading History</p>
                      <p className="text-sm text-muted-foreground">Keep a record of books you've borrowed</p>
                    </div>
                    <Switch id="reading-history" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Sync Across Devices</p>
                      <p className="text-sm text-muted-foreground">Synchronize your data across all your devices</p>
                    </div>
                    <Switch id="sync-devices" defaultChecked />
                  </div>
                  <EnhancedButton variant="outline">Export My Data</EnhancedButton>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium bg-gradient-to-r from-vg-primary-600 to-vg-sanskrit-600 bg-clip-text text-transparent">API Access</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable API Access</p>
                      <p className="text-sm text-muted-foreground">
                        Allow third-party applications to access your data
                      </p>
                    </div>
                    <Switch id="api-access" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <div className="flex gap-2">
                      <Input id="api-key" value="••••••••••••••••••••••••" readOnly className="bg-muted" />
                      <EnhancedButton variant="outline">Generate New Key</EnhancedButton>
                    </div>
                    <p className="text-xs text-muted-foreground">Last generated: Never</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium bg-gradient-to-r from-vg-error-600 to-vg-error-700 bg-clip-text text-transparent">Danger Zone</h3>
                <div className="space-y-4 border border-destructive/20 rounded-md p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Delete Reading History</p>
                      <p className="text-sm text-muted-foreground">Permanently delete your reading history</p>
                    </div>
                    <EnhancedButton variant="vg-error" size="sm">
                      Delete
                    </EnhancedButton>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Deactivate Account</p>
                      <p className="text-sm text-muted-foreground">Temporarily disable your account</p>
                    </div>
                    <EnhancedButton variant="vg-error" size="sm">
                      Deactivate
                    </EnhancedButton>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Delete Account</p>
                      <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                    </div>
                    <EnhancedButton variant="vg-error" size="sm">
                      Delete
                    </EnhancedButton>
                  </div>
                </div>
              </div>
            </EnhancedCardContent>
          </EnhancedCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
