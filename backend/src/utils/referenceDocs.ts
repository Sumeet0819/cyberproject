export interface ReferenceDoc {
  title: string;
  url: string;
  publisher: string;
}

export const REFERENCE_DOCS: Record<string, ReferenceDoc[]> = {
  HSTS_MISSING: [
    {
      title: 'Strict-Transport-Security',
      url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security',
      publisher: 'MDN Web Docs'
    },
    {
      title: 'HTTP Strict Transport Security Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html',
      publisher: 'OWASP'
    }
  ],
  CLICKJACKING_PROTECTION_MISSING: [
    {
      title: 'Clickjacking Defense Cheat Sheet',
      url: 'https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html',
      publisher: 'OWASP'
    },
    {
      title: 'X-Frame-Options',
      url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options',
      publisher: 'MDN Web Docs'
    }
  ],
  EXPOSED_ENV_FILE: [
    {
      title: 'Information Exposure',
      url: 'https://cwe.mitre.org/data/definitions/200.html',
      publisher: 'MITRE CWE'
    }
  ],
  EXPOSED_GIT_CONFIG: [
    {
      title: 'Source Code Disclosure',
      url: 'https://owasp.org/www-community/Source_Code_Disclosure',
      publisher: 'OWASP'
    }
  ]
};

export function getReferenceDocs(checkId: string): ReferenceDoc[] {
  return REFERENCE_DOCS[checkId] || [];
}
