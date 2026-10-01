# Small Business Website Security Health Check

## Product Requirements Document (PRD)

**Document status:** MVP Planning / Architecture Locked\
**Project type:** 30-Day Product Challenge\
**Primary audience:** Small-business owners and non-security experts\
**Initial product:** Web-based website security health check\
**Last updated:** September 2026

------------------------------------------------------------------------

# 1. Product Overview

The product is an affordable, simple website security health-check
application designed for small businesses that do not have dedicated
cybersecurity expertise.

A user enters or registers a website, runs a scan, receives a security
score, sees the most important issues, understands why they matter, and
gets practical guidance on how to fix them.

The core product flow is:

> **Enter website → Scan → Get security score → See top risks →
> Understand them → Follow the fix → Rescan**

The product is not intended to invent a new vulnerability scanner.
Existing security engines and databases already provide much of the raw
detection capability.

The product opportunity is to combine security checks with:

-   Simple explanations
-   Risk prioritization
-   Confidence/evidence
-   Actionable remediation guidance
-   A business-friendly security score
-   Scan history
-   A simple user experience
-   Eventually, continuous monitoring

------------------------------------------------------------------------

# 2. Problem Statement

Small businesses often have websites and online services but do not have
cybersecurity specialists who can continuously assess their security
posture.

Existing security tools can be:

-   Too technical
-   Difficult to interpret
-   Fragmented across multiple tools
-   Expensive for small businesses
-   Focused on security professionals rather than business owners
-   Poor at explaining what should be fixed first

The product aims to simplify external website security scanning into an
affordable, one-click security health check.

### Refined Product Question

> How can automated external security scanning be simplified into an
> affordable, one-click security health check that enables small
> businesses without cybersecurity expertise to identify, understand,
> prioritize, and remediate common website security risks?

------------------------------------------------------------------------

# 3. Product Goals

The product should achieve four primary outcomes:

## 3.1 Detect

Identify common externally observable website and domain security
issues.

## 3.2 Explain

Translate technical findings into language a non-security expert can
understand.

## 3.3 Prioritize

Tell the user which problems matter most and what should be fixed first.

## 3.4 Remediate

Provide practical instructions or recommendations for fixing the
identified issue.

------------------------------------------------------------------------

# 4. Target Users

## Primary User

Small-business owners or operators who:

-   Own or manage a website
-   Have limited cybersecurity knowledge
-   Want to know whether their website has obvious security problems
-   Need simple explanations
-   Need practical next steps
-   Cannot afford or do not need a full enterprise security team

## Secondary User

Developers, freelancers, agencies, and technical operators who manage
websites for small businesses.

They may use the product to:

-   Quickly audit a website
-   Generate a security report
-   Identify configuration problems
-   Verify that fixes have been applied
-   Track security posture over time

------------------------------------------------------------------------

# 5. Core User Journey

``` text
User
  |
  v
Register / Login
  |
  v
Dashboard
  |
  v
Add Website
  |
  v
Start Scan
  |
  v
Scanner Engine
  |
  +--> HTTPS
  +--> TLS
  +--> Certificate
  +--> Security Headers
  +--> Cookies
  +--> DNS
  +--> SPF / DKIM / DMARC
  +--> Exposed Files
  +--> Technology / CMS Detection
  +--> Known Vulnerability Correlation
  +--> Reputation / Malware Indicators
  |
  v
Normalize Findings
  |
  v
Calculate Severity + Confidence
  |
  v
Calculate Security Score
  |
  v
Prioritize Findings
  |
  v
Generate Explanations + Recommendations
  |
  v
Security Report
  |
  v
User Fixes Issues
  |
  v
Rescan
```

------------------------------------------------------------------------

# 6. MVP Scope

The initial MVP will focus on externally observable and relatively safe
checks.

## 6.1 HTTPS

Check whether:

-   HTTPS is available
-   HTTP redirects to HTTPS
-   HTTPS is consistently used

## 6.2 TLS

Check relevant TLS configuration, including:

-   Supported protocol versions
-   Weak or outdated protocol configuration
-   Basic cryptographic configuration where practical

