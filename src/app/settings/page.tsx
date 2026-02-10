"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  User, 
  Bell, 
  Shield, 
  Palette,
  Save,
  Eye,
  EyeOff
} from "lucide-react";

// Mock user data
const mockUser = {
  name: "Alex Johnson",
  email: "alex@example.com",
  joinDate: "2024-01-15",
  preferences: {
    theme: "system",
    notifications: {
      email: true,
      push: false,
      marketing: false
    },
    privacy: {
      profileVisibility: "public",
      showOnlineStatus: true,
      allowFriendRequests: false
    },
    gameplay: {
      soundEnabled: true,
      animationsEnabled: true,
      autoSave: true
    }
  }
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState(mockUser);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    // In a real app, you'd show a success toast
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy", icon: Shield },
    { id: "appearance", label: "Appearance", icon: Palette }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <h1 className="text-xl font-bold">Settings</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-0">
                <nav className="space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Update your personal information and account details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={settings.name}
                        onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={settings.email}
                        onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter new password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Member since {new Date(settings.joinDate).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>
                      Choose how you want to be notified about updates and activities
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Email Notifications</h4>
                          <p className="text-sm text-muted-foreground">
                            Receive updates via email
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.preferences.notifications.email}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            preferences: {
                              ...prev.preferences,
                              notifications: {
                                ...prev.preferences.notifications,
                                email: e.target.checked
                              }
                            }
                          }))}
                          className="rounded border-border"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Push Notifications</h4>
                          <p className="text-sm text-muted-foreground">
                            Receive push notifications in your browser
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.preferences.notifications.push}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            preferences: {
                              ...prev.preferences,
                              notifications: {
                                ...prev.preferences.notifications,
                                push: e.target.checked
                              }
                            }
                          }))}
                          className="rounded border-border"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Marketing Emails</h4>
                          <p className="text-sm text-muted-foreground">
                            Receive promotional content and updates
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.preferences.notifications.marketing}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            preferences: {
                              ...prev.preferences,
                              notifications: {
                                ...prev.preferences.notifications,
                                marketing: e.target.checked
                              }
                            }
                          }))}
                          className="rounded border-border"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Privacy Tab */}
            {activeTab === "privacy" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Privacy Settings</CardTitle>
                    <CardDescription>
                      Control your privacy and data sharing preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="profileVisibility">Profile Visibility</Label>
                        <select
                          id="profileVisibility"
                          value={settings.preferences.privacy.profileVisibility}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            preferences: {
                              ...prev.preferences,
                              privacy: {
                                ...prev.preferences.privacy,
                                profileVisibility: e.target.value
                              }
                            }
                          }))}
                          className="w-full rounded-md border border-border bg-background px-3 py-2"
                        >
                          <option value="public">Public</option>
                          <option value="private">Private</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Show Online Status</h4>
                          <p className="text-sm text-muted-foreground">
                            Let others see when you're online
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.preferences.privacy.showOnlineStatus}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            preferences: {
                              ...prev.preferences,
                              privacy: {
                                ...prev.preferences.privacy,
                                showOnlineStatus: e.target.checked
                              }
                            }
                          }))}
                          className="rounded border-border"
                        />
                      </div>

                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Appearance Tab */}
            {activeTab === "appearance" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Appearance & Preferences</CardTitle>
                    <CardDescription>
                      Customize your experience and interface preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="theme">Theme</Label>
                        <select
                          id="theme"
                          value={settings.preferences.theme}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            preferences: {
                              ...prev.preferences,
                              theme: e.target.value
                            }
                          }))}
                          className="w-full rounded-md border border-border bg-background px-3 py-2"
                        >
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                          <option value="system">System</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Sound Effects</h4>
                          <p className="text-sm text-muted-foreground">
                            Play sound effects during gameplay
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.preferences.gameplay.soundEnabled}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            preferences: {
                              ...prev.preferences,
                              gameplay: {
                                ...prev.preferences.gameplay,
                                soundEnabled: e.target.checked
                              }
                            }
                          }))}
                          className="rounded border-border"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Animations</h4>
                          <p className="text-sm text-muted-foreground">
                            Enable smooth animations and transitions
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.preferences.gameplay.animationsEnabled}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            preferences: {
                              ...prev.preferences,
                              gameplay: {
                                ...prev.preferences.gameplay,
                                animationsEnabled: e.target.checked
                              }
                            }
                          }))}
                          className="rounded border-border"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Auto-save Progress</h4>
                          <p className="text-sm text-muted-foreground">
                            Automatically save your puzzle progress
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.preferences.gameplay.autoSave}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            preferences: {
                              ...prev.preferences,
                              gameplay: {
                                ...prev.preferences.gameplay,
                                autoSave: e.target.checked
                              }
                            }
                          }))}
                          className="rounded border-border"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Save Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Save Changes</h4>
                      <p className="text-sm text-muted-foreground">
                        Your preferences will be saved automatically
                      </p>
                    </div>
                    <Button onClick={handleSave} disabled={isSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
