export interface ServerPlaybook {
  title: string;
  filename: string;
  language: 'nginx' | 'apache' | 'json' | 'javascript' | 'caddy' | 'dns' | 'shell';
  snippet: string;
  instructions: string;
}

export interface PlaybookCollection {
  check_id: string;
  recommendedStack: 'nginx' | 'apache' | 'cloudflare' | 'nextjs' | 'caddy' | 'dns';
  playbooks: {
    nginx?: ServerPlaybook;
    apache?: ServerPlaybook;
    cloudflare?: ServerPlaybook;
    nextjs?: ServerPlaybook;
    caddy?: ServerPlaybook;
    dns?: ServerPlaybook;
  };
}

export const playbookService = {
  /**
   * Generates actionable server configuration snippets for a given security check
   */
  generatePlaybooks(checkId: string, domain = 'example.com'): PlaybookCollection {
    const normId = checkId.toUpperCase();

    // 1. HSTS (HTTP Strict Transport Security)
    if (normId.includes('HSTS')) {
      return {
        check_id: checkId,
        recommendedStack: 'nginx',
        playbooks: {
          nginx: {
            title: 'Nginx Configuration',
            filename: '/etc/nginx/conf.d/ssl.conf',
            language: 'nginx',
            snippet: 'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;',
            instructions: 'Add inside your `server { listen 443 ssl; ... }` block and run `nginx -t && systemctl reload nginx`.'
          },
          apache: {
            title: 'Apache Configuration',
            filename: '.htaccess or httpd.conf',
            language: 'apache',
            snippet: `<IfModule mod_headers.c>\n  Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"\n</IfModule>`,
            instructions: 'Ensure `mod_headers` is enabled (`a2enmod headers`) and place in your root `.htaccess`.'
          },
          cloudflare: {
            title: 'Cloudflare SSL/TLS',
            filename: 'Cloudflare Dashboard → SSL/TLS → Edge Certificates',
            language: 'json',
            snippet: `{\n  "hsts_enabled": true,\n  "max_age": 31536000,\n  "include_subdomains": true,\n  "preload": true\n}`,
            instructions: 'Enable "HTTP Strict Transport Security (HSTS)" in Cloudflare Dashboard under SSL/TLS.'
          },
          nextjs: {
            title: 'Next.js Security Headers',
            filename: 'next.config.js / next.config.mjs',
            language: 'javascript',
            snippet: `module.exports = {\n  async headers() {\n    return [\n      {\n        source: '/(.*)',\n        headers: [\n          {\n            key: 'Strict-Transport-Security',\n            value: 'max-age=31536000; includeSubDomains; preload'\n          }\n        ]\n      }\n    ];\n  }\n};`,
            instructions: 'Place in your `next.config.js` and redeploy your Next.js application.'
          },
          caddy: {
            title: 'Caddyfile Directive',
            filename: 'Caddyfile',
            language: 'caddy',
            snippet: `header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"`,
            instructions: 'Add inside your site block in `Caddyfile` and run `caddy reload`.'
          }
        }
      };
    }

    // 2. Clickjacking / X-Frame-Options / Frame-Ancestors
    if (normId.includes('CLICKJACKING') || normId.includes('FRAME_OPTIONS')) {
      return {
        check_id: checkId,
        recommendedStack: 'nginx',
        playbooks: {
          nginx: {
            title: 'Nginx Configuration',
            filename: '/etc/nginx/sites-available/default',
            language: 'nginx',
            snippet: `add_header X-Frame-Options "DENY" always;\nadd_header Content-Security-Policy "frame-ancestors 'none';" always;`,
            instructions: 'Append inside your `server { ... }` block to block unauthorized iframe framing.'
          },
          apache: {
            title: 'Apache Directive',
            filename: '.htaccess',
            language: 'apache',
            snippet: `<IfModule mod_headers.c>\n  Header always set X-Frame-Options "DENY"\n  Header always set Content-Security-Policy "frame-ancestors 'none';"\n</IfModule>`,
            instructions: 'Add to `.htaccess` to prevent clickjacking.'
          },
          cloudflare: {
            title: 'Cloudflare Transform Rule',
            filename: 'Rules → Transform Rules → Modify Response Header',
            language: 'json',
            snippet: `{\n  "action": "set",\n  "name": "X-Frame-Options",\n  "value": "DENY"\n}`,
            instructions: 'Create a Response Header Modification rule matching all incoming traffic.'
          },
          nextjs: {
            title: 'Next.js Config',
            filename: 'next.config.js',
            language: 'javascript',
            snippet: `{\n  key: 'X-Frame-Options',\n  value: 'DENY'\n},\n{\n  key: 'Content-Security-Policy',\n  value: "frame-ancestors 'none';"\n}`,
            instructions: 'Include in your `headers()` array in `next.config.js`.'
          },
          caddy: {
            title: 'Caddyfile',
            filename: 'Caddyfile',
            language: 'caddy',
            snippet: `header X-Frame-Options "DENY"\nheader Content-Security-Policy "frame-ancestors 'none';"`,
            instructions: 'Add within your domain block in `Caddyfile`.'
          }
        }
      };
    }

    // 3. Content-Security-Policy (CSP)
    if (normId.includes('CSP') || normId.includes('CONTENT_SECURITY_POLICY')) {
      return {
        check_id: checkId,
        recommendedStack: 'nginx',
        playbooks: {
          nginx: {
            title: 'Nginx CSP Directive',
            filename: '/etc/nginx/conf.d/security.conf',
            language: 'nginx',
            snippet: `add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' https: data:; object-src 'none'; base-uri 'self'; form-action 'self';" always;`,
            instructions: 'Defines an initial secure CSP policy. Tailor script-src for any external analytics or payment scripts.'
          },
          apache: {
            title: 'Apache CSP Header',
            filename: '.htaccess',
            language: 'apache',
            snippet: `<IfModule mod_headers.c>\n  Header always set Content-Security-Policy "default-src 'self'; script-src 'self' https:; object-src 'none'; base-uri 'self';"\n</IfModule>`,
            instructions: 'Add to `.htaccess`. Ensure `mod_headers` is enabled on Apache.'
          },
          nextjs: {
            title: 'Next.js CSP Config',
            filename: 'next.config.js',
            language: 'javascript',
            snippet: `{\n  key: 'Content-Security-Policy',\n  value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:;"\n}`,
            instructions: 'Add into `headers()` in `next.config.js` or set via Next.js Middleware.'
          },
          caddy: {
            title: 'Caddyfile CSP',
            filename: 'Caddyfile',
            language: 'caddy',
            snippet: `header Content-Security-Policy "default-src 'self'; script-src 'self' https:; object-src 'none'; base-uri 'self';"`,
            instructions: 'Add inside your `Caddyfile` definition.'
          }
        }
      };
    }

    // 4. MIME Sniffing / X-Content-Type-Options
    if (normId.includes('MIME') || normId.includes('CONTENT_TYPE_OPTIONS')) {
      return {
        check_id: checkId,
        recommendedStack: 'nginx',
        playbooks: {
          nginx: {
            title: 'Nginx X-Content-Type-Options',
            filename: '/etc/nginx/nginx.conf',
            language: 'nginx',
            snippet: 'add_header X-Content-Type-Options "nosniff" always;',
            instructions: 'Add to your `server` or `http` block in Nginx.'
          },
          apache: {
            title: 'Apache Directive',
            filename: '.htaccess',
            language: 'apache',
            snippet: `<IfModule mod_headers.c>\n  Header always set X-Content-Type-Options "nosniff"\n</IfModule>`,
            instructions: 'Prevent browsers from MIME-sniffing a response away from declared content-type.'
          },
          nextjs: {
            title: 'Next.js Header',
            filename: 'next.config.js',
            language: 'javascript',
            snippet: `{\n  key: 'X-Content-Type-Options',\n  value: 'nosniff'\n}`,
            instructions: 'Add to `headers()` configuration.'
          },
          caddy: {
            title: 'Caddy Directive',
            filename: 'Caddyfile',
            language: 'caddy',
            snippet: 'header X-Content-Type-Options "nosniff"',
            instructions: 'Add to your Caddyfile.'
          }
        }
      };
    }

    // 5. SPF Missing / Email Spoofing
    if (normId.includes('SPF')) {
      return {
        check_id: checkId,
        recommendedStack: 'dns',
        playbooks: {
          dns: {
            title: 'DNS TXT Record (SPF)',
            filename: 'DNS Zone File / Cloudflare DNS / Route53',
            language: 'dns',
            snippet: `Type:  TXT\nHost:  @\nValue: "v=spf1 mx include:_spf.google.com ~all"\nTTL:   300`,
            instructions: 'If not sending email from this domain, publish `"v=spf1 -all"` to completely block spoofing.'
          },
          cloudflare: {
            title: 'Cloudflare DNS Record',
            filename: 'Cloudflare Dashboard → DNS → Records',
            language: 'json',
            snippet: `{\n  "type": "TXT",\n  "name": "@",\n  "content": "v=spf1 ~all",\n  "ttl": 1\n}`,
            instructions: 'Add as a TXT record for the root domain in Cloudflare DNS.'
          }
        }
      };
    }

    // 6. DMARC Missing / Email Authentication
    if (normId.includes('DMARC')) {
      return {
        check_id: checkId,
        recommendedStack: 'dns',
        playbooks: {
          dns: {
            title: 'DNS TXT Record (_dmarc)',
            filename: 'DNS Zone File / Provider Console',
            language: 'dns',
            snippet: `Type:  TXT\nHost:  _dmarc\nValue: "v=DMARC1; p=reject; sp=reject; rua=mailto:dmarc-reports@${domain}; adkim=s; aspf=s;"\nTTL:   300`,
            instructions: 'Publish a strict DMARC policy (`p=reject`) on the `_dmarc` subdomain to protect brand reputation.'
          },
          cloudflare: {
            title: 'Cloudflare DMARC Setup',
            filename: 'Cloudflare Dashboard → Email Security → DMARC',
            language: 'json',
            snippet: `{\n  "type": "TXT",\n  "name": "_dmarc",\n  "content": "v=DMARC1; p=quarantine; rua=mailto:security@${domain}",\n  "ttl": 1\n}`,
            instructions: 'Begin with `p=quarantine` while evaluating mail flows, then escalate to `p=reject`.'
          }
        }
      };
    }

    // 7. Cookies (Missing Secure / HttpOnly / SameSite)
    if (normId.includes('COOKIE')) {
      return {
        check_id: checkId,
        recommendedStack: 'nginx',
        playbooks: {
          nginx: {
            title: 'Nginx Cookie Flag Proxy Rewrite',
            filename: '/etc/nginx/conf.d/proxy.conf',
            language: 'nginx',
            snippet: `proxy_cookie_flags ~* samesite=lax secure httponly;`,
            instructions: 'Supported in Nginx 1.19.3+. Automatically appends Secure, HttpOnly, and SameSite flags to upstream cookies.'
          },
          apache: {
            title: 'Apache Cookie Flag Rewrite',
            filename: '.htaccess',
            language: 'apache',
            snippet: `<IfModule mod_headers.c>\n  Header edit Set-Cookie ^(.*)$ "$1; Secure; HttpOnly; SameSite=Lax"\n</IfModule>`,
            instructions: 'Ensures cookies issued by backend application have security flags appended.'
          },
          nextjs: {
            title: 'Next.js / Node.js Cookie Config',
            filename: 'app/api/auth/route.ts or middleware.ts',
            language: 'javascript',
            snippet: `cookies().set('sessionId', token, {\n  httpOnly: true,\n  secure: process.env.NODE_ENV === 'production',\n  sameSite: 'lax',\n  path: '/',\n  maxAge: 60 * 60 * 24 * 7 // 1 week\n});`,
            instructions: 'Configure these options in your backend session / cookie issuing controller.'
          }
        }
      };
    }

    // 8. Exposed Files (.env, .git, backups)
    if (normId.includes('EXPOSED') || normId.includes('ENV') || normId.includes('GIT')) {
      return {
        check_id: checkId,
        recommendedStack: 'nginx',
        playbooks: {
          nginx: {
            title: 'Nginx Block Hidden & Sensitive Files',
            filename: '/etc/nginx/sites-available/default',
            language: 'nginx',
            snippet: `location ~ /\\.(?!well-known) {\n  deny all;\n  return 404;\n}\n\nlocation ~* (\\.(env|git|sql|bak|config|yml|yaml|tar|gz)|composer\\.(json|lock)|package\\.(json|lock))$ {\n  deny all;\n  return 404;\n}`,
            instructions: 'Add to your Nginx `server` configuration to return 404 for sensitive extensions.'
          },
          apache: {
            title: 'Apache Block Directive',
            filename: '.htaccess',
            language: 'apache',
            snippet: `<FilesMatch "^\\.env|\\.git|\\.sql|\\.bak|composer\\.json">\n  Require all denied\n</FilesMatch>`,
            instructions: 'Place in root `.htaccess` to disallow public HTTP access.'
          },
          caddy: {
            title: 'Caddyfile Deny Rule',
            filename: 'Caddyfile',
            language: 'caddy',
            snippet: `@hiddenFiles path */.* *.env *.sql *.bak\nerror @hiddenFiles 404`,
            instructions: 'Add to your Caddyfile.'
          }
        }
      };
    }

    // 9. Mixed Content (HTTP links inside HTTPS)
    if (normId.includes('MIXED_CONTENT')) {
      return {
        check_id: checkId,
        recommendedStack: 'nginx',
        playbooks: {
          nginx: {
            title: 'Nginx CSP Upgrade Insecure Requests',
            filename: '/etc/nginx/conf.d/security.conf',
            language: 'nginx',
            snippet: `add_header Content-Security-Policy "upgrade-insecure-requests;" always;`,
            instructions: 'Instructs client browsers to automatically rewrite all `http://` image and script URLs to `https://`.'
          },
          cloudflare: {
            title: 'Cloudflare Automatic HTTPS Rewrites',
            filename: 'Cloudflare Dashboard → SSL/TLS → Edge Certificates',
            language: 'json',
            snippet: `{\n  "automatic_https_rewrites": "on",\n  "always_use_https": "on"\n}`,
            instructions: 'Enable "Automatic HTTPS Rewrites" to transparently fix mixed content without code changes.'
          },
          apache: {
            title: 'Apache Upgrade Header',
            filename: '.htaccess',
            language: 'apache',
            snippet: `<IfModule mod_headers.c>\n  Header always set Content-Security-Policy "upgrade-insecure-requests;"\n</IfModule>`,
            instructions: 'Add to `.htaccess`.'
          }
        }
      };
    }

    // Fallback Generic Security Header
    return {
      check_id: checkId,
      recommendedStack: 'nginx',
      playbooks: {
        nginx: {
          title: 'Nginx Security Header',
          filename: '/etc/nginx/nginx.conf',
          language: 'nginx',
          snippet: `# Consult specific security header recommendations in finding description`,
          instructions: 'Review server configuration guidelines for this control.'
        },
        apache: {
          title: 'Apache Security Header',
          filename: '.htaccess',
          language: 'apache',
          snippet: `# Review Apache mod_headers configuration`,
          instructions: 'Add appropriate Header always set directive.'
        }
      }
    };
  }
};