## 6.3 TLS Certificates

Check:

-   Certificate validity
-   Expiration
-   Hostname/domain matching
-   Certificate chain problems
-   Basic certificate configuration

Modern terminology should refer to TLS certificates/X.509 certificates
rather than treating SSL as the current protocol.

## 6.4 Security Headers

Potential checks include:

-   Strict-Transport-Security
-   Content-Security-Policy
-   X-Content-Type-Options
-   X-Frame-Options or equivalent frame protection
-   Referrer-Policy
-   Permissions-Policy
-   Other useful modern security headers

## 6.5 Cookies

Check security attributes such as:

-   Secure
-   HttpOnly
-   SameSite
-   Appropriate cookie prefixes where applicable

## 6.6 SPF / DKIM / DMARC

Check email-domain security configuration.

Potential checks:

-   SPF record exists and is valid
-   DKIM configuration where discoverable
-   DMARC record exists
-   DMARC policy strength/configuration
-   Basic configuration mistakes

## 6.7 DNS

Potential checks:

-   A records
-   AAAA records
-   CNAME
-   MX
-   TXT
-   NS
-   SOA
-   CAA
-   DNSSEC where practical
-   Basic suspicious/misconfiguration indicators

Subdomain takeover indicators may be considered later and must be
handled carefully.

## 6.8 Exposed Files

Look for carefully selected common exposure indicators, such as:

-   Backup files
-   Old files
-   Unreferenced files
-   Configuration exposure indicators
-   Sensitive file extensions

Only safe, non-destructive checks should be used.

## 6.9 Technology / CMS Detection

Identify publicly observable technologies such as:

-   Web server
-   Framework
-   CMS
-   JavaScript frameworks
-   Common platform fingerprints

The result should help identify outdated or risky technology where
reliable evidence exists.

## 6.10 Known Vulnerabilities

Correlate detected technology/version information with vulnerability
information.

Potential data sources/concepts:

-   CVE
-   CPE
-   CWE
-   CVSS
-   NVD
-   CISA Known Exploited Vulnerabilities

The MVP should prioritize high-confidence correlations rather than
attempting aggressive exploitation.

## 6.11 Reputation / Malware Indicators

Check available reputation or threat-intelligence signals.

Potential sources can include:

-   Google Safe Browsing / Web Risk
-   Other appropriately licensed reputation/threat-intelligence services

Licensing, API limits, commercial-use restrictions, and data quality
must be evaluated before production use.

------------------------------------------------------------------------

# 7. Finding Model

A security check and a finding are different concepts.

### Check

A test performed by the scanner.

Example:

``` text
Security Headers Check
```

### Finding

A problem discovered by the check.

Example:

``` text
Missing HSTS
Missing CSP
Missing X-Content-Type-Options
```

Conceptually:

``` text
Scan
 |
 +-- Check: HTTPS
 |     |
 |     +-- Finding
 |
 +-- Check: Security Headers
 |     |
 |     +-- Finding
 |     +-- Finding
 |     +-- Finding
 |
 +-- Check: DNS
       |
       +-- Finding
```

------------------------------------------------------------------------

# 8. Standard Finding Structure

Scanner checks should return a standardized result instead of directly
writing arbitrary data to the database.

Example conceptual result:

``` json
{
  "check": "https",
  "status": "failed",
  "severity": "high",
  "confidence": 0.98,
  "title": "HTTPS is not properly configured",
  "evidence": "...",
  "explanation": "...",
  "recommendation": "...",
  "timestamp": "..."
}
```

Recommended finding attributes include:

-   Check identifier
-   Status
-   Title
-   Description
-   Severity
-   Confidence
-   Evidence
-   Detection method
-   Timestamp
-   Scanner version
-   Recommendation
-   Verification guidance

------------------------------------------------------------------------

# 9. Security Score

The product should turn individual findings into an understandable
overall security score.

Example:

``` text
Security Score

72 / 100

Needs Attention

Critical: 1
High:     2
Medium:   4
Low:      3
```

The exact scoring algorithm will be designed separately.

