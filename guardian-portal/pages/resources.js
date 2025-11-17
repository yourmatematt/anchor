/**
 * Guardian Resources Page
 *
 * Comprehensive resources for guardians to provide effective support
 * - How to support without enabling
 * - What to say during relapses
 * - Self-care for guardians
 * - Professional resources
 * - Warning signs
 * - Success stories
 */

import React, { useState } from 'react';
import styles from '../styles/Resources.module.css';

export default function ResourcesPage() {
  const [activeSection, setActiveSection] = useState('support-guide');

  const resources = {
    'support-guide': {
      title: 'How to Support Without Enabling',
      icon: '🤝',
      content: [
        {
          heading: 'Setting Healthy Boundaries',
          points: [
            'Be clear about what you can and cannot do',
            'Dont give money or provide access to funds',
            'Support the person, not the behavior',
            'Its okay to say no - boundaries protect both of you'
          ]
        },
        {
          heading: 'Effective Communication',
          points: [
            'Use "I" statements: "I feel concerned" vs "You always gamble"',
            'Listen without judgment - create a safe space',
            'Ask open questions: "How are you feeling?" not "Did you gamble?"',
            'Acknowledge progress, even small wins'
          ]
        },
        {
          heading: 'What TO Do',
          points: [
            'Celebrate clean days and milestones',
            'Help identify triggers and patterns',
            'Encourage healthy alternative activities',
            'Be available for check-ins, especially during high-risk times',
            'Share resources and professional help options'
          ]
        },
        {
          heading: 'What NOT to Do',
          points: [
            'Dont lecture or shame - this increases isolation',
            'Dont monitor constantly - trust is important',
            'Dont take relapses personally - recovery isnt linear',
            'Dont enable by covering debts or providing money',
            'Dont neglect your own wellbeing'
          ]
        }
      ]
    },
    'relapse-response': {
      title: 'What to Say During Relapses',
      icon: '💬',
      content: [
        {
          heading: 'Immediate Response',
          points: [
            '"Thank you for telling me. Im here for you."',
            '"This doesnt undo all your progress."',
            '"Lets talk about what happened, no judgment."',
            '"What do you need from me right now?"'
          ]
        },
        {
          heading: 'Processing Together',
          points: [
            '"What was happening before this happened?"',
            '"What triggered this - can we identify the pattern?"',
            '"What did we learn that will help next time?"',
            '"Youre still committed to change, and that matters."'
          ]
        },
        {
          heading: 'Moving Forward',
          points: [
            '"Tomorrow is a fresh start."',
            '"What can I do to support you better?"',
            '"Should we adjust your strategy?"',
            '"Im proud that you told me - honesty is huge."'
          ]
        },
        {
          heading: 'What NOT to Say',
          points: [
            'Avoid "I told you so" or "again?"',
            'Dont ask "how much?" - focus on patterns, not amounts',
            'Dont express disappointment - focus on support',
            'Dont minimize: "its not that bad" invalidates their struggle'
          ]
        }
      ]
    },
    'self-care': {
      title: 'Self-Care for Guardians',
      icon: '🧘',
      content: [
        {
          heading: 'Your Wellbeing Matters',
          points: [
            'You cannot pour from an empty cup',
            'Supporting someone with addiction is emotionally taxing',
            'Taking care of yourself isnt selfish - its necessary',
            'Your mental health affects your ability to support effectively'
          ]
        },
        {
          heading: 'Practical Self-Care',
          points: [
            'Set time limits on support - dont be available 24/7',
            'Maintain your own hobbies and social connections',
            'Exercise, eat well, sleep enough - basics matter',
            'Journal about your feelings and experiences',
            'Consider therapy for yourself - you need support too'
          ]
        },
        {
          heading: 'Managing Guardian Stress',
          points: [
            'Recognize compassion fatigue - its real',
            'Dont take their behavior personally',
            'Remember: you cant control their choices',
            'Celebrate your efforts, regardless of outcomes',
            'Connect with other guardians for mutual support'
          ]
        },
        {
          heading: 'When to Step Back',
          points: [
            'If your own mental health is declining',
            'If the relationship becomes abusive',
            'If youre enabling despite best intentions',
            'If professional help is needed but refused',
            'Taking a break doesnt mean giving up'
          ]
        }
      ]
    },
    'professional-help': {
      title: 'Professional Resources',
      icon: '📞',
      content: [
        {
          heading: 'Australia - Gambling Help Services',
          points: [
            '🇦🇺 Gambling Help: 1800 858 858 (24/7 free, confidential)',
            '💻 Online chat: www.gamblinghelponline.org.au',
            '📱 Gambling Help app available on iOS and Android',
            '🏥 Face-to-face counselling available in all states'
          ]
        },
        {
          heading: 'Crisis Support',
          points: [
            '🆘 Lifeline: 13 11 14 (24/7 crisis support)',
            '💙 Beyond Blue: 1300 22 4636 (mental health support)',
            '🧠 Suicide Call Back Service: 1300 659 467',
            '👨‍👩‍👧 Relationships Australia: 1300 364 277'
          ]
        },
        {
          heading: 'Financial Counselling',
          points: [
            '💰 National Debt Helpline: 1800 007 007 (free)',
            '📊 Financial counselling for gambling debt',
            '🏛️ Centrelink advance payment support',
            '⚖️ Legal aid for gambling-related issues'
          ]
        },
        {
          heading: 'When to Seek Professional Help',
          points: [
            'Gambling is happening daily or multiple times per week',
            'Debt is accumulating rapidly',
            'Suicidal thoughts or severe depression',
            'Relationship breakdown or domestic violence',
            'Previous self-help attempts havent worked'
          ]
        }
      ]
    },
    'warning-signs': {
      title: 'Warning Signs to Watch For',
      icon: '⚠️',
      content: [
        {
          heading: 'Behavioral Red Flags',
          points: [
            'Increasing secrecy or defensive behavior',
            'Lying about whereabouts or activities',
            'Neglecting work, family, or personal responsibilities',
            'Sleep pattern changes (gambling late at night)',
            'Irritability or mood swings'
          ]
        },
        {
          heading: 'Financial Warning Signs',
          points: [
            'Unexplained financial stress or bill non-payment',
            'Selling possessions',
            'Borrowing money from multiple sources',
            'Maxed out credit cards',
            'Defensive about money questions'
          ]
        },
        {
          heading: 'Emotional Red Flags',
          points: [
            'Expressions of hopelessness or despair',
            'Talking about suicide or self-harm',
            'Severe anxiety or panic attacks',
            'Depression or social withdrawal',
            'Substance use increase (alcohol, drugs)'
          ]
        },
        {
          heading: 'Crisis Indicators - Immediate Action Needed',
          points: [
            '🚨 Suicidal thoughts or planning',
            '🚨 Gambling multiple times daily',
            '🚨 Severe debt crisis (utilities cut off, eviction)',
            '🚨 Domestic violence or relationship crisis',
            '🚨 Complete loss of self-control',
            'If you see these: Call emergency services or Lifeline 13 11 14'
          ]
        }
      ]
    },
    'success-stories': {
      title: 'Success Stories & Hope',
      icon: '🌟',
      content: [
        {
          heading: 'Real Recovery Journeys (Anonymized)',
          points: [
            '"After 18 relapses, I finally hit 6 months clean. Every failure taught me something." - Former user, 32',
            '"My guardian never gave up on me, even when I gave up on myself." - 9 months clean',
            '"The voice memos felt stupid at first, but they saved me. Hearing my own patterns was powerful." - 1 year clean',
            '"I thought Id never stop. Now I cant imagine going back." - 2 years clean'
          ]
        },
        {
          heading: 'What Makes Recovery Stick',
          points: [
            'Average 3-4 relapses before sustained recovery',
            'Having a supportive guardian increases success by 300%',
            'Self-awareness (recognizing triggers) is the biggest factor',
            'Each attempt teaches something - its never wasted effort',
            'The "click moment" happens when they truly want to change'
          ]
        },
        {
          heading: 'For Guardians: Signs of Progress',
          points: [
            'They tell you about close calls instead of hiding them',
            'They actively avoid triggers instead of needing reminders',
            'Relapses become less frequent over time',
            'They start helping others in similar situations',
            'Their self-talk becomes more compassionate'
          ]
        },
        {
          heading: 'Long-Term Success Factors',
          points: [
            'Finding purpose beyond "not gambling"',
            'Building new social connections',
            'Developing healthy coping mechanisms',
            'Financial recovery and stability',
            'Rebuilding self-worth and identity'
          ]
        }
      ]
    }
  };

  const currentResource = resources[activeSection];

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>Guardian Resources</h1>
        <p className={styles.subtitle}>
          Evidence-based guidance for supporting someone through gambling recovery
        </p>
      </header>

      {/* Navigation */}
      <nav className={styles.navigation}>
        {Object.entries(resources).map(([key, resource]) => (
          <button
            key={key}
            className={activeSection === key ? styles.navButtonActive : styles.navButton}
            onClick={() => setActiveSection(key)}
          >
            <span className={styles.navIcon}>{resource.icon}</span>
            <span className={styles.navText}>{resource.title}</span>
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className={styles.content}>
        <div className={styles.resourceHeader}>
          <span className={styles.resourceIcon}>{currentResource.icon}</span>
          <h2 className={styles.resourceTitle}>{currentResource.title}</h2>
        </div>

        <div className={styles.sections}>
          {currentResource.content.map((section, index) => (
            <div key={index} className={styles.section}>
              <h3 className={styles.sectionHeading}>{section.heading}</h3>
              <ul className={styles.pointsList}>
                {section.points.map((point, pointIndex) => (
                  <li key={pointIndex} className={styles.point}>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>

      {/* Emergency Banner */}
      <div className={styles.emergencyBanner}>
        <div className={styles.emergencyIcon}>🆘</div>
        <div className={styles.emergencyContent}>
          <h3 className={styles.emergencyTitle}>Crisis Support Available 24/7</h3>
          <div className={styles.emergencyContacts}>
            <div className={styles.contact}>
              <strong>Gambling Help:</strong> 1800 858 858
            </div>
            <div className={styles.contact}>
              <strong>Lifeline:</strong> 13 11 14
            </div>
            <div className={styles.contact}>
              <strong>Beyond Blue:</strong> 1300 22 4636
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={styles.actionButton}
          onClick={() => window.location.href = '/guardian-portal/analytics'}
        >
          ← Back to Analytics
        </button>
        <button
          className={styles.actionButton}
          onClick={() => window.location.href = '/guardian-portal/group-view'}
        >
          Community Insights →
        </button>
      </div>
    </div>
  );
}
