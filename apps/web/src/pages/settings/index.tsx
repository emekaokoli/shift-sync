import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { showError, showSuccess } from '@/lib/toast';

interface NotificationPreferences {
  inAppNotifications: boolean;
  emailNotifications: boolean;
  shiftReminders: boolean;
  swapNotifications: boolean;
  overtimeAlerts: boolean;
}

async function fetchPreferences(): Promise<NotificationPreferences> {
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:1964'}/api/v1/users/me/preferences`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
  if (!response.ok) throw new Error('Failed to fetch preferences');
  const data = await response.json();
  return data.data || {
    inAppNotifications: true,
    emailNotifications: false,
    shiftReminders: true,
    swapNotifications: true,
    overtimeAlerts: true,
  };
}

async function updatePreferences(prefs: NotificationPreferences): Promise<void> {
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:1964'}/api/v1/users/me/preferences`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    },
    body: JSON.stringify(prefs),
  });
  if (!response.ok) throw new Error('Failed to update preferences');
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="font-medium">{label}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
          checked ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <span
          className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    inAppNotifications: true,
    emailNotifications: false,
    shiftReminders: true,
    swapNotifications: true,
    overtimeAlerts: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPreferences()
      .then(setPreferences)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePreferences(preferences);
      showSuccess('Settings saved', 'Your notification preferences have been updated.');
    } catch (error) {
      showError('Failed to save', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your notification preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Choose how you want to receive notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            <Toggle
              checked={preferences.inAppNotifications}
              onChange={(v) => handleToggle('inAppNotifications', v)}
              label="In-App Notifications"
              description="Receive notifications within the application"
            />
            <Toggle
              checked={preferences.emailNotifications}
              onChange={(v) => handleToggle('emailNotifications', v)}
              label="Email Notifications"
              description="Receive notifications via email"
            />
            <Toggle
              checked={preferences.shiftReminders}
              onChange={(v) => handleToggle('shiftReminders', v)}
              label="Shift Reminders"
              description="Get reminders before your scheduled shifts"
            />
            <Toggle
              checked={preferences.swapNotifications}
              onChange={(v) => handleToggle('swapNotifications', v)}
              label="Swap Notifications"
              description="Notifications about shift swap requests"
            />
            <Toggle
              checked={preferences.overtimeAlerts}
              onChange={(v) => handleToggle('overtimeAlerts', v)}
              label="Overtime Alerts"
              description="Get notified when you're approaching overtime"
            />
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}