The scoring system should eventually consider factors such as:

-   Severity
-   Confidence
-   Exploitability
-   Exposure
-   Potential business impact

The score must not imply that a website is completely secure.

Preferred wording:

> "No issues detected in the checks we performed."

Avoid:

> "Your website is completely secure."

------------------------------------------------------------------------

# 10. Security Report UX

The report should have three levels of detail.

## Level 1 --- Business Summary

Example:

``` text
Your Security Score

72 / 100

Needs Attention

3 important issues need your attention.
```

## Level 2 --- Prioritized Issues

``` text
Critical
1 issue

High
2 issues

Medium
4 issues

Low
3 issues
```

Then show the top priorities:

``` text
1. Critical
   Vulnerability detected

2. High
   Missing DMARC policy

3. High
   Sensitive file exposure
```

## Level 3 --- Technical Details

Example:

``` text
Missing HSTS

Severity
HIGH

Confidence
98%

What we found
The server does not return a
Strict-Transport-Security header.

Why this matters
...

How to fix it
...

Technical evidence
...

[Rescan]
```

This allows the product to remain understandable to business owners
while still providing useful information to technical users.

------------------------------------------------------------------------

# 11. Architecture

The MVP architecture is intentionally simple.

``` text
                         USER
                           |
                           v
                    +-------------+
                    |   Next.js   |
                    |   Frontend  |
                    +------+------+
                           |
                         REST
                           |
                           v
                    +-------------+
                    |   Express   |
                    |   Backend   |
                    +------+------+
                           |
             +-------------+-------------+
             |             |             |
             v             v             v
          Prisma        Scanner       Business
             |           Engine        Logic
             |             |
             v             v
        Supabase       Security
        PostgreSQL      Checks
                           |
                           v
                     Target Website
```

------------------------------------------------------------------------

# 12. Technology Stack

## Frontend

### Next.js

Used for the web application and user interface.

### TypeScript

Used across the frontend for type safety.

### Tailwind CSS

Used for styling.

### shadcn/ui

Used for reusable UI components.

### Redux Toolkit

Used for client-side application state.

Redux should not become the source of truth for database data.

Appropriate Redux state may include:

-   Auth/user state
-   Current scan state
-   Scan progress
-   Dashboard filters
-   UI preferences

Persistent business data remains in the backend/database.

------------------------------------------------------------------------

# 13. Backend

## Node.js

Runtime for the backend.

## Express.js

REST API framework.

## TypeScript

Used throughout the backend.

The backend will handle:

-   Authentication
-   User management
-   Website management
-   Scan management
-   Scanner orchestration
-   Finding normalization
-   Risk scoring
-   Report generation
-   Recommendations
-   Database access

------------------------------------------------------------------------

# 14. Database

## Supabase PostgreSQL

The MVP will use Supabase as the managed database platform.

Supabase uses PostgreSQL underneath, so the application is being
designed around PostgreSQL rather than a proprietary database model.

The application should use Prisma as the database ORM.

Potential future migration:

``` text
MVP

Prisma
  |
Supabase PostgreSQL


Future

Prisma
  |
PostgreSQL provider
```

The application should avoid unnecessary Supabase-specific database
assumptions so that migration remains straightforward.

------------------------------------------------------------------------

# 15. Initial Database Relationship

The basic relationship is:

``` text
USER
 |
 +------< WEBSITE
             |
             +------< SCAN
                         |
                         +------< FINDING
```

Meaning:

-   One user can have many websites.
-   One website can have many scans.
-   One scan can have many findings.

The detailed schema will be designed after this PRD.

------------------------------------------------------------------------

# 16. Authentication Architecture

The MVP will use:

-   JWT
-   bcrypt
-   Express middleware
-   HttpOnly/Secure cookie for the web session

Authentication flow:

``` text
                         REGISTER
                            |
                 +----------+----------+
                 v                     v
               Email               Password
                                       |
                                       v
                              bcrypt password hash
                                       |
                                       v
                              Store user in DB
                                       |
                                       v
                                Generate JWT
                                       |
                              signed by SERVER
                              JWT secret/key
                                       |
                                       v
                              HttpOnly Cookie
```

