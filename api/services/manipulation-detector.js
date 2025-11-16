/**
 * Manipulation Detection Service for Anchor
 *
 * Detects and counters manipulation tactics in AI conversations
 * Users may try to game the system - this catches and challenges them
 */

/**
 * Manipulation tactics and their counter-responses
 */
const MANIPULATION_TACTICS = {
  // Sob stories - emotional manipulation
  SOB_STORY: {
    keywords: [
      'my kid',
      'my child',
      'baby',
      'family emergency',
      'desperate',
      'please',
      'crying',
      'starving',
      'homeless',
    ],
    severity: 'MEDIUM',
    counter: 'Then pay the provider directly. Give me their details.',
    escalation: 'If your kid actually needs something, I can verify and approve. But I need specifics.',
  },

  // Medical emergencies - common manipulation
  MEDICAL_EMERGENCY: {
    keywords: [
      'medicine',
      'medication',
      'doctor',
      'hospital',
      'emergency',
      'sick',
      'pain',
      'prescription',
    ],
    severity: 'HIGH',
    counter: 'Which pharmacy? I\'ll check if they take card.',
    escalation: 'Real medical emergencies get approved. Fake ones get caught. Which is this?',
  },

  // Vague responses - avoiding specifics
  VAGUE_RESPONSE: {
    keywords: [
      'just stuff',
      'things',
      'you know',
      'whatever',
      'bits and pieces',
      'general',
      'various',
    ],
    severity: 'MEDIUM',
    counter: 'Not good enough. Be specific or it\'s a no.',
    escalation: 'This is your third vague answer. I need actual details or this ends now.',
  },

  // Anger and threats - trying to intimidate
  ANGER_THREATS: {
    keywords: [
      'fuck',
      'bullshit',
      'screw this',
      'cancel',
      'quit',
      'lawyer',
      'sue',
      'complaint',
      'report you',
    ],
    severity: 'LOW', // Low because it shows they're cornered
    counter: 'This is what you signed up for. 318 days to go.',
    escalation: 'Getting angry doesn\'t change anything. The system works whether you like it or not.',
  },

  // Bargaining - "just this once"
  BARGAINING: {
    keywords: [
      'just this once',
      'one time',
      'exception',
      'special case',
      'different this time',
      'promise',
      'swear',
      'last time',
    ],
    severity: 'HIGH',
    counter: 'You said that day 12. And day 31.',
    escalation: 'Every relapse starts with "just this once". Not happening.',
  },

  // Privacy claims - trying to avoid questions
  PRIVACY_CLAIM: {
    keywords: [
      'none of your business',
      'private',
      'personal',
      'don\'t need to explain',
      'my money',
      'privacy',
    ],
    severity: 'MEDIUM',
    counter: 'You gave me this business when you signed up. Answer the question.',
    escalation: 'Privacy ended when gambling addiction started. This is accountability.',
  },

  // Minimizing - downplaying the issue
  MINIMIZING: {
    keywords: [
      'just',
      'only',
      'quick',
      'small',
      'tiny',
      'not a big deal',
      'nothing',
    ],
    severity: 'MEDIUM',
    counter: 'Gambling addiction started with "just" and "only".',
    escalation: 'You\'re minimizing. This is exactly how relapse starts.',
  },

  // Blaming others - external locus of control
  BLAMING: {
    keywords: [
      'not my fault',
      'they made me',
      'had to',
      'no choice',
      'forced',
      'because of',
    ],
    severity: 'LOW',
    counter: 'You always have a choice. You chose Anchor.',
    escalation: 'Blaming others doesn\'t work here. You\'re responsible.',
  },

  // False compliance - agreeing to end conversation
  FALSE_COMPLIANCE: {
    keywords: [
      'you\'re right',
      'okay fine',
      'whatever you say',
      'can we be done',
      'yes yes',
    ],
    severity: 'MEDIUM',
    counter: 'I need actual answers, not agreement to shut me up.',
    escalation: 'You\'re trying to end this without engaging. Not how it works.',
  },

  // Claiming success - "I've got this"
  FALSE_CONFIDENCE: {
    keywords: [
      'i\'ve got this',
      'under control',
      'trust me',
      'i know',
      'i can handle',
      'different now',
    ],
    severity: 'HIGH',
    counter: 'If you had it under control, you wouldn\'t need Anchor.',
    escalation: 'Day 0, you said you had it under control. Here we are.',
  },
};

