'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, CheckCircle2, AlertCircle, Loader2, X, 
  Copy, Check, Globe, FileCode, Server, ExternalLink, RefreshCw
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { setWebsiteVerified } from '@/store/features/websiteSlice';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  websiteId: string;
  domain: string;
  isVerified?: boolean;
  onVerifiedSuccess?: () => void;
}

interface VerificationInfo {
  websiteId: string;
  domain: string;
  is_verified: boolean;
  verified_at: string | null;
  verification_method: string | null;
  raw_token: string;
  verification_token: string;
  instructions: {
    dns: {
      type: 'TXT';
      host: string;
      value: string;
      description: string;
    };
    meta: {
      tag: string;
      description: string;
    };
    file: {
      url: string;
      content: string;
      description: string;
    };
  };
}

export default function VerificationModal({
  isOpen,
  onClose,
  websiteId,
  domain,
  isVerified = false,
  onVerifiedSuccess
}: VerificationModalProps) {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState<'dns' | 'meta' | 'file'>('dns');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [info, setInfo] = useState<VerificationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<{
    success: boolean;
    message: string;
    verified_method?: string;
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && websiteId) {
      fetchVerificationInfo();
      setVerifyResult(null);
      setError(null);
    }
  }, [isOpen, websiteId]);

  const fetchVerificationInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/websites/${websiteId}/verification`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load verification info');
      }
      setInfo(data.data);
    } catch (err: any) {
      setError(err.message || 'Error loading verification details');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    setError(null);

    try {
      const res = await fetch(`/api/websites/${websiteId}/verification/verify`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success && data.data?.is_verified) {
        setVerifyResult({
          success: true,
          message: data.data.message || 'Domain successfully verified.',
          verified_method: data.data.verification_method
        });

        // Update Redux store
        dispatch(setWebsiteVerified({
          websiteId,
          is_verified: true,
          verified_at: data.data.verified_at,
          verification_method: data.data.verification_method
        }));

        if (onVerifiedSuccess) {
          onVerifiedSuccess();
        }

        // Refresh verification info
        fetchVerificationInfo();
      } else {
        setVerifyResult({
          success: false,
          message: data.data?.message || data.error || 'Verification check could not confirm domain ownership.'
        });
      }
    } catch (err: any) {
      setVerifyResult({
        success: false,
        message: err.message || 'Network error during verification request.'
      });
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen) return null;

  const currentVerified = info?.is_verified ?? isVerified;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-background border border-border/60 shadow-2xl flex flex-col rounded-none overflow-hidden max-h-[90vh]">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-none border border-border/60 bg-muted/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase">
                  Domain Verification
                </h3>
                {currentVerified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Pending Verification
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

        {/* MODAL CONTENT */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-foreground" />
              <span className="text-xs font-mono">Generating domain verification challenge...</span>
            </div>
          ) : error ? (
            <div className="p-4 border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {currentVerified ? (
                <div className="p-5 border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Domain Ownership Confirmed</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This domain has been authenticated. You can now issue official trust badges, schedule recurring compliance scans, and download attestation deliverables.
                  </p>
                  {info?.verified_at && (
                    <div className="text-[11px] font-mono text-muted-foreground pt-1 border-t border-emerald-500/20 flex items-center justify-between">
                      <span>Method: {info.verification_method || 'DNS TXT'}</span>
                      <span>Verified: {new Date(info.verified_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                    Verify ownership of <span className="font-mono text-foreground font-medium">{domain}</span> to activate live embeddable security trust seals and unlock cyber insurance export certifications.
                  </p>

                  {/* METHOD TABS */}
                  <div className="flex border-b border-border/40 mb-5">
                    <button
                      onClick={() => setActiveTab('dns')}
                      className={`pb-2.5 px-4 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 -mb-px cursor-pointer flex items-center gap-2 ${
                        activeTab === 'dns'
                          ? 'border-foreground text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      DNS TXT Record
                      <span className="text-[9px] font-mono px-1 py-0.2 bg-muted/40 text-muted-foreground border border-border/30">
                        Recommended
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab('meta')}
                      className={`pb-2.5 px-4 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 -mb-px cursor-pointer flex items-center gap-2 ${
                        activeTab === 'meta'
                          ? 'border-foreground text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      HTML Meta Tag
                    </button>

                    <button
                      onClick={() => setActiveTab('file')}
                      className={`pb-2.5 px-4 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 -mb-px cursor-pointer flex items-center gap-2 ${
                        activeTab === 'file'
                          ? 'border-foreground text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Server className="w-3.5 h-3.5" />
                      Well-Known File
                    </button>
                  </div>

                  {/* TAB 1: DNS TXT */}
                  {activeTab === 'dns' && info && (
                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground">
                        Add the following TXT record to your DNS management console (e.g. Cloudflare, Route53, Namecheap, GoDaddy):
                      </p>

                      <div className="space-y-3 bg-muted/10 border border-border/40 p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                          <span className="text-xs font-mono text-muted-foreground">Record Type</span>
                          <span className="sm:col-span-3 font-mono text-xs font-semibold text-foreground">TXT</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                          <span className="text-xs font-mono text-muted-foreground">Host / Name</span>
                          <div className="sm:col-span-3 flex items-center justify-between bg-background border border-border/40 px-2.5 py-1.5">
                            <code className="text-xs font-mono text-foreground truncate">{info.instructions.dns.host}</code>
                            <button
                              onClick={() => copyToClipboard(info.instructions.dns.host, 'host')}
                              className="ml-2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                              title="Copy Host"
                            >
                              {copiedKey === 'host' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                          <span className="text-xs font-mono text-muted-foreground">Record Value</span>
                          <div className="sm:col-span-3 flex items-center justify-between bg-background border border-border/40 px-2.5 py-1.5">
                            <code className="text-xs font-mono text-foreground break-all">{info.instructions.dns.value}</code>
                            <button
                              onClick={() => copyToClipboard(info.instructions.dns.value, 'value')}
                              className="ml-2 text-muted-foreground hover:text-foreground p-1 shrink-0 cursor-pointer"
                              title="Copy Value"
                            >
                              {copiedKey === 'value' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                          <span className="text-xs font-mono text-muted-foreground">TTL</span>
                          <span className="sm:col-span-3 font-mono text-xs text-muted-foreground">300 (or Auto)</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-mono">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>DNS changes usually take 1-3 minutes to propagate.</span>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: HTML META TAG */}
                  {activeTab === 'meta' && info && (
                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground">
                        Insert this <code className="text-foreground font-mono">&lt;meta&gt;</code> tag into the <code className="text-foreground font-mono">&lt;head&gt;</code> section of your homepage HTML:
                      </p>

                      <div className="bg-muted/10 border border-border/40 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono uppercase text-muted-foreground">HTML Snippet</span>
                          <button
                            onClick={() => copyToClipboard(info.instructions.meta.tag, 'meta')}
                            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-mono cursor-pointer"
                          >
                            {copiedKey === 'meta' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>Copy Tag</span>
                          </button>
                        </div>
                        <div className="bg-background border border-border/40 p-3 overflow-x-auto">
                          <code className="text-xs font-mono text-foreground whitespace-pre">
                            {info.instructions.meta.tag}
                          </code>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: WELL-KNOWN FILE */}
                  {activeTab === 'file' && info && (
                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground">
                        Upload a plain text file containing your token to the following public URL on your domain:
                      </p>

                      <div className="bg-muted/10 border border-border/40 p-4 space-y-3">
                        <div>
                          <span className="text-[11px] font-mono text-muted-foreground block mb-1">File Location:</span>
                          <div className="bg-background border border-border/40 px-3 py-2">
                            <code className="text-xs font-mono text-foreground break-all">{info.instructions.file.url}</code>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-mono text-muted-foreground">Exact File Content:</span>
                            <button
                              onClick={() => copyToClipboard(info.instructions.file.content, 'fileContent')}
                              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-mono cursor-pointer"
                            >
                              {copiedKey === 'fileContent' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>Copy Content</span>
                            </button>
                          </div>
                          <div className="bg-background border border-border/40 px-3 py-2">
                            <code className="text-xs font-mono text-foreground break-all">{info.instructions.file.content}</code>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VERIFICATION FEEDBACK */}
                  {verifyResult && (
                    <div className={`p-4 border text-xs flex items-start gap-2.5 ${
                      verifyResult.success
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      {verifyResult.success ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-medium">{verifyResult.success ? 'Verified!' : 'Verification Pending'}</div>
                        <div className="mt-0.5 opacity-90 leading-relaxed">{verifyResult.message}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-border/40 bg-muted/10 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border/50 text-foreground hover:bg-muted/20 text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>

          {!currentVerified && (
            <button
              onClick={handleVerify}
              disabled={verifying || loading || !info}
              className="px-5 py-2 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 text-xs font-medium uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer rounded-none"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Probing DNS / Web...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Verify Domain Now</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
