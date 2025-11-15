/**
 * Anchor Design System
 * Dark theme with high contrast for serious accountability
 * NO cute illustrations, NO gamification, NO soft language
 */

export const Colors = {
  // Dark theme palette
  background: '#000000',
  backgroundCard: '#1C1C1E',
  backgroundModal: '#2C2C2E',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#636366',

  // Critical/Alert colors
  alert: '#FF453A',
  alertBackground: '#2D1515',
  warning: '#FF9F0A',
  warningBackground: '#2D2315',

  // Success/Positive
  success: '#32D74B',
  successBackground: '#152D19',

  // Accent
  accent: '#0A84FF',
  accentBackground: '#15232D',

  // Guardian presence (subtle but always visible)
  guardian: '#5E5CE6',
  guardianBackground: '#1F1F2E',

  // Borders
  border: '#38383A',
  borderLight: '#48484A',

  // Input fields
  inputBackground: '#1C1C1E',
  inputBorder: '#38383A',
  inputFocus: '#0A84FF',

  // Disabled
  disabled: '#3A3A3C',
  disabledText: '#636366',
};

export const Typography = {
  // Headings - large, bold, impossible to miss
  h1: {
    fontSize: 36,
    fontWeight: 'bold',
    lineHeight: 42,
    color: Colors.textPrimary,
  },
  h2: {
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 34,
    color: Colors.textPrimary,
  },
  h3: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
    color: Colors.textPrimary,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    color: Colors.textPrimary,
  },

  // Body text
  body: {
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  bodySecondary: {
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 24,
    color: Colors.textSecondary,
  },

  // Small text
  caption: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  small: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    color: Colors.textSecondary,
  },

  // Numbers (financial amounts, days clean, etc.)
  numberLarge: {
    fontSize: 48,
    fontWeight: 'bold',
    lineHeight: 56,
    color: Colors.textPrimary,
  },
  numberMedium: {
    fontSize: 32,
    fontWeight: '600',
    lineHeight: 40,
    color: Colors.textPrimary,
  },

  // Button text
  button: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  buttonSmall: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const Shadows = {
  // Minimal shadows - flat design preferred
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const Components = {
  // Primary button (large, prominent, main action)
  buttonPrimary: {
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },

  // Secondary button (less prominent)
  buttonSecondary: {
    backgroundColor: Colors.backgroundCard,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },

  // Destructive button (red, for serious actions)
  buttonDestructive: {
    backgroundColor: Colors.alert,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },

  // Success button (green, for commitments)
  buttonSuccess: {
    backgroundColor: Colors.success,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },

  // Card container
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },

  // Alert card (for interventions)
  cardAlert: {
    backgroundColor: Colors.alertBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.alert,
    marginBottom: Spacing.md,
  },

  // Warning card
  cardWarning: {
    backgroundColor: Colors.warningBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.warning,
    marginBottom: Spacing.md,
  },

  // Input field
  input: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 17,
    color: Colors.textPrimary,
    minHeight: 56,
  },

  // Text area
  textArea: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 17,
    color: Colors.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
  },
};

// Copy tone guide
export const CopyTone = {
  // Examples of correct tone
  examples: [
    "Mate, you went out three times this week. Stay in.",
    "Hang on. $50 to Dave at 11pm Tuesday? That's your poker pattern.",
    "This is your last shot. Let's not fuck it up.",
    "I tried BetStop. Gamban. Self-exclusion. All had escape hatches.",
    "Who's going to keep you honest?",
  ],

  // What to AVOID
  avoid: [
    "Great job!",
    "You've got this!",
    "Stay positive!",
    "Take a deep breath",
    "We're here to support you",
  ],

  // Principles
  principles: [
    "Australian vernacular, direct",
    "Peer-to-peer, not therapist",
    "Hard love, not gentle cushioning",
    "No corporate speak",
    "No clinical language",
    "Factual, not motivational",
  ],
};

export default {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Components,
  CopyTone,
};
