# Anchor Data Processing Agreement

**Effective Date:** January 1, 2025
**Last Updated:** January 1, 2025

## Plain English Summary

**How we handle your data:**
- We collect everything: transactions, conversations, voice recordings, patterns.
- We share patterns (not amounts) with your Guardian.
- We use OpenAI for AI conversations (they don't get your name or personal info).
- We keep data for 7 years after you finish (Australian financial record laws).
- Voice recordings are deleted after 24 hours.
- You can access your data anytime, but you can't delete it during your commitment.
- We encrypt everything and use Australian servers.
- If there's a data breach, we'll tell you within 72 hours.

**We take your privacy seriously, but pattern detection requires data. That's the trade-off.**

---

## 1. Introduction

This Data Processing Agreement ("DPA") describes how Anchor Intervention Pty Ltd ("Anchor", "we", "us", "our") collects, processes, stores, and protects your personal information under:
- Australian Privacy Act 1988 (Cth)
- Australian Privacy Principles (APPs)
- General Data Protection Regulation (GDPR) (if applicable)
- Notifiable Data Breaches (NDB) scheme

This DPA supplements our Terms of Service and Privacy Policy.

## 2. Roles and Responsibilities

### 2.1 Data Controller

**Anchor is the Data Controller** for:
- User account data
- Transaction history
- Pattern detection data
- AI conversation logs
- Payment request history
- Guardian relationships

### 2.2 Data Processors

Anchor uses these third-party processors:
- **Supabase (PostgreSQL):** Database hosting (Australian region)
- **OpenAI:** AI conversation generation and voice transcription
- **Twilio:** SMS notifications
- **ElevenLabs:** Voice generation
- **Up Bank:** Financial data source (they control the source data)
- **Expo:** Push notifications (via Firebase/APNs)
- **AWS (optional):** Backup storage (Sydney region)

### 2.3 Your Rights as Data Subject

Under Australian and GDPR law, you have rights regarding your personal data (detailed in Section 8).

## 3. Data We Collect

### 3.1 Personal Information

**Identity Data:**
- Full name
- Date of birth
- Email address
- Mobile phone number
- Australian residency status

**Account Data:**
- User ID (UUID)
- Password hash (bcrypt, not plaintext)
- Up Bank Personal Access Token (encrypted)
- Account creation date
- Last login timestamp
- Device information (iOS/Android, version)

### 3.2 Financial Data

**Up Bank Transactions:**
- Transaction ID
- Date and time
- Merchant name
- Transaction description
- Amount (AUD)
- Transaction type (debit/credit)
- Status (pending/settled)
- Category (provided by Up Bank)

**Initial Import:**
- Last 90 days of transactions at onboarding
- Analyzed for baseline gambling patterns
- Stored indefinitely during commitment period

**Ongoing Monitoring:**
- Real-time webhooks for all new transactions
- Stored within 5 minutes of occurrence
- Processed for pattern detection

**Enriched Data:**
- Merchant classification (gambling/legitimate)
- Risk scores (0-100)
- Pattern flags (round number, late night, etc.)
- Time-based risk analysis

### 3.3 Intervention Data

**AI Conversations:**
- Conversation ID
- Trigger type (gambling detected, payday loan, etc.)
- Start and end timestamps
- Message history (user and AI messages)
- Conversation outcome (honest admission, denial, timeout)
- Manipulation detection results

**Voice Recordings:**
- Audio file (MP3/M4A format)
- Transcription (via OpenAI Whisper)
- Voice stress analysis results
- **Retention:** 24 hours only, then permanently deleted
- **Transcripts retained:** Indefinitely (without audio)

### 3.4 Pattern Detection Data

**Detected Patterns:**
- Pattern type (Tuesday poker, late night escalation, etc.)
- Detection timestamp
- Confidence score (0-100%)
- Severity (CRITICAL/HIGH/MEDIUM/LOW)
- Associated transactions (IDs only)
- Indicators (day of week, time range, amounts, merchant types)

### 3.5 Guardian Data

**Guardian Information:**
- Name
- Relationship to User
- Mobile phone number
- Email address (optional)
- Acceptance date
- Portal activity logs (view times, pages visited)
- Emergency check-in history

### 3.6 Payment Request Data

**Requests:**
- Request ID
- Amount
- Reason (text or voice transcription)
- Voice recording (if applicable, 24 hours retention)
- Approval/denial decision
- AI conversation ID (if triggered)
- Manual confirmation status

### 3.7 Technical Data

**App Usage:**
- Session duration
- Screen views
- App version
- Device type and OS version
- IP address (hashed)
- Push notification tokens

**Error Logs:**
- Crash reports
- API errors
- Sync failures
- Exception stack traces

## 4. How We Use Your Data

### 4.1 Lawful Basis for Processing

We process your data under these legal bases:

**Contract Performance (Primary Basis):**
- Financial monitoring is essential to the Service
- AI interventions are contractually agreed
- Guardian notifications are part of the commitment
- Without this processing, we cannot provide the Service

**Consent:**
- You explicitly consent during onboarding
- You can withdraw consent, but this terminates the Service
- Withdrawal does not affect lawfulness of processing before withdrawal

**Legitimate Interests:**
- Fraud detection and prevention
- Security monitoring
- Service improvement and analytics
- Legal compliance

### 4.2 Processing Activities

**Transaction Monitoring:**
- Receive transactions from Up Bank via webhooks
- Classify merchants as gambling/legitimate
- Calculate risk scores
- Detect patterns
- Store in encrypted database

**Pattern Detection:**
- Analyze transaction history
- Identify gambling behaviors
- Calculate confidence and severity
- Trigger AI interventions when thresholds exceeded

**AI Intervention:**
- Generate conversation prompts using OpenAI GPT-4
- Send conversation content (no PII) to OpenAI
- Receive AI responses
- Detect manipulation tactics
- Determine conversation outcome

**Guardian Notification:**
- Generate pattern summaries (no dollar amounts)
- Send SMS via Twilio
- Update Guardian portal
- Log notification delivery

**Voice Processing:**
- Record audio via Expo Audio
- Upload to secure storage
- Transcribe via OpenAI Whisper
- Analyze for authenticity
- Delete audio after 24 hours

## 5. Data Sharing

### 5.1 Third-Party Processors

**Supabase (PostgreSQL):**
- **Data shared:** All data except voice recordings
- **Purpose:** Primary database storage
- **Location:** Australia (Sydney) region
- **Security:** Row-level security, AES-256 encryption
- **Contract:** Data Processing Addendum in place

**OpenAI:**
- **Data shared:** Conversation messages (no name, email, phone, amounts)
- **Purpose:** AI response generation, voice transcription
- **Location:** United States (GDPR-compliant)
- **Security:** TLS 1.3, API key authentication
- **Retention:** OpenAI deletes after 30 days (per their policy)
- **Contract:** OpenAI Enterprise DPA

**Twilio:**
- **Data shared:** Guardian phone numbers, notification content
- **Purpose:** SMS delivery
- **Location:** United States (Australian phone numbers)
- **Security:** TLS, message encryption
- **Contract:** Twilio Data Protection Addendum

**ElevenLabs:**
- **Data shared:** AI response text only
- **Purpose:** Text-to-speech voice generation
- **Location:** United States
- **Security:** API key authentication
- **Retention:** No data retention

**Up Bank:**
- **Data shared:** None (we receive data from them)
- **Purpose:** Transaction data source
- **Location:** Australia
- **Access:** Read-only via Personal Access Token

### 5.2 Data Shared with Guardian

**Pattern Summaries (No Amounts):**
- Pattern type and description
- Detection timestamp
- Severity level
- Number of occurrences
- Clean streak status

**Example of what Guardian sees:**
```
Pattern Detected: Late Night Cash Withdrawal
Detected: Jan 15, 2025, 2:30 AM
Severity: HIGH
Description: Multiple cash withdrawals during late-night hours (10pm-4am)
```

**What Guardian does NOT see:**
- Dollar amounts ($100, $150, etc.)
- Specific merchant names
- Transaction descriptions
- Vault balance
- Daily allowance usage

### 5.3 Data NOT Shared

We do NOT share data with:
- Advertisers or marketing companies
- Data brokers
- Insurance companies
- Employers
- Credit bureaus
- Other gambling intervention services

### 5.4 Legal Disclosures

We may disclose data if legally required by:
- Valid court order or subpoena
- Law enforcement (with proper legal authority)
- Regulatory bodies (ASIC, AUSTRAC)
- Child protection authorities (if abuse suspected)

We will notify you of legal disclosures unless prohibited by law.

## 6. Data Retention

### 6.1 During Commitment Period

All data is retained indefinitely during your commitment period and cannot be deleted.

**Exceptions:**
- Voice recordings: 24 hours only
- Temporary session data: 7 days

### 6.2 After Commitment Period

**Financial Records:** 7 years (Australian regulatory requirement)
- Transaction history
- Payment requests
- Pattern detection logs
- AI conversation transcripts

**Account Data:** 90 days after commitment ends
- Personal information
- Guardian relationships
- Device information
- App usage logs

**Voice Recordings:** Already deleted (24-hour retention during commitment)

### 6.3 Account Deletion

After your commitment period ends, you may request account deletion:
- Request via app or email to privacy@anchor.app
- 30-day waiting period
- Financial records retained for 7 years (anonymized)
- All other data permanently deleted
- Confirmation sent via email

### 6.4 Data Anonymization

After 7 years, financial records are anonymized:
- Personal identifiers removed (name, email, phone)
- Replaced with anonymous user ID
- Used for aggregate analytics only
- Cannot be re-identified

## 7. Data Security

### 7.1 Encryption

**Data at Rest:**
- AES-256 encryption (Supabase database)
- Encrypted backups (AWS S3 with KMS)
- Encrypted Up Bank tokens (never stored in plaintext)

**Data in Transit:**
- TLS 1.3 for all API communications
- Certificate pinning in mobile app
- HTTPS only (no HTTP fallback)

### 7.2 Access Controls

**Role-Based Access:**
- Users: Own data only
- Guardians: Pattern summaries only (no amounts)
- Anchor staff: Minimal access (support, debugging)
- Service keys: Separate keys per service

**Authentication:**
- JWT tokens (7-day expiry)
- Refresh tokens (30-day expiry)
- Guardian magic links (24-hour expiry)
- Password hashing (bcrypt, cost factor 12)

### 7.3 Database Security

**Supabase (PostgreSQL):**
- Row-level security (RLS) policies
- No direct database access (API only)
- Audit logging enabled
- Daily automated backups
- Point-in-time recovery

**Network Security:**
- Virtual Private Cloud (VPC)
- Firewall rules (Australian IPs only for admin)
- DDoS protection
- Intrusion detection

### 7.4 Monitoring and Audits

**Security Monitoring:**
- Failed login attempts logged
- Anomalous API activity flagged
- Database queries audited
- Third-party access logged

**Regular Audits:**
- Quarterly security reviews
- Annual penetration testing
- Biannual code audits
- Monthly dependency updates

## 8. Your Rights (Australian Privacy Act & GDPR)

### 8.1 Right to Access (APP 12, GDPR Art. 15)

You can request a copy of your data:
- **How:** Email privacy@anchor.app or use in-app export
- **Response time:** 30 days
- **Format:** JSON or PDF
- **Cost:** Free (first request per year)

**What you'll receive:**
- Personal information
- Transaction history
- AI conversation transcripts
- Pattern detection logs
- Payment request history

### 8.2 Right to Rectification (APP 10, GDPR Art. 16)

You can correct inaccurate data:
- **How:** Update via app settings or email privacy@anchor.app
- **Response time:** 7 days
- **Scope:** Name, email, phone (not transaction history from Up Bank)

### 8.3 Right to Erasure ("Right to be Forgotten") (GDPR Art. 17)

**Limited During Commitment Period:**
- You cannot delete data during your commitment period
- Financial monitoring requires data retention
- This limitation is disclosed in Terms of Service

**After Commitment Period:**
- You can request full account deletion
- 30-day waiting period
- Financial records retained for 7 years (anonymized)
- Confirmation sent when deletion complete

### 8.4 Right to Restriction of Processing (GDPR Art. 18)

You can request we stop processing data (except storage):
- **Grounds:** Data accuracy disputed, processing unlawful, or objection to processing
- **Effect:** Data stored but not used for pattern detection (commitment period suspended)
- **Duration:** Until dispute resolved

### 8.5 Right to Data Portability (APP 13, GDPR Art. 20)

You can export your data in machine-readable format:
- **Format:** JSON (structured data)
- **Includes:** Transactions, conversations, patterns, payment requests
- **Excludes:** Derived data (risk scores calculated by our algorithms)

### 8.6 Right to Object (GDPR Art. 21)

You can object to processing based on legitimate interests:
- **Effect:** Processing stops unless we demonstrate compelling legitimate grounds
- **Note:** If objection is upheld, Service is terminated (commitment period continues)

### 8.7 Right to Withdraw Consent

You can withdraw consent to data processing:
- **How:** Email privacy@anchor.app or use in-app "Withdraw Consent" button
- **Effect:** Service is terminated immediately
- **Commitment:** Vault remains locked until commitment end date
- **Data:** Retained for 7 years (financial records), then anonymized

### 8.8 Right to Complain

You can complain about data handling to:
- **Anchor:** privacy@anchor.app (we'll respond within 7 days)
- **Australian Information Commissioner:** oaic.gov.au (if dissatisfied with our response)
- **EU Data Protection Authority:** (if GDPR applies and you're in EU)

## 9. Automated Decision-Making (GDPR Art. 22)

### 9.1 Automated Decisions

Anchor uses automated decision-making for:
- **Pattern detection:** Algorithms classify transactions and detect patterns
- **Risk scoring:** Automated calculation of risk levels (0-100)
- **AI intervention triggering:** Automated determination when to trigger conversations
- **Payment approval:** Some requests auto-approved if within allowance and no flags

### 9.2 Significant Effects

These automated decisions have significant effects on you:
- Payment requests may be denied automatically
- AI conversations may be triggered automatically
- Patterns may result in Guardian notifications

### 9.3 Your Rights Regarding Automated Decisions

You have the right to:
- **Human review:** Request manual review of automated decisions
- **Explanation:** Understand the logic behind automated decisions
- **Challenge:** Contest automated decisions you believe are incorrect

**How to request human review:**
- Email support@anchor.app with decision ID
- We'll review within 7 business days
- Human reviewer can override automated decision

### 9.4 Transparency

We provide transparency by:
- Showing pattern detection logic (confidence scores, indicators)
- Explaining why AI conversations are triggered
- Displaying risk scores and flags on payment requests
- Publishing pattern detection criteria in documentation

## 10. Data Breach Notification

### 10.1 Breach Response

If we experience a data breach involving your personal information:
- **Internal detection:** Within 24 hours
- **Containment:** Immediate action to stop breach
- **Investigation:** Forensic analysis to determine scope and cause
- **Notification:** Users and regulator notified

### 10.2 Notification Timeline

**To You:**
- **When:** Within 72 hours of becoming aware of breach
- **How:** Email, SMS, and in-app notification
- **Content:** What data was affected, when it occurred, what we're doing

**To Regulator (OAIC):**
- **When:** Within 72 hours if breach likely to cause serious harm
- **How:** Online form at oaic.gov.au
- **Content:** Nature of breach, affected individuals, remedial actions

### 10.3 What We'll Tell You

Breach notification includes:
- Date and time of breach
- What data was accessed/disclosed
- How many users affected
- Steps we're taking to mitigate
- Steps you should take (e.g., change password)
- Contact for questions

### 10.4 Serious Harm Assessment

We assess if breach is likely to cause serious harm:
- **Serious harm examples:** Financial fraud, identity theft, blackmail, physical harm
- **Factors:** Sensitivity of data, who accessed it, safeguards in place
- **If serious harm likely:** Mandatory notification to you and OAIC
- **If no serious harm:** Internal record only (not notified)

## 11. International Data Transfers

### 11.1 Australian Data Residency

Primary data storage:
- **Supabase:** Australian (Sydney) region
- **AWS backups:** Asia Pacific (Sydney) region
- Your data does not leave Australia except as noted below

### 11.2 Overseas Transfers

Data is transferred overseas to:
- **United States (OpenAI):** AI conversation content only (no PII)
- **United States (Twilio):** Guardian phone numbers for SMS
- **United States (ElevenLabs):** AI response text for voice generation

**Safeguards:**
- OpenAI: GDPR-compliant, EU-U.S. Data Privacy Framework certified
- Twilio: GDPR-compliant, EU-U.S. Data Privacy Framework certified
- Data Processing Agreements in place with all processors

### 11.3 GDPR Compliance

For EU residents (if applicable):
- Standard Contractual Clauses (SCCs) with all non-EU processors
- Adequacy decisions relied upon where available
- Your rights under GDPR fully preserved

## 12. Children's Privacy

Anchor is not intended for use by individuals under 18 years of age.
- We do not knowingly collect data from children
- If we discover a user is under 18, we immediately terminate their account
- Parents/guardians should contact us if they believe a child has created an account

## 13. Changes to This DPA

We may update this DPA to reflect:
- Changes in law (Australian Privacy Act amendments, GDPR updates)
- New data processing activities
- Updated security measures
- Changes to third-party processors

**Notification:**
- 30 days notice via email and in-app notification
- Material changes require re-consent
- Continued use after changes take effect constitutes acceptance

## 14. Contact Information

**Data Protection Officer (DPO):**
Email: privacy@anchor.app
Phone: [Pending]

**Data Subject Requests:**
- Access request: privacy@anchor.app
- Correction request: privacy@anchor.app
- Deletion request: privacy@anchor.app
- Portability request: privacy@anchor.app
- Complaint: privacy@anchor.app

**Response time:** 30 days (can be extended to 60 days if complex)

**Australian Information Commissioner:**
Website: oaic.gov.au
Phone: 1300 363 992
Email: enquiries@oaic.gov.au

---

**Anchor Intervention Pty Ltd**
ABN: [Pending]
ACN: [Pending]
Registered Office: [Address - Pending]

**Version:** 1.0.0
**Last Updated:** January 1, 2025
