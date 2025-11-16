# ANCHOR UI/UX IMPLEMENTATION GUIDE

This document provides detailed guidance for implementing the remaining screens according to the specifications.

## ✅ COMPLETED COMPONENTS

### Core Infrastructure
- [x] Theme system (`mobile/src/theme.js`)
- [x] Database schema with all new tables (`supabase/schema.sql`)
- [x] Design system with dark theme, high contrast, Australian tone

### Onboarding Screens (4 of 11)
- [x] Welcome Screen (`mobile/src/screens/onboarding/WelcomeScreen.js`)
- [x] Creator Video Screen (`mobile/src/screens/onboarding/CreatorVideoScreen.js`)
- [x] Commitment Period Screen (`mobile/src/screens/onboarding/CommitmentPeriodScreen.js`)
- [x] Guardian Setup Screen (`mobile/src/screens/onboarding/GuardianSetupScreen.js`)

### Main App Screens
- [x] Home Screen (redesigned) (`mobile/src/screens/HomeScreen.js`)
- [x] AI Conversation Screen (`mobile/src/screens/AIConversationScreen.js`)

### Payment Request Flow (Complete ✓)
- [x] Payment Request Screen (`mobile/src/screens/PaymentRequestScreen.js`)
- [x] Payment Evaluation Screen (`mobile/src/screens/PaymentEvaluationScreen.js`)
- [x] Payment Approved Screen (`mobile/src/screens/PaymentApprovedScreen.js`)
- [x] Payment Denied Screen (`mobile/src/screens/PaymentDeniedScreen.js`)

### Phase 2 Screens (Complete ✓)
- [x] Bills Screen (`mobile/src/screens/BillsScreen.js`)
- [x] Progress Screen (`mobile/src/screens/ProgressScreen.js`)
- [x] Profile Screen (`mobile/src/screens/ProfileScreen.js`)

---

## 📋 REMAINING SCREENS TO IMPLEMENT

### 1. Onboarding Screens (Remaining)

#### **GuardianInviteSentScreen.js**
Location: `mobile/src/screens/onboarding/GuardianInviteSentScreen.js`

**Purpose:** Show SMS that was sent, waiting for guardian to accept

**Key Elements:**
- Heading: "INVITE SENT TO [NAME]"
- Show exact SMS text sent
- Waiting indicator with guardian name
- "Continue Anyway" button (small, bottom)
- "Resend Invite" button

**Mock SMS Text:**
```
"Matt has chosen you as his financial guardian for 12 months.
You'll receive alerts when he requests money or shows gambling behavior.
Reply YES to accept, or call him if you have questions."
```

**Navigation:** → AIInterviewIntro

---

#### **AIInterviewIntroScreen.js**
Location: `mobile/src/screens/onboarding/AIInterviewIntroScreen.js`

**Purpose:** Introduction to AI interview process

**Key Elements:**
- Heading: "NOW LET'S GET REAL"
- Body text: "I'm going to ask 10 questions. Voice is best (more honest), but you can type. No bullshit answers. I can tell."
- Large microphone icon
- "Start Voice Interview" button (primary)
- "I'll Type Instead" button (secondary)

**Navigation:** → AIInterview (question 1)

---

#### **AIInterviewScreen.js**
Location: `mobile/src/screens/onboarding/AIInterviewScreen.js`

**Purpose:** 10-question interview to understand user's gambling history

**Questions (in order):**
1. "What happened that made you finally stop bullshitting yourself?"
2. "How much have you lost? Total. Best guess."
3. "When you gamble, what are you actually chasing? Not 'to win money' - what's the FEELING?"
4. "What happens when you stop? When the money's gone?"
5. "How do you gamble?" (Options: Pokies / Sports betting / Crypto / Poker / Other)
6. "Who knows you have a problem?"
7. "What would have to change for your life to not feel like something you need to escape from?"
8. "When you ask me for money, how should I respond?"
9. "What's your daily allowance? Remember: NO ROLLOVER."
10. "Ready to give me control?"

**Key Elements:**
- Large question text at top
- Voice recording button (pulsing when active) OR text input
- Live transcription shown
- Cannot skip (no skip button)
- AI responds briefly after each answer
- Progress indicator: "Question X of 10"

