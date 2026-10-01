import { supabaseClient, supabaseAdmin } from '../config/supabase';

interface BadgeOptions {
  theme?: 'dark' | 'light';
  style?: 'shield' | 'compact' | 'pill';
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export const badgeService = {
  /**
   * Fetch public badge data for a given websiteId
   */
  async getWebsiteBadgeData(websiteId: string) {
    const { data: website, error } = await (supabaseAdmin || supabaseClient)
      .from('websites')
      .select('id, domain, score, grade, last_scan_at, is_verified, verified_at')
      .eq('id', websiteId)
      .single();

    if (error || !website) {
      return null;
    }

    return website;
  },

  /**
   * Render dynamic SVG security badge
   */
  renderBadgeSvg(website: any, options: BadgeOptions = {}): string {
    const theme = options.theme === 'light' ? 'light' : 'dark';
    const style = options.style === 'compact' ? 'compact' : options.style === 'pill' ? 'pill' : 'shield';

    const domain = escapeXml(website?.domain || 'unknown');
    const grade = escapeXml(website?.grade || 'A');
    const score = typeof website?.score === 'number' ? website.score : 85;
    const isVerified = !!website?.is_verified;

    // Palette definition
    const isDark = theme === 'dark';
    const bgFill = isDark ? '#09090b' : '#ffffff';
    const borderColor = isDark ? '#27272a' : '#e4e4e7';
    const textColor = isDark ? '#f4f4f5' : '#09090b';
    const mutedTextColor = isDark ? '#a1a1aa' : '#71717a';

    let accentColor = '#10b981'; // Emerald (Grade A)
    let accentBg = isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)';

    if (grade === 'B' || (score >= 70 && score < 85)) {
      accentColor = '#f59e0b'; // Amber
      accentBg = isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)';
    } else if (grade === 'F' || score < 70) {
      accentColor = '#f43f5e'; // Rose
      accentBg = isDark ? 'rgba(244, 63, 94, 0.15)' : 'rgba(244, 63, 94, 0.1)';
    }

    const verificationText = isVerified ? 'VERIFIED' : 'AUDITED';

    // 1. Compact Style (220 x 36)
    if (style === 'compact') {
      return `
<svg xmlns="http://www.w3.org/2000/svg" width="230" height="36" viewBox="0 0 230 36" fill="none">
  <rect x="0.5" y="0.5" width="229" height="35" rx="4" fill="${bgFill}" stroke="${borderColor}"/>
  
  <!-- Shield Icon -->
  <g transform="translate(10, 8)">
    <path d="M10 2L3 5V10C3 14.5 6 18.5 10 20C14 18.5 17 14.5 17 10V5L10 2Z" stroke="${accentColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="${accentBg}"/>
    <path d="M7.5 10.5L9.5 12.5L13 8.5" stroke="${accentColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <!-- Brand Name -->
  <text x="36" y="17" fill="${textColor}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" letter-spacing="-0.2px">CyberHealth</text>
  <text x="36" y="27" fill="${mutedTextColor}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="500">${verificationText}</text>

  <!-- Divider -->
  <line x1="120" y1="8" x2="120" y2="28" stroke="${borderColor}" stroke-width="1"/>

  <!-- Grade Pill -->
  <rect x="130" y="7" width="90" height="22" rx="3" fill="${accentBg}" stroke="${accentColor}" stroke-opacity="0.3"/>
  <text x="140" y="22" fill="${accentColor}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700">GRADE ${grade}</text>
  <text x="192" y="22" fill="${textColor}" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, monospace" font-size="10" font-weight="600">${score}</text>
</svg>
`.trim();
    }

    // 2. Micro Pill Style (180 x 28)
    if (style === 'pill') {
      return `
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="28" viewBox="0 0 180 28" fill="none">
  <rect x="0.5" y="0.5" width="179" height="27" rx="14" fill="${bgFill}" stroke="${borderColor}"/>
  <circle cx="14" cy="14" r="5" fill="${accentColor}"/>
  <text x="26" y="18" fill="${textColor}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="600">CyberHealth</text>
  <text x="96" y="18" fill="${accentColor}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700">Grade ${grade}</text>
  <text x="144" y="18" fill="${mutedTextColor}" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, monospace" font-size="10">${score}</text>
</svg>
`.trim();
    }

    // 3. Shield Hero Style (260 x 74)
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="260" height="74" viewBox="0 0 260 74" fill="none">
  <!-- Outer Card Frame -->
  <rect x="0.5" y="0.5" width="259" height="73" rx="6" fill="${bgFill}" stroke="${borderColor}"/>

  <!-- Accent Indicator Line -->
  <path d="M1 6C1 3.23858 3.23858 1 6 1H254C256.761 1 259 3.23858 259 6V7H1V6Z" fill="${accentColor}"/>

  <!-- Grade Shield Icon Container -->
  <g transform="translate(14, 17)">
    <rect width="40" height="42" rx="4" fill="${accentBg}" stroke="${accentColor}" stroke-opacity="0.4"/>
    <text x="20" y="27" text-anchor="middle" fill="${accentColor}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="800">${grade}</text>
    <text x="20" y="37" text-anchor="middle" fill="${mutedTextColor}" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, monospace" font-size="8" font-weight="600">${score}/100</text>
  </g>

  <!-- Center Text Details -->
  <text x="64" y="29" fill="${mutedTextColor}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="700" letter-spacing="0.5px">${verificationText} &amp; MONITORED</text>
  <text x="64" y="44" fill="${textColor}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" letter-spacing="-0.2px">${domain}</text>
  <text x="64" y="57" fill="${mutedTextColor}" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, monospace" font-size="9">CyberHealth Security Engine</text>

  <!-- Verified Checkmark Badge -->
  ${
    isVerified
      ? `
  <g transform="translate(226, 17)">
    <circle cx="10" cy="10" r="9" fill="${accentBg}" stroke="${accentColor}" stroke-width="1.2"/>
    <path d="M6.5 10L9 12.5L13.5 7.5" stroke="${accentColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`
      : ''
  }
</svg>
`.trim();
  }
};
