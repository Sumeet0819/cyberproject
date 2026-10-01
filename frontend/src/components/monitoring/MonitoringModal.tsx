'use client';

import React, { useState } from 'react';
import { 
  Bell, X, Check, Loader2, Send, Clock, ShieldCheck, 
  AlertCircle, CheckCircle2, Globe, Mail, Radio 
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { setWebsiteMonitoring } from '@/store/features/websiteSlice';

interface MonitoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  websiteId: string;
  domain: string;
  initialEnabled?: boolean;
  initialFrequency?: 'daily' | 'weekly' | 'monthly';
  initialEmail?: string | null;
  initialWebhook?: string | null;
  onSuccess?: () => void;
}

export default function MonitoringModal({
  isOpen,
  onClose,
  websiteId,
  domain,
  initialEnabled = false,
  initialFrequency = 'weekly',
  initialEmail = '',
  initialWebhook = '',
  onSuccess
}: MonitoringModalProps) {
  const dispatch = useDispatch();

  const [enabled, setEnabled] = useState(initialEnabled);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>(initialFrequency);
  const [email, setEmail] = useState(initialEmail || '');
  const [webhookUrl, setWebhookUrl] = useState(initialWebhook || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestNotification = async () => {
    if (!email && !webhookUrl) {
      setTestResult({
        success: false,
        message: 'Please provide either an email or a webhook URL to send a test ping.'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const res = await fetch(`/api/websites/${websiteId}/monitoring/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, webhookUrl })
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setTestResult({
          success: true,
          message: 'Test alert successfully dispatched to your configured destinations!'
        });
      } else {
        setTestResult({
          success: false,
          message: json.error || 'Failed to dispatch test notification.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error while testing notification.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/websites/${websiteId}/monitoring`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monitoring_enabled: enabled,
          monitoring_frequency: frequency,
          notification_email: email.trim() || null,
          webhook_url: webhookUrl.trim() || null
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update monitoring schedule');
      }

      dispatch(setWebsiteMonitoring({
        websiteId,
        monitoring_enabled: enabled,
        monitoring_frequency: frequency,
        notification_email: email.trim() || null,
        webhook_url: webhookUrl.trim() || null
      }));

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-background border border-border/60 shadow-2xl flex flex-col rounded-none overflow-hidden max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-none border border-border/60 bg-muted/30 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase">
                Autonomous Continuous Monitoring
              </h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {domain}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors border border-transparent hover:border-border/40 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {error && (
            <div className="p-3 border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TOGGLE */}
          <div className="flex items-center justify-between p-4 border border-border/40 bg-muted/10">
            <div className="space-y-0.5 pr-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground block">
                Enable Recurring Security Audits
              </span>
              <span className="text-xs text-muted-foreground leading-relaxed block">
                CyberHealth will autonomously audit this domain in the background and evaluate security score drift.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`w-12 h-6 flex items-center p-1 rounded-full transition-colors cursor-pointer shrink-0 ${
                enabled ? 'bg-emerald-600 justify-end' : 'bg-muted justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
            </button>
          </div>

          {/* FREQUENCY */}
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Scan Cadence
            </span>

            <div className="grid grid-cols-3 gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setFrequency(freq)}
                  className={`py-2 px-3 text-xs font-mono uppercase border transition-colors cursor-pointer ${
                    frequency === freq
                      ? 'bg-foreground text-background font-semibold border-foreground'
                      : 'border-border/40 bg-muted/5 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          {/* ALERT DESTINATIONS */}
          <div className="space-y-3 pt-1">
            <span className="text-xs font-mono uppercase text-muted-foreground flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" />
              Alert Notification Channels
            </span>

            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="w-3 h-3" />
                Alert Email (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="security-alerts@yourcompany.com"
                className="w-full bg-muted/10 border border-border/40 px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
              />
            </div>

            {/* Webhook Field */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Globe className="w-3 h-3" />
                Slack / Discord / Custom Webhook URL
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full bg-muted/10 border border-border/40 px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
              />
            </div>
          </div>

          {/* TEST PING BUTTON */}
          <div className="pt-2 flex items-center justify-between border-t border-border/40">
            <span className="text-[11px] text-muted-foreground font-mono">
              Test alert payload delivery
            </span>
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={isTesting || (!email && !webhookUrl)}
              className="px-3 py-1.5 border border-border/50 text-foreground hover:bg-muted/30 text-xs font-mono uppercase transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <Send className="w-3 h-3" />
                  <span>Send Test Ping</span>
                </>
              )}
            </button>
          </div>

          {testResult && (
            <div className={`p-3 border text-xs flex items-start gap-2 ${
              testResult.success
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-border/40 bg-muted/10 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border/50 text-foreground hover:bg-muted/20 text-xs font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 text-xs font-medium uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer rounded-none"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Settings</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
