import React from 'react';
import { Settings as SettingsIcon, Moon, Sun, Bell, MapPin, Volume2, Globe, Sunrise } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAutoTheme } from '@/hooks/useAutoTheme';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const Settings = () => {
  const { themeMode, setMode, isDark } = useAutoTheme();
  const [notifications, setNotifications] = useLocalStorage('notifications', true);
  const [voiceNav, setVoiceNav] = useLocalStorage('voiceNav', false);
  const [autoReroute, setAutoReroute] = useLocalStorage('autoReroute', true);
  const [distanceUnit, setDistanceUnit] = useLocalStorage('distanceUnit', 'km');
  const [language, setLanguage] = useLocalStorage('language', 'en');

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <SettingsIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Preferences</h1>
          <p className="text-muted-foreground">Customize your app experience</p>
        </div>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            Appearance
          </CardTitle>
          <CardDescription>Customize how the app looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="theme-mode" className="flex flex-col gap-1">
              <span>Theme Mode</span>
              <span className="text-xs text-muted-foreground font-normal">
                {themeMode === 'auto' ? 'Switches at sunset/sunrise' : `Currently ${themeMode} mode`}
              </span>
            </Label>
            <Select value={themeMode} onValueChange={(val) => setMode(val as 'light' | 'dark' | 'auto')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <span className="flex items-center gap-2">
                    <Sun className="w-4 h-4" /> Light
                  </span>
                </SelectItem>
                <SelectItem value="dark">
                  <span className="flex items-center gap-2">
                    <Moon className="w-4 h-4" /> Dark
                  </span>
                </SelectItem>
                <SelectItem value="auto">
                  <span className="flex items-center gap-2">
                    <Sunrise className="w-4 h-4" /> Auto
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Navigation
          </CardTitle>
          <CardDescription>Navigation and routing preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="voice-nav" className="flex flex-col gap-1">
              <span className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Voice Navigation
              </span>
              <span className="text-xs text-muted-foreground font-normal">Hear turn-by-turn directions</span>
            </Label>
            <Switch 
              id="voice-nav" 
              checked={voiceNav} 
              onCheckedChange={setVoiceNav}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-reroute" className="flex flex-col gap-1">
              <span>Auto Reroute</span>
              <span className="text-xs text-muted-foreground font-normal">Automatically recalculate when off-route</span>
            </Label>
            <Switch 
              id="auto-reroute" 
              checked={autoReroute} 
              onCheckedChange={setAutoReroute}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="distance-unit" className="flex flex-col gap-1">
              <span>Distance Unit</span>
              <span className="text-xs text-muted-foreground font-normal">Choose your preferred unit</span>
            </Label>
            <Select value={distanceUnit} onValueChange={setDistanceUnit}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="km">Kilometers</SelectItem>
                <SelectItem value="mi">Miles</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
          <CardDescription>Manage notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications" className="flex flex-col gap-1">
              <span>Push Notifications</span>
              <span className="text-xs text-muted-foreground font-normal">Receive traffic and route alerts</span>
            </Label>
            <Switch 
              id="notifications" 
              checked={notifications} 
              onCheckedChange={setNotifications}
            />
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Language & Region
          </CardTitle>
          <CardDescription>Set your language and regional preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="language" className="flex flex-col gap-1">
              <span>Language</span>
              <span className="text-xs text-muted-foreground font-normal">App display language</span>
            </Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिंदी</SelectItem>
                <SelectItem value="ta">தமிழ்</SelectItem>
                <SelectItem value="te">తెలుగు</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
