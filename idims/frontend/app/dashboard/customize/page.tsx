'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/auth-store';
import apiClient from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Palette, Layout, Settings as SettingsIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface DashboardPreferences {
  layout?: {
    widgets?: string[];
    widget_positions?: Record<string, { x: number; y: number; w: number; h: number }>;
    theme?: 'light' | 'dark' | 'auto';
    color_scheme?: string;
  };
  branding?: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    custom_css?: string;
  };
  settings?: {
    default_view?: string;
    refresh_interval?: number;
    notifications_enabled?: boolean;
    [key: string]: any;
  };
}

interface Organization {
  id: string;
  name: string;
  branches?: Organization[];
}

export default function CustomizeDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<DashboardPreferences>({});
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [branches, setBranches] = useState<Organization[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [applyToAll, setApplyToAll] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'pharmacy_admin') {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [isAuthenticated, user, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const orgId = user?.organization_id;

      // Fetch organization details
      const orgResponse = await apiClient.get(`/organizations/${orgId}`);
      setOrganization(orgResponse.data);
      setBranches(orgResponse.data.branches || []);

      // Fetch dashboard preferences
      const prefResponse = await apiClient.get(
        `/organizations/${orgId}/dashboard-preferences`,
      );
      if (prefResponse.data) {
        setPreferences(prefResponse.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load customization settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const orgId = user?.organization_id;
      const endpoint = `/organizations/${orgId}/dashboard-preferences${
        applyToAll ? '?apply_to_all=true' : selectedBranch !== 'all' ? `?branch_id=${selectedBranch}` : ''
      }`;

      await apiClient.patch(endpoint, preferences);

      setSuccess(
        applyToAll
          ? 'Customization applied to all branches successfully!'
          : 'Customization saved successfully!',
      );
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save customization');
    } finally {
      setSaving(false);
    }
  };

  const updateLayout = (key: string, value: any) => {
    setPreferences((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        [key]: value,
      },
    }));
  };

  const updateBranding = (key: string, value: any) => {
    setPreferences((prev) => ({
      ...prev,
      branding: {
        ...prev.branding,
        [key]: value,
      },
    }));
  };

  const updateSettings = (key: string, value: any) => {
    setPreferences((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Platform Customization</h1>
              <p className="text-sm text-gray-600">
                Customize your pharmacy platform to match your brand
              </p>
            </div>
            <a
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700"
          >
            {success}
          </motion.div>
        )}

        {/* Apply To Selection */}
        {branches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Apply Customization</CardTitle>
                <CardDescription>
                  Choose where to apply these customizations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={applyToAll}
                    onCheckedChange={setApplyToAll}
                  />
                  <Label>Apply to all branches</Label>
                </div>
                {!applyToAll && (
                  <div>
                    <Label>Select Branch</Label>
                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Main Organization</SelectItem>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Layout Customization */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Layout className="h-5 w-5 text-blue-600" />
                  <CardTitle>Layout & Theme</CardTitle>
                </div>
                <CardDescription>Customize dashboard layout and appearance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Theme</Label>
                  <Select
                    value={preferences.layout?.theme || 'light'}
                    onValueChange={(value) => updateLayout('theme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="auto">Auto (System)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Color Scheme</Label>
                  <Input
                    type="text"
                    placeholder="#3B82F6"
                    value={preferences.layout?.color_scheme || ''}
                    onChange={(e) => updateLayout('color_scheme', e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter a hex color code (e.g., #3B82F6)
                  </p>
                </div>

                <div>
                  <Label>Default View</Label>
                  <Select
                    value={preferences.settings?.default_view || 'dashboard'}
                    onValueChange={(value) => updateSettings('default_view', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dashboard">Dashboard</SelectItem>
                      <SelectItem value="inventory">Inventory</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="analytics">Analytics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Branding Customization */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Palette className="h-5 w-5 text-purple-600" />
                  <CardTitle>Branding</CardTitle>
                </div>
                <CardDescription>Customize your pharmacy brand identity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Logo URL</Label>
                  <Input
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={preferences.branding?.logo_url || ''}
                    onChange={(e) => updateBranding('logo_url', e.target.value)}
                  />
                </div>

                <div>
                  <Label>Primary Color</Label>
                  <div className="flex space-x-2">
                    <Input
                      type="color"
                      value={preferences.branding?.primary_color || '#3B82F6'}
                      onChange={(e) => updateBranding('primary_color', e.target.value)}
                      className="w-16 h-10"
                    />
                    <Input
                      type="text"
                      placeholder="#3B82F6"
                      value={preferences.branding?.primary_color || ''}
                      onChange={(e) => updateBranding('primary_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Secondary Color</Label>
                  <div className="flex space-x-2">
                    <Input
                      type="color"
                      value={preferences.branding?.secondary_color || '#8B5CF6'}
                      onChange={(e) => updateBranding('secondary_color', e.target.value)}
                      className="w-16 h-10"
                    />
                    <Input
                      type="text"
                      placeholder="#8B5CF6"
                      value={preferences.branding?.secondary_color || ''}
                      onChange={(e) => updateBranding('secondary_color', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Custom CSS</Label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    rows={4}
                    placeholder=".custom-class { color: #000; }"
                    value={preferences.branding?.custom_css || ''}
                    onChange={(e) => updateBranding('custom_css', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <SettingsIcon className="h-5 w-5 text-green-600" />
                  <CardTitle>Settings</CardTitle>
                </div>
                <CardDescription>Configure platform behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Refresh Interval (seconds)</Label>
                  <Input
                    type="number"
                    min="10"
                    max="300"
                    value={preferences.settings?.refresh_interval || 30}
                    onChange={(e) => updateSettings('refresh_interval', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    How often to refresh dashboard data (10-300 seconds)
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Notifications</Label>
                    <p className="text-xs text-gray-500">Show browser notifications</p>
                  </div>
                  <Switch
                    checked={preferences.settings?.notifications_enabled ?? true}
                    onCheckedChange={(checked) => updateSettings('notifications_enabled', checked)}
                  />
                </div>

                <div className="pt-4 border-t">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Customization
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Preview Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>See how your customization looks</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="p-6 rounded-lg border-2 border-dashed"
                style={{
                  backgroundColor: preferences.branding?.primary_color
                    ? `${preferences.branding.primary_color}20`
                    : '#f3f4f6',
                  borderColor: preferences.branding?.primary_color || '#e5e7eb',
                }}
              >
                <div className="text-center">
                  {preferences.branding?.logo_url && (
                    <img
                      src={preferences.branding.logo_url}
                      alt="Logo"
                      className="h-16 mx-auto mb-4"
                    />
                  )}
                  <h3
                    className="text-2xl font-bold mb-2"
                    style={{
                      color: preferences.branding?.primary_color || '#1f2937',
                    }}
                  >
                    {organization?.name || 'Your Pharmacy'}
                  </h3>
                  <p
                    className="text-sm"
                    style={{
                      color: preferences.branding?.secondary_color || '#6b7280',
                    }}
                  >
                    Customized Platform Preview
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

