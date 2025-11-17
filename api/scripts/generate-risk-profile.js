#!/usr/bin/env node

/**
 * Generate Risk Profile Script
 *
 * Creates comprehensive risk assessment based on gambling baseline
 * Generates:
 * - Risk level (EXTREME/HIGH/MEDIUM/LOW)
 * - Primary gambling type
 * - Trigger patterns
 * - Recommended commitment period
 * - Suggested daily allowance
 * - Guardian importance level
 * - Intervention sensitivity settings
 *
 * Usage:
 *   node generate-risk-profile.js
 *   node generate-risk-profile.js --months=12
 */

const { createClient } = require('@supabase/supabase-js');
const PatternLearner = require('../services/pattern-learner');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Risk level thresholds (weekly averages)
const RISK_THRESHOLDS = {
  EXTREME: 500,  // $500+ per week
  HIGH: 200,     // $200-500 per week
  MEDIUM: 50,    // $50-200 per week
  LOW: 0         // < $50 per week
};

class RiskProfileGenerator {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.patternLearner = new PatternLearner(supabaseClient);
  }

  /**
   * Generate comprehensive risk profile
   */
  async generate(options = {}) {
    console.log('🎯 Generating risk profile...\n');

    const { startDate, endDate } = this._parseOptions(options);

    try {
      // Get baseline analysis
      const baseline = await this._getBaseline(startDate, endDate);

      if (!baseline) {
        console.log('❌ No baseline data found. Please run analyze-gambling-baseline.js first.');
        return null;
      }

      console.log('📊 Baseline loaded successfully\n');

      // Generate comprehensive profile
      const profile = this._generateProfile(baseline);

      // Print profile
      this._printProfile(profile);

      // Save profile
      await this._saveProfile(profile);

      return profile;
    } catch (error) {
      console.error('❌ Risk profile generation failed:', error);
      throw error;
    }
  }

  /**
   * Parse command-line options
   */
  _parseOptions(options) {
    let startDate, endDate;

    if (options.months) {
      endDate = new Date();
      startDate = new Date();
      startDate.setMonth(endDate.getMonth() - parseInt(options.months));
    } else {
      // Default to 12 months
      endDate = new Date();
      startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 12);
    }

    return { startDate, endDate };
  }

  /**
   * Get baseline analysis
   */
  async _getBaseline(startDate, endDate) {
    try {
      // First try to get from baseline_analysis table
      const { data: savedBaseline } = await this.supabase
        .from('baseline_analysis')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (savedBaseline) {
        return savedBaseline.analysis_data || savedBaseline;
      }

      // If not found, calculate fresh baseline
      console.log('⚠️  No saved baseline found, calculating fresh baseline...\n');

      const { data: transactions } = await this.supabase
        .from('transactions')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: true });

      if (!transactions || transactions.length === 0) {
        return null;
      }

      return await this.patternLearner.calculateBaseline(null, startDate, endDate);
    } catch (error) {
      console.error('Error getting baseline:', error);
      return null;
    }
  }

  /**
   * Generate comprehensive risk profile
   */
  _generateProfile(baseline) {
    console.log('🔍 Analyzing risk factors...\n');

    // Calculate risk level
    const riskLevel = this._calculateRiskLevel(baseline);

    // Determine primary gambling type
    const primaryType = this._determinePrimaryType(baseline);

    // Identify trigger patterns
    const triggers = this._identifyTriggers(baseline);

    // Recommend commitment period
    const commitmentPeriod = this._recommendCommitmentPeriod(riskLevel, baseline);

    // Suggest daily allowance
    const dailyAllowance = this._suggestDailyAllowance(baseline);

    // Determine guardian importance
    const guardianImportance = this._assessGuardianImportance(riskLevel, baseline);

    // Set intervention sensitivity
    const interventionSensitivity = this._setInterventionSensitivity(riskLevel, baseline);

    // Generate personalized recommendations
    const recommendations = this._generateRecommendations(riskLevel, baseline);

    // Calculate success probability
    const successProbability = this._calculateSuccessProbability(baseline);

    return {
      riskLevel,
      riskScore: this._calculateRiskScore(baseline),
      primaryType,
      triggers,
      commitmentPeriod,
      dailyAllowance,
      guardianImportance,
      interventionSensitivity,
      recommendations,
      successProbability,
      baseline: {
        averageWeekly: baseline.averageWeekly,
        averageMonthly: baseline.averageMonthly,
        totalLost: baseline.totalLost,
        transactionCount: baseline.transactionCount,
        projectedYearlySavings: baseline.projectedYearlySavings
      },
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Calculate risk level
   */
  _calculateRiskLevel(baseline) {
    const weeklyAverage = baseline.averageWeekly;

    if (weeklyAverage >= RISK_THRESHOLDS.EXTREME) return 'EXTREME';
    if (weeklyAverage >= RISK_THRESHOLDS.HIGH) return 'HIGH';
    if (weeklyAverage >= RISK_THRESHOLDS.MEDIUM) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate numeric risk score (0-100)
   */
  _calculateRiskScore(baseline) {
    let score = 0;

    // Weekly average component (40 points max)
    const weeklyRatio = Math.min(baseline.averageWeekly / RISK_THRESHOLDS.EXTREME, 1);
    score += weeklyRatio * 40;

    // Escalation component (15 points)
    if (baseline.hasEscalation) score += 15;

    // Binge patterns (15 points)
    if (baseline.bingeCount > 0) {
      score += Math.min(baseline.bingeCount * 3, 15);
    }

    // Frequency component (15 points)
    const weeklyFrequency = baseline.transactionCount / (baseline.averageWeekly > 0 ? 52 : 1);
    score += Math.min(weeklyFrequency * 2, 15);

    // Pattern diversity (15 points)
    if (baseline.patterns && baseline.patterns.length > 3) {
      score += 15;
    } else if (baseline.patterns && baseline.patterns.length > 1) {
      score += 10;
    }

    return Math.min(Math.round(score), 100);
  }

  /**
   * Determine primary gambling type
   */
  _determinePrimaryType(baseline) {
    if (!baseline.typeBreakdown) return 'Unknown';

    const types = Object.entries(baseline.typeBreakdown);
    if (types.length === 0) return 'Unknown';

    const primary = types.reduce((max, current) =>
      current[1].total > max[1].total ? current : max
    );

    return primary[0];
  }

  /**
   * Identify trigger patterns
   */
  _identifyTriggers(baseline) {
    const triggers = [];

    // Primary trigger from baseline
    if (baseline.primaryTrigger && baseline.primaryTrigger !== 'Unknown') {
      triggers.push({
        name: baseline.primaryTrigger,
        priority: 'HIGH'
      });
    }

    // Day of week triggers
    if (baseline.dayBreakdown) {
      const sortedDays = Object.entries(baseline.dayBreakdown)
        .sort((a, b) => b[1].count - a[1].count);

      if (sortedDays[0] && sortedDays[0][1].count > 0) {
        triggers.push({
          name: `${sortedDays[0][0]} pattern`,
          priority: 'MEDIUM'
        });
      }
    }

    // Time of day triggers
    if (baseline.timeBreakdown) {
      const sortedTimes = Object.entries(baseline.timeBreakdown)
        .sort((a, b) => b[1].count - a[1].count);

      if (sortedTimes[0] && sortedTimes[0][1].count > 0) {
        triggers.push({
          name: sortedTimes[0][0],
          priority: 'MEDIUM'
        });
      }
    }

    // Binge pattern trigger
    if (baseline.bingeCount > 2) {
      triggers.push({
        name: 'Binge gambling episodes',
        priority: 'HIGH'
      });
    }

    // Escalation trigger
    if (baseline.hasEscalation) {
      triggers.push({
        name: 'Increasing bet amounts',
        priority: 'HIGH'
      });
    }

    return triggers;
  }

  /**
   * Recommend commitment period
   */
  _recommendCommitmentPeriod(riskLevel, baseline) {
    switch (riskLevel) {
      case 'EXTREME':
        return {
          days: 90,
          reason: 'Severe gambling pattern requires extended commitment period',
          allowEarlyRelease: false
        };
      case 'HIGH':
        return {
          days: 60,
          reason: 'High risk requires substantial commitment to break patterns',
          allowEarlyRelease: false
        };
      case 'MEDIUM':
        return {
          days: 30,
          reason: 'Moderate commitment needed to establish new habits',
          allowEarlyRelease: true
        };
      case 'LOW':
        return {
          days: 14,
          reason: 'Short commitment to build awareness',
          allowEarlyRelease: true
        };
      default:
        return {
          days: 30,
          reason: 'Standard commitment period',
          allowEarlyRelease: true
        };
    }
  }

  /**
   * Suggest daily allowance
   */
  _suggestDailyAllowance(baseline) {
    // Start with weekly average divided by 7
    const baseAllowance = baseline.averageWeekly / 7;

    // Suggest 20% of baseline for gradual reduction
    const suggested = Math.round(baseAllowance * 0.2);

    // Minimum $10, maximum $100
    const clamped = Math.max(10, Math.min(100, suggested));

    return {
      amount: clamped,
      reasoning: `Based on 20% of your average daily spending ($${baseAllowance.toFixed(2)}). This allows for essential purchases while preventing gambling.`,
      recommendedReviewPeriod: 7 // days
    };
  }

  /**
   * Assess guardian importance
   */
  _assessGuardianImportance(riskLevel, baseline) {
    let importance, requirements;

    switch (riskLevel) {
      case 'EXTREME':
        importance = 'CRITICAL';
        requirements = {
          mustHaveGuardian: true,
          minimumGuardians: 2,
          requiresDailyCheckIns: true,
          canOverrideCommitment: false
        };
        break;
      case 'HIGH':
        importance = 'ESSENTIAL';
        requirements = {
          mustHaveGuardian: true,
          minimumGuardians: 1,
          requiresDailyCheckIns: false,
          canOverrideCommitment: false
        };
        break;
      case 'MEDIUM':
        importance = 'RECOMMENDED';
        requirements = {
          mustHaveGuardian: false,
          minimumGuardians: 1,
          requiresDailyCheckIns: false,
          canOverrideCommitment: true
        };
        break;
      default:
        importance = 'OPTIONAL';
        requirements = {
          mustHaveGuardian: false,
          minimumGuardians: 0,
          requiresDailyCheckIns: false,
          canOverrideCommitment: true
        };
    }

    return { importance, requirements };
  }

  /**
   * Set intervention sensitivity
   */
  _setInterventionSensitivity(riskLevel, baseline) {
    const settings = {
      minTransactionAmount: 0,
      requireVoiceMemo: false,
      notifyGuardian: false,
      blockTransaction: false
    };

    switch (riskLevel) {
      case 'EXTREME':
        settings.minTransactionAmount = 20;
        settings.requireVoiceMemo = true;
        settings.notifyGuardian = true;
        settings.blockTransaction = false; // Allow with voice memo
        break;
      case 'HIGH':
        settings.minTransactionAmount = 50;
        settings.requireVoiceMemo = true;
        settings.notifyGuardian = true;
        settings.blockTransaction = false;
        break;
      case 'MEDIUM':
        settings.minTransactionAmount = 100;
        settings.requireVoiceMemo = true;
        settings.notifyGuardian = false;
        settings.blockTransaction = false;
        break;
      case 'LOW':
        settings.minTransactionAmount = 200;
        settings.requireVoiceMemo = false;
        settings.notifyGuardian = false;
        settings.blockTransaction = false;
        break;
    }

    return settings;
  }

  /**
   * Generate personalized recommendations
   */
  _generateRecommendations(riskLevel, baseline) {
    const recommendations = [];

    // Risk-specific recommendations
    if (riskLevel === 'EXTREME' || riskLevel === 'HIGH') {
      recommendations.push({
        priority: 'URGENT',
        category: 'professional_help',
        title: 'Seek Professional Help',
        description: 'Your gambling pattern indicates a severe problem. Please contact Gambling Help on 1800 858 858 for free, confidential support.'
      });

      recommendations.push({
        priority: 'HIGH',
        category: 'self_exclusion',
        title: 'Register for Self-Exclusion',
        description: 'Register on your state\'s self-exclusion program to ban yourself from gambling venues and online platforms.'
      });
    }

    // Guardian recommendation
    if (baseline.hasEscalation || baseline.bingeCount > 2) {
      recommendations.push({
        priority: 'HIGH',
        category: 'support',
        title: 'Set Up Guardian Network',
        description: 'Your patterns show escalation and binge behavior. A guardian can provide crucial support during vulnerable moments.'
      });
    }

    // Trigger-based recommendations
    if (baseline.primaryTrigger?.includes('Payday')) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'strategy',
        title: 'Payday Protection',
        description: 'Set up automatic transfers to savings on payday to remove temptation. Consider having guardian monitor your account on payday.'
      });
    }

    // Time-based recommendations
    if (baseline.timeBreakdown?.['Late Night (10pm-6am)']?.count > 5) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'strategy',
        title: 'Late Night Safeguards',
        description: 'Your gambling peaks late at night. Consider phone-free bedtime routines and blocking gambling apps after 10pm.'
      });
    }

    // Financial recommendations
    recommendations.push({
      priority: 'MEDIUM',
      category: 'financial',
      title: 'Redirect Savings',
      description: `You could save $${baseline.projectedYearlySavings.toFixed(2)} per year. Set up automatic savings and visualize your progress.`
    });

    // Whitelist recommendation
    recommendations.push({
      priority: 'LOW',
      category: 'setup',
      title: 'Complete Whitelist',
      description: 'Add all your regular bills and essential merchants to your whitelist to reduce alert fatigue.'
    });

    return recommendations;
  }

  /**
   * Calculate success probability
   */
  _calculateSuccessProbability(baseline) {
    let probability = 70; // Base probability

    // Reduce for severe patterns
    if (baseline.averageWeekly > RISK_THRESHOLDS.EXTREME) probability -= 20;
    else if (baseline.averageWeekly > RISK_THRESHOLDS.HIGH) probability -= 10;

    // Reduce for escalation
    if (baseline.hasEscalation) probability -= 15;

    // Reduce for high frequency
    if (baseline.transactionCount > 100) probability -= 10;

    // Increase for long streaks
    if (baseline.streaks?.longestStreak > 30) probability += 10;

    // Increase for low binge count
    if (baseline.bingeCount === 0) probability += 5;

    return Math.max(10, Math.min(95, probability));
  }

  /**
   * Print risk profile
   */
  _printProfile(profile) {
    console.log('\n' + '='.repeat(70));
    console.log('🎯 PERSONALIZED RISK PROFILE');
    console.log('='.repeat(70));

    console.log(`\n⚠️  RISK LEVEL: ${profile.riskLevel}`);
    console.log(`📊 Risk Score: ${profile.riskScore}/100`);
    console.log(`🎰 Primary Gambling Type: ${profile.primaryType}`);
    console.log(`📈 Success Probability: ${profile.successProbability}%`);

    console.log(`\n🎯 IDENTIFIED TRIGGERS:`);
    profile.triggers.forEach(trigger => {
      console.log(`   [${trigger.priority}] ${trigger.name}`);
    });

    console.log(`\n⏱️  RECOMMENDED COMMITMENT:`);
    console.log(`   Period: ${profile.commitmentPeriod.days} days`);
    console.log(`   Reason: ${profile.commitmentPeriod.reason}`);
    console.log(`   Early Release: ${profile.commitmentPeriod.allowEarlyRelease ? 'Allowed' : 'Not Allowed'}`);

    console.log(`\n💰 DAILY ALLOWANCE:`);
    console.log(`   Suggested Amount: $${profile.dailyAllowance.amount}`);
    console.log(`   Reasoning: ${profile.dailyAllowance.reasoning}`);
    console.log(`   Review Period: Every ${profile.dailyAllowance.recommendedReviewPeriod} days`);

    console.log(`\n👥 GUARDIAN IMPORTANCE: ${profile.guardianImportance.importance}`);
    console.log(`   Must Have Guardian: ${profile.guardianImportance.requirements.mustHaveGuardian ? 'YES' : 'No'}`);
    console.log(`   Minimum Guardians: ${profile.guardianImportance.requirements.minimumGuardians}`);
    console.log(`   Daily Check-ins Required: ${profile.guardianImportance.requirements.requiresDailyCheckIns ? 'YES' : 'No'}`);

    console.log(`\n🔔 INTERVENTION SETTINGS:`);
    console.log(`   Alert Threshold: $${profile.interventionSensitivity.minTransactionAmount}`);
    console.log(`   Require Voice Memo: ${profile.interventionSensitivity.requireVoiceMemo ? 'YES' : 'No'}`);
    console.log(`   Notify Guardian: ${profile.interventionSensitivity.notifyGuardian ? 'YES' : 'No'}`);

    console.log(`\n💡 PERSONALIZED RECOMMENDATIONS:`);
    profile.recommendations.forEach((rec, index) => {
      console.log(`\n   ${index + 1}. [${rec.priority}] ${rec.title}`);
      console.log(`      ${rec.description}`);
    });

    console.log('\n' + '='.repeat(70) + '\n');
  }

  /**
   * Save profile to database
   */
  async _saveProfile(profile) {
    try {
      const { data, error } = await this.supabase
        .from('risk_profiles')
        .insert({
          risk_level: profile.riskLevel,
          risk_score: profile.riskScore,
          primary_type: profile.primaryType,
          triggers: profile.triggers,
          commitment_period_days: profile.commitmentPeriod.days,
          daily_allowance: profile.dailyAllowance.amount,
          guardian_importance: profile.guardianImportance.importance,
          intervention_settings: profile.interventionSensitivity,
          recommendations: profile.recommendations,
          success_probability: profile.successProbability,
          profile_data: profile,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.log('⚠️  Note: Could not save profile to database (table may not exist yet)');
      } else {
        console.log('✅ Risk profile saved to database\n');
      }
    } catch (error) {
      console.log('⚠️  Note: Could not save profile to database:', error.message);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command-line arguments
  args.forEach(arg => {
    const [key, value] = arg.replace('--', '').split('=');
    options[key] = value;
  });

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
    process.exit(1);
  }

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Create generator and run
  const generator = new RiskProfileGenerator(supabase);

  try {
    await generator.generate(options);
    console.log('✅ Risk profile generated successfully!\n');
    console.log('💡 Next step: Review your profile and set up guardians in the mobile app\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Generation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = RiskProfileGenerator;
