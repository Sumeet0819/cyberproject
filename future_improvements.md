# Future Improvements & Roadmap

This document outlines features and architectural improvements that are deferred beyond the MVP.

## 1. True Network Isolation (Scanner Service)
- **Current MVP Implementation**: The `scanner/` service runs as a separate Node process on port 6000. It relies on application-level checks (`ssrfGuard.ts`) to resolve IP addresses and block private/local ranges.
- **Future Improvement**: Deploy the scanner in a strictly firewalled container (via a dedicated `Dockerfile`) or a separate Virtual Private Cloud (VPC). This ensures network-level isolation where egress to internal RFC 1918 networks or cloud metadata APIs (`169.254.169.254`) is physically impossible, relying on OS-level firewalls (e.g., `iptables`) instead of just application-level safeguards.

## 2. Advanced Security Checks (Headless Browser)
- **Current MVP Implementation**: Security checks like Cookie Hygiene and Tech Detection rely on lightweight, raw HTTP requests (fetching HTML and reading headers) using `fetch` or `axios`.
- **Future Improvement**: Integrate a headless browser (e.g., Puppeteer or Playwright) into the scanner engine. This allows for:
  - Accurate inspection of cookies set via client-side JavaScript.
  - Full DOM rendering to detect single-page application (SPA) vulnerabilities.
  - Capturing visual screenshots for the user's report.
  - Bypassing some anti-bot protections that require JavaScript execution.