## Login Flow

``` text
                         LOGIN
                            |
                 +----------+----------+
                 v                     v
               Email               Password
                 |                     |
                 v                     v
            Find user          bcrypt.compare()
                 |                     |
                 +----------+----------+
                            |
                     Credentials?
                      /          \
                    NO            YES
                    |              |
                    v              v
             Invalid login     Generate JWT
                                      |
                                      v
                              Server signs JWT
                                      |
                                      v
                              HttpOnly Cookie
```

## Protected API Flow

``` text
Browser
   |
   | JWT Cookie
   v
Express
   |
   v
Read JWT
   |
   v
Verify JWT with server secret/key
   |
   +---- Invalid --> 401
   |
   +---- Valid
          |
          v
       Extract userId
          |
          v
     API operation
```

### Important JWT concept

A JWT payload may contain:

``` json
{
  "id": "user-id"
}
```

The user ID is part of the payload.

It is NOT the secret used to sign the token.

The server signs the JWT using a server-side secret/key:

``` js
const token = jwt.sign(
  { id: user._id },
  process.env.JWT_SECRET
);
```

Conceptually:

``` text
user._id
   |
   v
JWT payload
   |
   +---- JWT_SECRET ---> Server signs token
                            |
                            v
                         JWT token
```

The JWT is later verified using the server's signing secret/key.

------------------------------------------------------------------------

# 17. Password Security

Passwords must never be stored as plaintext.

Registration:

``` text
Plain password
      |
      v
bcrypt.hash()
      |
      v
Password hash
      |
      v
Database
```

Login:

``` text
Entered password
      |
      v
bcrypt.compare()
      |
      v
Stored password hash
      |
      v
Valid / Invalid
```

bcrypt is used for password hashing, not encryption.

------------------------------------------------------------------------

# 18. Initial API Architecture

The initial REST API can follow this structure:

``` text
/api
|
+-- /auth
|     |
|     +-- POST /register
|     +-- POST /login
|     +-- POST /logout
|
+-- /websites
|     |
|     +-- GET /
|     +-- POST /
|     +-- GET /:id
|     +-- DELETE /:id
|
+-- /scans
|     |
|     +-- POST /
|     +-- GET /:id
|     +-- GET /:id/results
|
+-- /findings
      |
      +-- GET /:id
```

The exact API contract will be finalized during implementation.

------------------------------------------------------------------------

# 19. Scanner Architecture

The scanner should be modular from the beginning.

Recommended conceptual structure:

``` text
scanner/
|
+-- engine/
|     +-- scanner.ts
|     +-- context.ts
|     +-- types.ts
|
+-- checks/
|     +-- https/
|     +-- tls/
|     +-- certificate/
|     +-- headers/
|     +-- cookies/
|     +-- dns/
|     +-- email-security/
|     +-- exposed-files/
|     +-- technology/
|     +-- vulnerabilities/
|     +-- reputation/
|
+-- scoring/
|     +-- severity.ts
|     +-- confidence.ts
|     +-- score.ts
|
+-- reporting/
      +-- formatter.ts
      +-- recommendations.ts
```

Each check should follow a common pattern:

``` text
Target
  |
  v
Check
  |
  v
Evidence
  |
  v
Finding
  |
  v
Severity
  |
  v
Recommendation
```

------------------------------------------------------------------------

# 20. Scanner Execution --- MVP

For the first version, scans can run synchronously or through a simple
backend flow.

Conceptually:

``` text
POST /scans
      |
      v
Create scan
      |
      v
Run scanner
      |
      v
Execute checks
      |
      v
Store results
      |
      v
Return report
```

This is intentionally simple for the 30-day MVP.

------------------------------------------------------------------------

# 21. Future Scanner Architecture

Background processing will be added later.

Future flow:

``` text
POST /scans
      |
      v
Create scan
      |
      v
Queue job
      |
      v
Background worker
      |
      v
Scanner engine
      |
      v
Store results
      |
      v
Update scan status
```