/**
 * Detect manipulation tactics in user response
 */
function detectManipulation(userMessage, conversationHistory = []) {
  const messageLower = userMessage.toLowerCase();
  const detectedTactics = [];

  // Check each manipulation tactic
  for (const [tacticName, tactic] of Object.entries(MANIPULATION_TACTICS)) {
    const matchedKeywords = tactic.keywords.filter(keyword =>
      messageLower.includes(keyword.toLowerCase())
    );

    if (matchedKeywords.length > 0) {
      detectedTactics.push({
        tactic: tacticName,
        severity: tactic.severity,
        matchedKeywords: matchedKeywords,
        counter: tactic.counter,
        escalation: tactic.escalation,
      });
    }
  }

  // Check for repeated tactics in conversation history
  if (conversationHistory.length > 0) {
    const repeatedTactic = checkRepeatedTactics(detectedTactics, conversationHistory);
    if (repeatedTactic) {
      return {
        detected: true,
        tactics: detectedTactics,
        repeated: repeatedTactic,
        shouldEscalate: true,
        response: repeatedTactic.escalation,
      };
    }
  }

  if (detectedTactics.length === 0) {
    return {
      detected: false,
      tactics: [],
      response: null,
    };
  }

  // Return highest severity tactic
  const sortedByS everity = detectedTactics.sort((a, b) => {
    const severityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  return {
    detected: true,
    tactics: sortedBySeverity,
    primaryTactic: sortedBySeverity[0],
    shouldEscalate: false,
    response: sortedBySeverity[0].counter,
  };
}

/**
 * Check if user is repeating manipulation tactics
 */
function checkRepeatedTactics(currentTactics, conversationHistory) {
  if (currentTactics.length === 0) return null;

  const currentTacticNames = currentTactics.map(t => t.tactic);

  // Look for same tactic used earlier in conversation
  for (const message of conversationHistory) {
    if (message.role === 'user' && message.manipulationDetected) {
      const previousTacticNames = message.manipulationDetected.tactics.map(t => t.tactic);
      const repeated = currentTacticNames.find(name =>
        previousTacticNames.includes(name)
      );

      if (repeated) {
        const tacticConfig = MANIPULATION_TACTICS[repeated];
        return {
          tactic: repeated,
          escalation: tacticConfig.escalation,
          count: 2, // Could track exact count if needed
        };
      }
    }
  }

  return null;
}

/**
 * Detect evasive answers - non-committal, vague responses
 */
function detectEvasion(userMessage, questionAsked) {
  const messageLower = userMessage.toLowerCase();
  const messageWords = messageLower.split(/\s+/);

  // Too short (< 5 words) = likely evasive
  if (messageWords.length < 5) {
    const evasiveShortResponses = [
      'dunno',
      'don\'t know',
      'not sure',
      'maybe',
      'i guess',
      'whatever',
      'things',
      'stuff',
    ];

    if (evasiveShortResponses.some(phrase => messageLower.includes(phrase))) {
      return {
        isEvasive: true,
        reason: 'too_vague',
        counter: 'Not good enough. I need actual details.',
      };
    }
  }

  // Doesn't answer the specific question
  if (questionAsked && questionAsked.includes('what')) {
    // Question asks "what", check if answer contains concrete nouns
    const concreteNouns = messageLower.match(/\b(rent|food|bill|medicine|transport|electricity|phone)\b/);
    if (!concreteNouns && messageWords.length < 10) {
      return {
        isEvasive: true,
        reason: 'no_specifics',
        counter: 'What specifically? Give me the actual thing, not vague words.',
      };
    }
  }

  if (questionAsked && questionAsked.includes('when')) {
    // Question asks "when", check for time reference
    const timeReferences = messageLower.match(/\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month|day)\b/);
    if (!timeReferences) {
      return {
        isEvasive: true,
        reason: 'no_time',
        counter: 'When exactly? I need a date.',
      };
    }
  }

  if (questionAsked && questionAsked.includes('why')) {
    // Question asks "why", check for reasoning
    const reasoningWords = messageLower.match(/\b(because|since|as|for|need|have to|must)\b/);
    if (!reasoningWords && messageWords.length < 8) {
      return {
        isEvasive: true,
        reason: 'no_reason',
        counter: 'Why though? Give me an actual reason.',
      };
    }
  }

  return {
    isEvasive: false,
  };
}

/**
 * Detect if user is lying based on inconsistencies
 */
function detectInconsistencies(userMessage, conversationHistory) {
  const messageLower = userMessage.toLowerCase();
  const inconsistencies = [];

  // Check against previous statements in conversation
  for (let i = 0; i < conversationHistory.length; i++) {
    const previousMessage = conversationHistory[i];
    if (previousMessage.role !== 'user') continue;

    const previousLower = previousMessage.content.toLowerCase();

    // Example: User said "no" before, now says "yes" to same question
    if (previousLower.includes('no') && messageLower.includes('yes')) {
      inconsistencies.push({
        type: 'contradiction',
        previous: previousMessage.content,
        current: userMessage,
        messageIndex: i,
      });
    }

    // Example: Amount changed
    const previousAmount = previousLower.match(/\$?(\d+)/);
    const currentAmount = messageLower.match(/\$?(\d+)/);
    if (previousAmount && currentAmount && previousAmount[1] !== currentAmount[1]) {
      inconsistencies.push({
        type: 'amount_mismatch',
        previous: previousAmount[0],
        current: currentAmount[0],
        messageIndex: i,
      });
    }
  }

  if (inconsistencies.length > 0) {
    return {
      hasInconsistencies: true,
      inconsistencies: inconsistencies,
      counter: `You just contradicted yourself. Earlier you said "${inconsistencies[0].previous}".`,
    };
  }

  return {
    hasInconsistencies: false,
  };
}

/**
 * Generate AI response that counters manipulation
 */
function generateCounterResponse(manipulation, evasion, inconsistency, context) {
  // Priority: Inconsistency > Manipulation > Evasion
  if (inconsistency && inconsistency.hasInconsistencies) {
    return {
      type: 'inconsistency_challenge',
      message: inconsistency.counter,
      shouldEnd: false,
      flags: ['inconsistent', 'lying'],
    };
  }

  if (manipulation && manipulation.detected) {
    const response = manipulation.shouldEscalate
      ? manipulation.response // Escalation message
      : manipulation.primaryTactic.counter;

    return {
      type: 'manipulation_counter',
      message: response,
      shouldEnd: manipulation.shouldEscalate && manipulation.primaryTactic.severity === 'HIGH',
      flags: manipulation.tactics.map(t => t.tactic),
    };
  }

  if (evasion && evasion.isEvasive) {
    return {
      type: 'evasion_challenge',
      message: evasion.counter,
      shouldEnd: false,
      flags: ['evasive', evasion.reason],
    };
  }

  return null;
}

/**
 * Assess overall honesty of conversation
 */
function assessConversationHonesty(conversationHistory) {
  let manipulationCount = 0;
  let evasionCount = 0;
  let inconsistencyCount = 0;
  let genuineCount = 0;

  for (const message of conversationHistory) {
    if (message.role !== 'user') continue;

    if (message.manipulationDetected && message.manipulationDetected.detected) {
      manipulationCount++;
    }
    if (message.evasionDetected && message.evasionDetected.isEvasive) {
      evasionCount++;
    }
    if (message.inconsistencyDetected && message.inconsistencyDetected.hasInconsistencies) {
      inconsistencyCount++;
    }

    // Genuine response = no detection flags
    if (!message.manipulationDetected?.detected &&
        !message.evasionDetected?.isEvasive &&
        !message.inconsistencyDetected?.hasInconsistencies &&
        message.content.length > 20) {
      genuineCount++;
    }
  }

  const totalUserMessages = conversationHistory.filter(m => m.role === 'user').length;
  const problemMessageRatio = (manipulationCount + evasionCount + inconsistencyCount) / totalUserMessages;

  return {
    manipulationCount,
    evasionCount,
    inconsistencyCount,
    genuineCount,
    totalUserMessages,
    problemMessageRatio,
    assessment: problemMessageRatio > 0.5 ? 'DISHONEST' : problemMessageRatio > 0.25 ? 'EVASIVE' : 'GENUINE',
    recommendation: problemMessageRatio > 0.5
      ? 'End conversation with denial - too much manipulation'
      : problemMessageRatio > 0.25
        ? 'Continue challenging but watch closely'
        : 'Appears genuine - consider approval if details check out',
  };
}

module.exports = {
  detectManipulation,
  detectEvasion,
  detectInconsistencies,
  generateCounterResponse,
  assessConversationHonesty,
  MANIPULATION_TACTICS,
};
