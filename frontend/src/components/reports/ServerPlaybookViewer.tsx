'use client';

import React, { useState } from 'react';
import { Copy, Check, Terminal, FileCode, Server, Globe, ArrowRight } from 'lucide-react';

export interface PlaybookItem {
  title: string;
  filename: string;
  language: string;
  snippet: string;
  instructions: string;
}

export interface PlaybookCollection {
  check_id: string;
  recommendedStack: 'nginx' | 'apache' | 'cloudflare' | 'nextjs' | 'caddy' | 'dns';
  playbooks: {
    nginx?: PlaybookItem;
    apache?: PlaybookItem;
    cloudflare?: PlaybookItem;
    nextjs?: PlaybookItem;
    caddy?: PlaybookItem;
    dns?: PlaybookItem;
  };
}

interface ServerPlaybookViewerProps {
  playbooks?: PlaybookCollection;
  detectedTech?: string[];
}

export default function ServerPlaybookViewer({ playbooks, detectedTech = [] }: ServerPlaybookViewerProps) {
  if (!playbooks || !playbooks.playbooks) return null;

  const availableKeys = Object.keys(playbooks.playbooks) as Array<keyof typeof playbooks.playbooks>;
  if (availableKeys.length === 0) return null;

  // Infer default selected stack from detectedTech or recommendedStack
  const defaultTab = availableKeys.includes(playbooks.recommendedStack as any)
    ? playbooks.recommendedStack
    : availableKeys[0];

  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [copied, setCopied] = useState(false);

  const activePlaybook = (playbooks.playbooks as any)[activeTab] as PlaybookItem | undefined;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStackIcon = (key: string) => {
    switch (key) {
      case 'nginx':
      case 'apache':
      case 'caddy':
        return <Server className="w-3.5 h-3.5" />;
      case 'cloudflare':
      case 'dns':
        return <Globe className="w-3.5 h-3.5" />;
      default:
        return <FileCode className="w-3.5 h-3.5" />;
    }
  };

  const getStackLabel = (key: string) => {
    switch (key) {
      case 'nginx': return 'Nginx';
      case 'apache': return 'Apache';
      case 'cloudflare': return 'Cloudflare';
      case 'nextjs': return 'Next.js';
      case 'caddy': return 'Caddy';
      case 'dns': return 'DNS (TXT)';
      default: return key.toUpperCase();
    }
  };

  return (
    <div className="mt-4 border border-border/50 bg-background/80 rounded-lg overflow-hidden shadow-xs">
      {/* HEADER & TABS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border/40 bg-muted/20 px-3 py-2 gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-foreground">
            1-Click Server Fix Playbook
          </span>
        </div>

        {/* STACK TABS */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 sm:pb-0">
          {availableKeys.map((key) => {
            const isSelected = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key);
                  setCopied(false);
                }}
                className={`px-2.5 py-1 text-[11px] font-mono rounded flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-foreground text-background font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                {getStackIcon(key)}
                <span>{getStackLabel(key)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* PLAYBOOK BODY */}
      {activePlaybook && (
        <div className="p-3.5 space-y-3">
          {/* File location badge */}
          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground/70">Target:</span>
              <code className="text-foreground bg-muted/30 px-1.5 py-0.5 rounded border border-border/40">
                {activePlaybook.filename}
              </code>
            </span>

            <button
              onClick={() => handleCopy(activePlaybook.snippet)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted/30 hover:bg-muted/60 text-foreground border border-border/40 rounded text-xs font-mono transition-colors cursor-pointer"
              title="Copy snippet to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Snippet</span>
                </>
              )}
            </button>
          </div>

          {/* Code block */}
          <div className="relative group">
            <pre className="p-3 bg-zinc-950 text-zinc-100 dark:bg-black dark:text-zinc-200 rounded border border-border/40 text-xs font-mono overflow-x-auto leading-relaxed select-all">
              <code>{activePlaybook.snippet}</code>
            </pre>
          </div>

          {/* Quick instructions */}
          {activePlaybook.instructions && (
            <div className="text-[11px] text-muted-foreground flex items-start gap-1.5 font-mono pt-1">
              <ArrowRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
              <span>{activePlaybook.instructions}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