Potential future architecture:

``` text
Next.js
   |
Express
   |
Redis
   |
Background Jobs
   |
+-------------------+
| Scanner Workers   |
+-------------------+
   |
PostgreSQL
```

The scanner should therefore be designed now as an independent module so
that it can later be moved into workers without rewriting its core
logic.

------------------------------------------------------------------------

# 22. Future Infrastructure

The following are intentionally postponed:

-   Redis
-   Background jobs
-   Docker
-   Reverse proxy
-   Dedicated scanner workers
-   Advanced scaling infrastructure

They will be introduced when the product needs them.

## Future Production Architecture

``` text
                    Internet
                       |
                 Reverse Proxy
                       |
                 +-----+-----+
                 |           |
              Next.js     Express
                             |
                           Redis
                             |
                    Background Jobs
                             |
                    +--------+--------+
                    |                 |
              Scanner Worker    Scanner Worker
                    |                 |
                    +--------+--------+
                             |
                         PostgreSQL
```

------------------------------------------------------------------------

# 23. Security Architecture Requirements

Because this application itself performs security scanning, its own
security is critical.

## Authorization

Only scan assets that the user is authorized to scan.

The product should clearly communicate that users must have permission
to scan a target.

## SSRF Protection

The scanner must protect against requests to:

-   Localhost
-   Private IP ranges
-   Link-local addresses
-   Cloud metadata endpoints
-   Other reserved/internal destinations

## DNS Rebinding Protection

Target resolution must be validated carefully so that a domain cannot
resolve to an internal address after initial validation.

## Redirect Validation

Redirects must be validated and should not bypass target restrictions.

## Rate Limits

Apply limits to:

-   User requests
-   Scan frequency
-   Requests sent to targets
-   Concurrent checks

## Timeouts

Every external request should have reasonable:

-   Connection timeout
-   Read timeout
-   Overall scan timeout

## Response Size Limits

Do not allow a target to cause unlimited data retrieval.

## Concurrency Limits

Limit simultaneous requests to avoid accidental denial-of-service
behavior.

## Isolation

When active or third-party scanner tools are eventually integrated, they
should be isolated from the main API environment.

## Data Minimization

Store only the information required for:

-   Results
-   Reports
-   Scan history
-   Debugging
-   Security/audit requirements

## No Destructive Testing

The MVP should not perform:

-   Brute-force attacks
-   Credential attacks
-   Denial-of-service tests
-   Data modification
-   Destructive exploitation
-   Destructive vulnerability validation

------------------------------------------------------------------------

# 24. False Positives and False Negatives

Scanner results will not always be perfect.

Every finding should ideally have:

-   Detection method
-   Evidence
-   Confidence
-   Timestamp
-   Scanner version
-   Recommendation
-   Verification guidance

The system should avoid presenting uncertain results as absolute facts.

Example:

Instead of:

> "Your website is vulnerable."

Prefer:

> "We detected a configuration that may expose your website to this
> risk."

when confidence is not sufficient for a definitive conclusion.

------------------------------------------------------------------------

# 25. User Interface Structure

Initial pages:

``` text
/
|
+-- Landing Page
|
+-- /login
|
+-- /register
|
+-- /dashboard
|
+-- /scan
|
+-- /scan/[id]
|
+-- /reports/[id]
|
+-- /settings
```

------------------------------------------------------------------------

# 26. Dashboard

Initial dashboard concept:

``` text
+---------------------------------------------+
| Security Dashboard                     User |
+---------------------------------------------+
|                                             |
| Your Websites                     [+ Add]  |
|                                             |
| +-----------------------------------------+ |
| | mybusiness.com                          | |
| |                                         | |
| | Security Score              72 / 100    | |
| |                                         | |
| | Last scan: Today                        | |
| |                                         | |
| | Critical 1   High 2   Medium 4          | |
| |                                         | |
| | [View Report]     [Scan Again]           | |
| +-----------------------------------------+ |
|                                             |
+---------------------------------------------+
```

------------------------------------------------------------------------

# 27. Scan Progress

