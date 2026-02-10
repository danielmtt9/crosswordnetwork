"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Mail, Bell, Settings, Save, Check } from "lucide-react";
import { useSession } from "next-auth/react";

interface EmailPreferences {
  marketing: boolean;
  notifications: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  achievements: boolean;
  leaderboards: boolean;
  security: boolean;
}

export default function EmailPreferences() {
  const { data: session } = useSession();
  const [preferences, setPreferences] = useState<EmailPreferences>({
    marketing: true,
    notifications: true,
    frequency: 'immediate',
    achievements: true,
    leaderboards: true,
    security: true
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      loadPreferences();
    }
  }, [session]);

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/user/email-preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Failed to load email preferences:', error);
    }
  };

  const savePreferences = async () => {
    setLoading(true);
    setSaved(false);

    try {
      const response = await fetch('/api/user/email-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences }),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        console.error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Failed to save email preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = (key: keyof EmailPreferences, value: boolean | string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Email Preferences</h2>
          <p className="text-muted-foreground">
            Manage your email notification settings and preferences
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Mail className="h-3 w-3" />
          Email Settings
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* General Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>
              Control your overall email preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="marketing">Marketing Emails</Label>
                <p className="text-sm text-muted-foreground">
                  Receive updates about new features and promotions
                </p>
              </div>
              <Switch
                id="marketing"
                checked={preferences.marketing}
                onCheckedChange={(checked) => updatePreference('marketing', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive important account notifications
                </p>
              </div>
              <Switch
                id="notifications"
                checked={preferences.notifications}
                onCheckedChange={(checked) => updatePreference('notifications', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Email Frequency</Label>
              <Select
                value={preferences.frequency}
                onValueChange={(value) => updatePreference('frequency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="daily">Daily Digest</SelectItem>
                  <SelectItem value="weekly">Weekly Summary</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                How often you'd like to receive emails
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Game-Specific Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Game Notifications
            </CardTitle>
            <CardDescription>
              Choose which game events you want to be notified about
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="achievements">Achievement Unlocks</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when you unlock new achievements
                </p>
              </div>
              <Switch
                id="achievements"
                checked={preferences.achievements}
                onCheckedChange={(checked) => updatePreference('achievements', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="leaderboards">Leaderboard Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Receive updates about leaderboard changes
                </p>
              </div>
              <Switch
                id="leaderboards"
                checked={preferences.leaderboards}
                onCheckedChange={(checked) => updatePreference('leaderboards', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="security">Security Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Important security and account notifications
                </p>
              </div>
              <Switch
                id="security"
                checked={preferences.security}
                onCheckedChange={(checked) => updatePreference('security', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Save Your Preferences</h3>
                <p className="text-sm text-muted-foreground">
                  Your email preferences will be updated immediately
                </p>
              </div>
              <Button
                onClick={savePreferences}
                disabled={loading}
                className="min-w-[120px]"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