**AI Response Examples:**
- After Q1: "Yeah, that'll do it."
- After Q2: "Fuck. That's real money."
- After Q5: "Pokies. The worst one."
- After Q10: "Alright. Let's do this."

**Navigation:** → UpBankConnection

---

#### **UpBankConnectionScreen.js**
Location: `mobile/src/screens/onboarding/UpBankConnectionScreen.js`

**Purpose:** Connect Up Bank account via Personal Access Token

**Key Elements:**
- Heading: "LINK YOUR UP BANK ACCOUNT"
- Body: "I need to see every transaction in real-time. This is how I stop you before you gamble."
- Numbered instructions:
  1. Open Up app
  2. Swipe right → Data Sharing
  3. Generate Personal Access Token
  4. Paste it here
- Large text input for token
- "Connect Account" button

**Implementation Notes:**
- Use existing `upBank.js` service
- Store token in SecureStore
- Validate token by fetching accounts

**Navigation:** → AccountVerification

---

#### **AccountVerificationScreen.js**
Location: `mobile/src/screens/onboarding/AccountVerificationScreen.js`

**Purpose:** Verify Up Bank connection and check for required Savers

**Key Elements:**
- Loading: "Checking your Up account..."
- Success screen shows:
  - Transaction Account: $25.00 ✓
  - Vault Saver: [Create] or [✓ Found: $793.00]
  - Allowance Saver: [Create] or [✓ Found: $30.00]
- If missing: "You need to create [Vault/Allowance] Saver in Up app first"
- "I've Created Them" button (re-checks)
- When all found: "Setup Complete" → Continue

**Implementation Notes:**
- Use `accountService.getAccounts()` to list all accounts
- Check for accounts with "Vault" and "Allowance" in name
- Show balances for existing accounts

**Navigation:** → WhitelistConfiguration

---

#### **WhitelistConfigurationScreen.js**
Location: `mobile/src/screens/onboarding/WhitelistConfigurationScreen.js`

**Purpose:** Configure initial whitelist of approved payees

**Key Elements:**
- Heading: "WHAT BILLS CAN'T YOU MISS?"
- Body: "These get paid automatically. Everything else requires approval."
- List of whitelisted payees with + Add button
- For each payee:
  - Name
  - Amount
  - Frequency (weekly/fortnightly/monthly/once-off)
  - BSB + Account OR Biller Code
  - Priority (Critical / Essential / Other)
- Pre-populated suggestions: Rent, Phone, Internet, Electricity
- "Save Whitelist" button

**Implementation Notes:**
- Use existing whitelist service
- Store in Supabase whitelist table

**Navigation:** → FinalCommitment

---

#### **FinalCommitmentScreen.js**
Location: `mobile/src/screens/onboarding/FinalCommitmentScreen.js`

**Purpose:** Final lock-in screen before starting Anchor

**Key Elements:**
- Heading: "LAST CHANCE TO BACK OUT"
- Summary card showing:
  - Commitment: 12 months (until Nov 16, 2025)
  - Guardian: Gutsy (0412 XXX XXX)
  - Daily allowance: $30
  - Whitelisted bills: 8 items
  - Up Bank: Connected ✓
- Large warning text: "Once you tap 'Start', you're locked in. No undo. No escape. This is it."
- Checkbox: "I'm giving Anchor control of my money because I can't trust myself"
- "START ANCHOR" button (large, red, prominent)
- "Not Ready" button (takes them back to start)

**Implementation Notes:**
- Save all onboarding data to Supabase users table
- Set clean_streak_start_date to today
- Set commitment_start_date and commitment_end_date
- Mark onboarding_completed = true
- Create guardian record
- Initialize bills from whitelist

**Navigation:** → Home (app starts)

---

### 2. Payment Request Flow

#### **PaymentRequestScreen.js**
Location: `mobile/src/screens/PaymentRequestScreen.js`

**Purpose:** Initial request form for money

**Key Elements:**
- Heading: "REQUEST MONEY"
- "Why do you need it?" text area
- "Speak Instead" button (large microphone)
- "How much?" input
- "Submit Request" button