The UI should eventually show individual check progress.

Example:

``` text
Scanning...

✓ HTTPS
✓ TLS
✓ Certificate
✓ Security Headers
✓ Cookies
⏳ DNS
○ Vulnerabilities
○ Reputation
```

Even though the first MVP may execute scans synchronously, the UI should
be designed so that it can later support asynchronous/background scans.

------------------------------------------------------------------------

# 28. Product Differentiation

The product is not differentiated by simply running an existing
vulnerability scanner.

The differentiation is:

``` text
Raw Security Data
       |
       v
Normalization
       |
       v
Risk Intelligence
       |
       v
Prioritization
       |
       v
Plain-language Explanation
       |
       v
Actionable Fix
       |
       v
Rescan / Verification
```

The goal is to answer:

> "What is wrong, how serious is it, why should I care, and what should
> I do next?"

------------------------------------------------------------------------

# 29. Research Foundation

The main security research areas studied for the product are:

-   HTTPS
-   TLS
-   TLS certificates
-   Security headers
-   Cookies
-   SPF
-   DKIM
-   DMARC
-   DNS
-   Exposed files
-   Technology/CMS detection
-   Known vulnerabilities
-   CVE/CVSS/CPE/CWE
-   CISA KEV
-   Reputation and malware indicators
-   False positives/negatives
-   Safe scanning
-   SSRF and DNS rebinding
-   Rate limiting and scan isolation

Important standards/resources studied include:

-   OWASP Web Security Testing Guide
-   OWASP Secure Headers Project
-   NIST TLS guidance
-   MDN web security documentation
-   RFC 7208 --- SPF
-   RFC 6376 --- DKIM
-   RFC 7489 --- DMARC
-   CISA Known Exploited Vulnerabilities Catalog
-   NVD/CVE ecosystem
-   Google Safe Browsing / Web Risk

------------------------------------------------------------------------

# 30. Existing Security Tools and Services

The product can eventually integrate or use existing security
capabilities where appropriate.

Potential tools/services include:

-   Nuclei
-   OWASP ZAP
-   Nmap
-   Nikto
-   Mozilla Observatory
-   Qualys SSL Labs
-   Google Safe Browsing / Web Risk
-   Have I Been Pwned
-   NVD
-   CISA KEV

The product should not blindly depend on all of these.

Each integration should be evaluated based on:

-   Accuracy
-   False-positive rate
-   False-negative risk
-   Evidence quality
-   API availability
-   Licensing
-   Commercial-use restrictions
-   Rate limits
-   Scan duration
-   Safety
-   Maintenance requirements

------------------------------------------------------------------------

# 31. MVP Development Strategy

The project should be built incrementally.

## Phase 1 --- Foundation

Build:

-   Next.js application
-   Express API
-   TypeScript setup
-   Supabase PostgreSQL
-   Prisma
-   Authentication
-   Basic dashboard
-   Website management

## Phase 2 --- Scanner

Implement the initial checks:

1.  HTTPS
2.  TLS
3.  Certificate
4.  Security headers
5.  Cookies
6.  DNS
7.  SPF/DKIM/DMARC
8.  Technology detection

## Phase 3 --- Intelligence

Add:

-   Finding normalization
-   Severity
-   Confidence
-   Score
-   Prioritization
-   Plain-language explanations
-   Recommendations

## Phase 4 --- Advanced Checks

Add carefully selected:

-   Exposed file checks
-   Vulnerability correlation
-   Reputation/malware indicators

## Phase 5 --- Productization

Add:

-   Better report UX
-   Scan history
-   Rescan
-   Error handling
-   Security hardening
-   Performance improvements

## Phase 6 --- Infrastructure

Only after the MVP requires it:

-   Redis
-   Background jobs
-   Docker
-   Reverse proxy
-   Scanner workers
-   Scaling

------------------------------------------------------------------------

# 32. Architecture Principles

The following principles should guide implementation.

### Keep the MVP simple

Do not introduce infrastructure before it is needed.

### Keep scanner modules independent

Every check should be replaceable or extendable.

