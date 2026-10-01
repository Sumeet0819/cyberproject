'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, Copy, Check, ExternalLink, X, Sun, Moon, 
  Sparkles, Code, CheckCircle2, AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface TrustBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  websiteId: string;
  domain: string;
  isVerified?: boolean;
  score?: number;
  grade?: string;
  onOpenVerification?: () => void;
}

export default function TrustBadgeModal({
  isOpen,
  onClose,
  websiteId,
  domain,
  isVerified = false,
  score = 0,
  grade = 'A',
  onOpenVerification
}: TrustBadgeModalProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [style, setStyle] = useState<'shield' | 'compact' | 'pill'>('shield');
  const [activeSnippetTab, setActiveSnippetTab] = useState<'html' | 'react' | 'markdown'>('html');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  // Build badge and verification URLs
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const badgeUrl = `${origin}/api/badges/${websiteId}.svg?theme=${theme}&style=${style}`;
  const verifyUrl = `${origin}/badges/verify/${websiteId}`;

  const htmlSnippet = `<a href="${verifyUrl}" target="_blank" rel="noopener noreferrer" title="View CyberHealth Security Verification">\n  <img src="${badgeUrl}" alt="CyberHealth Security Grade" />\n</a>`;
  const reactSnippet = `<a href="${verifyUrl}" target="_blank" rel="noopener noreferrer">\n  <img src="${badgeUrl}" alt="CyberHealth Security Grade" />\n</a>`;
  const markdownSnippet = `[![CyberHealth Security Grade](${badgeUrl})](${verifyUrl})`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getActiveCode = () => {
    switch (activeSnippetTab) {
      case 'react': return reactSnippet;
      case 'markdown': return markdownSnippet;
      default: return htmlSnippet;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-background border border-border/60 shadow-2xl flex flex-col rounded-none overflow-hidden max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-none border border-border/60 bg-muted/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase">
                  Embeddable Trust Seal
                </h3>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Verified Domain
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Domain Unverified
                  </span>
                )}
              </div>
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

        {/* CONTENT */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {!isVerified && (
            <div className="p-3.5 border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Verify domain ownership to activate official verified shield badge.</span>
              </div>
              {onOpenVerification && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenVerification();
                  }}
                  className="font-mono underline hover:text-foreground text-[11px] shrink-0 cursor-pointer"
                >
                  Verify Now →
                </button>
              )}
            </div>
          )}

          {/* LIVE PREVIEW CANVAS */}
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Live Badge Preview
            </span>
            <div className={`p-8 border border-border/40 flex flex-col items-center justify-center min-h-32 transition-colors ${
              theme === 'light' ? 'bg-zinc-100' : 'bg-zinc-950'
            }`}>
              <img 
                src={badgeUrl} 
                alt="CyberHealth Trust Seal" 
                className="select-none transition-all drop-shadow-sm" 
              />
              <span className="text-[10px] font-mono text-muted-foreground/60 mt-4">
                Clicking the badge opens the public verification certificate.
              </span>
            </div>
          </div>

          {/* CUSTOMIZATION OPTIONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* THEME */}
            <div className="space-y-1.5">
              <span className="text-xs font-mono uppercase text-muted-foreground">Theme</span>
              <div className="flex border border-border/40">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex-1 py-2 text-xs font-mono uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-foreground text-background font-semibold'
                      : 'bg-muted/10 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Moon className="w-3 h-3" /> Dark
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex-1 py-2 text-xs font-mono uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    theme === 'light'
                      ? 'bg-foreground text-background font-semibold'
                      : 'bg-muted/10 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sun className="w-3 h-3" /> Light
                </button>
              </div>
            </div>

            {/* STYLE */}
            <div className="space-y-1.5">
              <span className="text-xs font-mono uppercase text-muted-foreground">Style Variant</span>
              <div className="flex border border-border/40">
                {(['shield', 'compact', 'pill'] as const).map((variant) => (
                  <button
                    key={variant}
                    type="button"
                    onClick={() => setStyle(variant)}
                    className={`flex-1 py-2 text-xs font-mono uppercase transition-colors cursor-pointer capitalize ${
                      style === variant
                        ? 'bg-foreground text-background font-semibold'
                        : 'bg-muted/10 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {variant}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* EMBED CODE SNIPPET */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex border-b border-border/40">
                {(['html', 'react', 'markdown'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveSnippetTab(tab)}
                    className={`pb-1 px-3 text-xs font-mono uppercase transition-colors border-b-2 -mb-px cursor-pointer ${
                      activeSnippetTab === tab
                        ? 'border-foreground text-foreground font-medium'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <button
                onClick={() => copyToClipboard(getActiveCode(), activeSnippetTab)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-mono transition-colors cursor-pointer"
              >
                {copiedKey === activeSnippetTab ? (
                  <span className="text-emerald-500 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Copied!
                  </span>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy Snippet
                  </>
                )}
              </button>
            </div>

            <div className="bg-muted/10 border border-border/40 p-3 overflow-x-auto">
              <code className="text-xs font-mono text-foreground whitespace-pre leading-relaxed block">
                {getActiveCode()}
              </code>
            </div>
          </div>

          {/* PUBLIC VERIFICATION LINK */}
          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
            <span>Public Certificate URL:</span>
            <Link
              href={`/badges/verify/${websiteId}`}
              target="_blank"
              className="font-mono text-foreground hover:underline inline-flex items-center gap-1"
            >
              /badges/verify/{websiteId.slice(0, 8)}...
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-border/40 bg-muted/10 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-foreground text-background hover:bg-foreground/90 text-xs font-medium uppercase tracking-wider transition-all cursor-pointer rounded-none"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