**Navigation:** → PaymentEvaluation

---

#### **PaymentEvaluationScreen.js**
Location: `mobile/src/screens/PaymentEvaluationScreen.js`

**Purpose:** Loading screen while AI evaluates request

**Key Elements:**
- Heading: "EVALUATING YOUR REQUEST"
- Animated thinking indicator
- Checklist showing:
  - Time of request ✓
  - Your pattern history ✓
  - Reason legitimacy... (loading)
- "Gutsy has been notified."

**Implementation Notes:**
- Call AI API with request details, user patterns, time of day
- Save to payment_requests table
- Notify guardian

**Navigation:** → PaymentApproved / PaymentDenied / NeedsConversation

---

#### **PaymentApprovedScreen.js, PaymentDeniedScreen.js**
Location: `mobile/src/screens/PaymentApprovedScreen.js`, `PaymentDeniedScreen.js`

**Purpose:** Show approval or denial outcome

**Approved Elements:**
- ✓ APPROVED heading
- "Work boots - $100"
- Numbered steps for manual transfer from Vault to Allowance
- "I've Done This" button
- Guardian notification status

**Denied Elements:**
- ✗ NOT APPROVED heading
- Show request details
- Explanation: "MATE, THIS DOESN'T ADD UP"
- Bullet points explaining why
- "Talk to AI" button (cannot skip)
- Guardian notification status

**Navigation:**
- Approved → Home
- Denied → AIConversation

---

### 3. Main App Screens

#### **BillsScreen.js**
Location: `mobile/src/screens/BillsScreen.js`

**Purpose:** Manage bills and whitelist

**Key Elements:**
- List of upcoming bills (next 30 days)
- Past due bills highlighted in red
- Whitelisted payees section
- Add bill button
- Mark as paid functionality

**Implementation Notes:**
- Query bills table
- Show upcoming_bills view
- Allow CRUD on bills and whitelist

---

#### **ProgressScreen.js**
Location: `mobile/src/screens/ProgressScreen.js`

**Purpose:** Show clean streak history and vault growth

**Key Elements:**
- Large days clean counter
- Calendar showing clean days (streak visualization)
- Vault growth chart over time
- Money saved calculation
- Relapse count (if any)

**Implementation Notes:**
- Query users table for clean_streak_start_date
- Query transactions for vault growth over time
- Show simple line chart or bar chart

---

#### **ProfileScreen.js**
Location: `mobile/src/screens/ProfileScreen.js`

**Purpose:** User settings and commitment details

**Key Elements:**
- User profile info
- Guardian details (name, phone, relationship)
- Commitment period countdown
- Daily allowance setting
- View AI interview answers
- Emergency contact info
- NO deactivate button (hidden until commitment ends)

---

#### **ConversationSummaryScreen.js**
Location: `mobile/src/screens/ConversationSummaryScreen.js`

**Purpose:** Summary after AI conversation completes

**Key Elements:**
- "CONVERSATION COMPLETE" heading
- Outcome badge (Approved / Denied / Warning Given)
- Bullet points of what happened
- "Gutsy received full transcript."
- "Return to Home" button

---

### 4. Updated Alert Screen

#### **AlertScreen.js** (Update existing)
Location: `mobile/src/screens/AlertScreen.js`

**Updates Needed:**
- Full-screen modal takeover (already implemented)
- Add more trigger types: payday_loan, cash_withdrawal, suspicious_transfer
- Show exact transaction details prominently
- Different alert colors by severity (red for gambling, orange for suspicious)
- "Talk to AI Now" button (only action)
- No dismiss or cancel option
- Guardian notification status visible

---

## 🎨 DESIGN SYSTEM USAGE

All screens should use the centralized theme system:

```javascript
import { Colors, Typography, Spacing, Components, BorderRadius } from '../theme';

// Use predefined components
<TouchableOpacity style={Components.buttonPrimary}>
<View style={Components.card}>
<TextInput style={Components.input}>

// Use typography
<Text style={Typography.h1}>
<Text style={Typography.body}>

// Use colors
backgroundColor: Colors.background
color: Colors.textPrimary
```

---

## 📱 NAVIGATION SETUP

Update `mobile/src/App.js` to include all screens:

```javascript
// Onboarding Stack
<Stack.Screen name="Welcome" component={WelcomeScreen} />
<Stack.Screen name="CreatorVideo" component={CreatorVideoScreen} />
<Stack.Screen name="CommitmentPeriod" component={CommitmentPeriodScreen} />
<Stack.Screen name="GuardianSetup" component={GuardianSetupScreen} />
<Stack.Screen name="GuardianInviteSent" component={GuardianInviteSentScreen} />
<Stack.Screen name="AIInterviewIntro" component={AIInterviewIntroScreen} />
<Stack.Screen name="AIInterview" component={AIInterviewScreen} />
<Stack.Screen name="UpBankConnection" component={UpBankConnectionScreen} />
<Stack.Screen name="AccountVerification" component={AccountVerificationScreen} />
<Stack.Screen name="WhitelistConfiguration" component={WhitelistConfigurationScreen} />
<Stack.Screen name="FinalCommitment" component={FinalCommitmentScreen} />

// Main App Stack
<Stack.Screen name="Home" component={HomeScreen} />
<Stack.Screen name="Bills" component={BillsScreen} />
<Stack.Screen name="Progress" component={ProgressScreen} />
<Stack.Screen name="Profile" component={ProfileScreen} />

// Payment Flow
<Stack.Screen name="PaymentRequest" component={PaymentRequestScreen} />
<Stack.Screen name="PaymentEvaluation" component={PaymentEvaluationScreen} />
<Stack.Screen name="PaymentApproved" component={PaymentApprovedScreen} />
<Stack.Screen name="PaymentDenied" component={PaymentDeniedScreen} />

// Conversations
<Stack.Screen name="AIConversation" component={AIConversationScreen} />
<Stack.Screen name="ConversationSummary" component={ConversationSummaryScreen} />

// Alerts
<Stack.Screen name="Alert" component={AlertScreen} />
```

### Conditional Initial Route

```javascript
// Check if onboarding completed
const [initialRoute, setInitialRoute] = useState('Welcome');

useEffect(() => {
  async function checkOnboarding() {
    // Query Supabase users table
    // If onboarding_completed = true, set 'Home'
    // Otherwise, set 'Welcome'
  }
  checkOnboarding();
}, []);
```

---

## 🗣️ COPY TONE REFERENCE

Remember the core principles:

✅ **DO:**
- "Mate, you went out three times this week. Stay in."
- "Hang on. $50 to Dave at 11pm Tuesday? That's your poker pattern."
- "This is your last shot. Let's not fuck it up."
- Direct, Australian vernacular
- Peer-to-peer tone
- Factual, not motivational

❌ **DON'T:**
- "Great job!"
- "You've got this!"
- "Stay positive!"
- "We're here to support you"
- Corporate speak
- Clinical language

---

## 🔐 CRITICAL ACCOUNTABILITY MECHANISMS

### 1. No Escape Hatches
- AI Conversation: Cannot exit until complete
- Commitment Period: Cannot cancel
- Alert Screen: Cannot dismiss without voice memo

### 2. Guardian Visibility
- All screens show guardian notification status
- Real-time updates to guardian
- Cannot delete guardian during commitment

### 3. Voice Over Text
- Prefer voice recording (harder to lie)
- Show transcription (accountability)
- Save all audio files

### 4. Pattern Matching
- Track gambling patterns in database
- Match new transactions against patterns
- Trigger interventions automatically

---

## 🚀 NEXT STEPS

1. **Implement remaining onboarding screens** (7 screens)
2. **Implement payment request flow** (4 screens)
3. **Implement main app screens** (Bills, Progress, Profile)
4. **Update navigation in App.js**
5. **Connect screens to Supabase** (replace mock data)
6. **Test all flows end-to-end**
7. **Deploy to TestFlight for Patient Zero testing**

---

## 📚 REFERENCES

- Design specifications: See original ANCHOR UI/UX IMPLEMENTATION PLAN document
- Database schema: `supabase/schema.sql`
- Theme system: `mobile/src/theme.js`
- Existing screens for patterns: `mobile/src/screens/HomeScreen.js`, `mobile/src/screens/AIConversationScreen.js`