### Separate detection from presentation

Scanner code should produce structured findings.

The frontend should not contain security-detection logic.

### Separate scoring from detection

A check should report what it found.

A scoring layer should decide how important it is.

### Evidence-based findings

Every important finding should have supporting evidence.

### Don't claim absolute security

The application reports on the checks it performed.

### Design for migration

Use PostgreSQL-compatible architecture and Prisma so the database can
move from Supabase to another PostgreSQL provider later.

### Design for asynchronous execution

Even if scans initially run synchronously, the scanner should be
structured so it can become a background worker later.

------------------------------------------------------------------------

# 33. Current Architecture Decision

The currently agreed MVP stack is:

``` text
Frontend
├── Next.js
├── TypeScript
├── Tailwind CSS
├── shadcn/ui
└── Redux Toolkit

Backend
├── Node.js
├── Express.js
└── TypeScript

Database
├── Supabase
├── PostgreSQL
└── Prisma

Authentication
├── JWT
├── bcrypt
└── HttpOnly/Secure Cookie

API
└── REST
```

Deferred:

``` text
Redis
Background Jobs
Docker
Reverse Proxy
Dedicated Scanner Workers
```

------------------------------------------------------------------------

# 34. Future Authentication

The MVP uses custom JWT-based authentication.

Later, authentication may be migrated to:

-   Google OAuth
-   Clerk
-   Another managed authentication provider

The authentication implementation should therefore be isolated behind
middleware/services so that changing providers does not require
rewriting the application's core business logic.

------------------------------------------------------------------------

# 35. Definition of MVP Success

A user should be able to:

1.  Create an account.
2.  Log in securely.
3.  Add a website.
4.  Start a scan.
5.  Wait for the scan to complete.
6.  Receive a security score.
7.  See the most important findings.
8.  Understand what each finding means.
9.  See evidence supporting the finding.
10. Receive a practical recommendation.
11. Fix the issue.
12. Rescan the website.
13. See whether the issue was resolved.

The MVP succeeds if a non-security expert can complete this process
without needing to understand professional security tooling.

------------------------------------------------------------------------

# 36. Out of Scope for Initial MVP

The initial product will not attempt to provide:

-   Full enterprise penetration testing
-   Guaranteed vulnerability discovery
-   Guaranteed website security
-   Destructive exploitation
-   Credential attacks
-   Brute-force testing
-   Denial-of-service testing
-   Full internal network scanning
-   Full source-code security analysis
-   Full cloud security posture management
-   Complete compliance certification
-   Enterprise SIEM functionality

These may be considered in future versions only if the product direction
requires them.

------------------------------------------------------------------------

# 37. Immediate Next Steps

The architecture is now sufficiently defined to move into implementation
planning.

Recommended next sequence:

``` text
1. Finalize database schema
          |
          v
2. Define Prisma models
          |
          v
3. Define REST API contracts
          |
          v
4. Create Next.js project
          |
          v
5. Create Express backend
          |
          v
6. Connect Supabase PostgreSQL
          |
          v
7. Implement authentication
          |
          v
8. Build website management
          |
          v
9. Build scanner engine
          |
          v
10. Implement first security checks
          |
          v
11. Build findings/scoring system
          |
          v
12. Build security report UI
```

------------------------------------------------------------------------

# 38. Core Product Principle

The product should always move the user through this loop:

``` text
                 DETECT
                   |
                   v
                EXPLAIN
                   |
                   v
               PRIORITIZE
                   |
                   v
                REMEDIATE
                   |
                   v
                 RESCAN
                   |
                   +----------+
                              |
                              v
                            DETECT
```

The ultimate product experience should feel less like a professional
penetration-testing tool and more like a **security health check for a
small-business website**.

------------------------------------------------------------------------

# 39. Final Product Vision

The long-term vision is to become a simple security companion for small
businesses:

> **Know what is wrong. Understand why it matters. Fix it. Verify the
> fix.**

The MVP starts with website security health checks and can later evolve
toward continuous monitoring, automated alerts, broader vulnerability
intelligence, and additional security services.
