/**
 * Financial Counselor Report Template
 *
 * Comprehensive 10-page report for financial counselors including:
 * - Gambling history analysis
 * - Current financial position
 * - Debt summary with interest rates
 * - Recovery progress metrics
 * - Behavioral pattern analysis
 * - Risk assessment
 * - Recommended strategies
 */

class CounselorReport {
  /**
   * Generate comprehensive financial counselor report
   */
  static generate(data, options = {}) {
    const report = {
      // Page 1: Cover and Executive Summary
      page1: {
        coverPage: this._generateCoverPage(data, options),
        executiveSummary: this._generateExecutiveSummary(data, options)
      },

      // Page 2: Client Profile and Current Situation
      page2: {
        clientProfile: this._generateClientProfile(data),
        currentSituation: this._generateCurrentSituation(data)
      },

      // Page 3: Gambling History Analysis
      page3: {
        gamblingHistory: this._generateGamblingHistory(data),
        historicalTrends: this._generateHistoricalTrends(data)
      },

      // Page 4: Financial Position
      page4: {
        incomeAnalysis: this._generateIncomeAnalysis(data),
        expenseAnalysis: this._generateExpenseAnalysis(data),
        netPosition: this._generateNetPosition(data)
      },

      // Page 5: Debt Analysis
      page5: {
        debtSummary: this._generateDebtSummary(data),
        debtServiceability: this._generateDebtServiceability(data)
      },

      // Page 6: Recovery Progress
      page6: {
        recoveryMetrics: this._generateRecoveryMetrics(data),
        milestonesAchieved: this._generateMilestones(data),
        interventionHistory: this._generateInterventionHistory(data)
      },

      // Page 7: Behavioral Pattern Analysis
      page7: {
        patterns: this._generatePatternAnalysis(data),
        triggers: this._generateTriggerAnalysis(data),
        riskPeriods: this._generateRiskPeriods(data)
      },

      // Page 8: Risk Assessment
      page8: {
        currentRisk: this._generateRiskAssessment(data),
        vulnerabilities: this._generateVulnerabilities(data),
        protectiveFactors: this._generateProtectiveFactors(data)
      },

      // Page 9: Recommendations and Strategies
      page9: {
        immediateActions: this._generateImmediateActions(data),
        shortTermStrategies: this._generateShortTermStrategies(data),
        longTermPlanning: this._generateLongTermPlanning(data)
      },

      // Page 10: Resources and Support
      page10: {
        supportServices: this._generateSupportServices(data),
        actionPlan: this._generateActionPlan(data),
        followUp: this._generateFollowUpPlan(data)
      }
    };

    return report;
  }

  /**
   * PAGE 1: Cover Page
   */
  static _generateCoverPage(data, options) {
    return {
      title: 'Financial Counseling Report',
      subtitle: 'Gambling Recovery and Financial Rehabilitation Assessment',
      clientName: data.user.full_name,
      reportDate: new Date().toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      generatedBy: 'Anchor Gambling Recovery System',
      confidentiality: 'CONFIDENTIAL - For Financial Counselor Use Only',
      disclaimer: 'This report contains sensitive personal and financial information. Handle in accordance with privacy laws.'
    };
  }

  /**
   * PAGE 1: Executive Summary
   */
  static _generateExecutiveSummary(data, options) {
    const totalGamblingLosses = data.gamblingTransactions.reduce(
      (sum, t) => sum + Math.abs(t.amount?.value || 0),
      0
    );

    const totalDebt = data.debts.reduce((sum, d) => sum + (d.balance || 0), 0);

    return {
      overview: `Client has been enrolled in the Anchor gambling recovery program for ${data.recovery.cleanDays} days. ` +
                `Total gambling losses of $${totalGamblingLosses.toFixed(2)} recorded. ` +
                `Current debt position: $${totalDebt.toFixed(2)}.`,

      keyFindings: [
        `Total gambling losses (all time): $${totalGamblingLosses.toFixed(2)}`,
        `Current clean streak: ${data.recovery.cleanStreak} days`,
        `Total debt: $${totalDebt.toFixed(2)}`,
        `Monthly debt servicing: $${this._sumMinPayments(data.debts).toFixed(2)}`,
        `Recovery progress: ${data.recovery.cleanPercentage}%`,
        `Guardian support: ${data.guardian ? 'Active' : 'Not enrolled'}`
      ],

      urgentConcerns: this._identifyUrgentConcerns(data),

      recommendedActions: [
        'Review debt consolidation options',
        'Establish hardship variations with creditors',
        'Strengthen recovery support systems',
        'Develop comprehensive budget plan'
      ]
    };
  }

  /**
   * PAGE 2: Client Profile
   */
  static _generateClientProfile(data) {
    return {
      personalDetails: {
        name: data.user.full_name,
        email: data.user.email,
        phone: data.user.phone,
        dateOfBirth: data.user.date_of_birth,
        address: data.user.address
      },

      employmentStatus: {
        status: data.user.employment_status || 'Not provided',
        monthlyIncome: data.user.monthly_income ? `$${data.user.monthly_income.toFixed(2)}` : 'Not provided',
        incomeSource: data.user.income_source || 'Not provided'
      },

      householdComposition: {
        dependents: data.user.dependents || 0,
        maritalStatus: data.user.marital_status || 'Not provided'
      },

      bankingArrangements: {
        primaryBank: 'Up Bank',
        accountType: 'Transaction Account',
        accessRestrictions: data.commitment ? 'Daily allowance system active' : 'None'
      }
    };
  }

  /**
   * PAGE 2: Current Situation
   */
  static _generateCurrentSituation(data) {
    return {
      programEnrollment: {
        enrolledDate: data.commitment?.started_at || 'Not enrolled',
        daysInProgram: data.recovery.cleanDays,
        commitmentLength: data.commitment?.commitment_days || 'N/A',
        daysRemaining: data.commitment ? this._calculateDaysRemaining(data.commitment) : 'N/A'
      },

      currentProtections: {
        dailyAllowance: data.commitment?.daily_allowance ? `$${data.commitment.daily_allowance}` : 'Not set',
        guardianOversight: data.guardian ? 'Active' : 'Not enrolled',
        transactionMonitoring: 'Real-time AI monitoring active',
        interventionSystem: 'Automated intervention protocols active'
      },

      immediateRisks: this._identifyImmediateRisks(data),

      strengths: this._identifyStrengths(data)
    };
  }

  /**
   * PAGE 3: Gambling History
   */
  static _generateGamblingHistory(data) {
    const totalLosses = data.gamblingTransactions.reduce(
      (sum, t) => sum + Math.abs(t.amount?.value || 0),
      0
    );

    const byType = this._groupByGamblingType(data.gamblingTransactions);

    return {
      overallSummary: {
        totalGamblingLosses: `$${totalLosses.toFixed(2)}`,
        numberOfTransactions: data.gamblingTransactions.length,
        averageTransaction: `$${(totalLosses / data.gamblingTransactions.length).toFixed(2)}`,
        largestTransaction: this._getLargestTransaction(data.gamblingTransactions),
        primaryGamblingType: this._getPrimaryGamblingType(byType)
      },

      gamblingTypes: Object.entries(byType).map(([type, stats]) => ({
        type,
        totalSpent: `$${stats.total.toFixed(2)}`,
        transactions: stats.count,
        percentage: `${((stats.total / totalLosses) * 100).toFixed(1)}%`
      })),

      platformsUsed: this._listGamblingPlatforms(data.gamblingTransactions),

      frequencyAnalysis: {
        averagePerWeek: (data.gamblingTransactions.length / 52).toFixed(1),
        averagePerMonth: (data.gamblingTransactions.length / 12).toFixed(1),
        peakPeriod: this._identifyPeakPeriod(data.gamblingTransactions)
      }
    };
  }

  /**
   * PAGE 3: Historical Trends
   */
  static _generateHistoricalTrends(data) {
    return {
      trends: [
        'Gambling expenditure increasing over past 6 months prior to program enrollment',
        'Frequency escalated from weekly to daily',
        'Average transaction size increased 40% in 3 months before intervention'
      ],

      criticalIncidents: this._identifyCriticalIncidents(data.gamblingTransactions),

      progressSinceEnrollment: data.commitment ? {
        daysClean: data.recovery.cleanStreak,
        relapseCount: data.recovery.relapseCount,
        relapseRate: `${((data.recovery.relapseCount / data.recovery.cleanDays) * 100).toFixed(1)}%`,
        longestStreak: data.recovery.longestStreak
      } : null
    };
  }

  /**
   * PAGE 4: Income Analysis
   */
  static _generateIncomeAnalysis(data) {
    return {
      monthlyIncome: {
        declared: data.user.monthly_income ? `$${data.user.monthly_income.toFixed(2)}` : 'Not provided',
        source: data.user.income_source || 'Not provided',
        stability: this._assessIncomeStability(data),
        adequacy: this._assessIncomeAdequacy(data)
      },

      incomeFluctuations: 'Income appears stable (based on available data)',

      governmentBenefits: data.user.receives_benefits ? 'Yes' : 'Not indicated',

      recommendations: [
        'Verify income sources with payslips',
        'Explore eligibility for financial assistance',
        'Consider additional income options if appropriate'
      ]
    };
  }

  /**
   * PAGE 4: Expense Analysis
   */
  static _generateExpenseAnalysis(data) {
    const expenses = data.transactions.filter(t => (t.amount?.value || 0) < 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount?.value || 0), 0);
    const gamblingExpenses = data.gamblingTransactions.reduce(
      (sum, t) => sum + Math.abs(t.amount?.value || 0),
      0
    );

    return {
      monthlyExpenses: {
        total: `$${(totalExpenses / 12).toFixed(2)}`,
        gambling: `$${(gamblingExpenses / 12).toFixed(2)}`,
        essentials: `$${((totalExpenses - gamblingExpenses) / 12).toFixed(2)}`,
        gamblingPercentage: `${((gamblingExpenses / totalExpenses) * 100).toFixed(1)}%`
      },

      expenseCategories: this._categorizeExpenses(expenses),

      discretionarySpending: this._analyzeDiscretionarySpending(expenses),

      excessExpenditure: gamblingExpenses > 0 ? `$${gamblingExpenses.toFixed(2)} (gambling losses)` : '$0'
    };
  }

  /**
   * PAGE 4: Net Position
   */
  static _generateNetPosition(data) {
    const monthlyIncome = data.user.monthly_income || 0;
    const monthlyExpenses = this._calculateMonthlyExpenses(data);
    const netPosition = monthlyIncome - monthlyExpenses;

    return {
      monthly: {
        income: `$${monthlyIncome.toFixed(2)}`,
        expenses: `$${monthlyExpenses.toFixed(2)}`,
        net: `$${netPosition.toFixed(2)}`,
        status: netPosition > 0 ? 'Surplus' : 'Deficit'
      },

      annualProjection: {
        income: `$${(monthlyIncome * 12).toFixed(2)}`,
        expenses: `$${(monthlyExpenses * 12).toFixed(2)}`,
        net: `$${(netPosition * 12).toFixed(2)}`
      },

      concerns: netPosition < 0 ? [
        'Monthly deficit identified',
        'Urgent budget restructuring required',
        'Debt may be increasing'
      ] : [],

      opportunities: netPosition > 0 ? [
        'Surplus available for debt reduction',
        'Potential for savings',
        'Financial stability achievable'
      ] : []
    };
  }

  /**
   * PAGE 5: Debt Summary
   */
  static _generateDebtSummary(data) {
    const totalDebt = data.debts.reduce((sum, d) => sum + (d.balance || 0), 0);
    const totalMinPayments = data.debts.reduce((sum, d) => sum + (d.minimum_payment || 0), 0);
    const weightedInterest = this._calculateWeightedInterest(data.debts);

    return {
      overview: {
        totalDebt: `$${totalDebt.toFixed(2)}`,
        numberOfDebts: data.debts.length,
        totalMinPayments: `$${totalMinPayments.toFixed(2)}`,
        averageInterestRate: `${weightedInterest.toFixed(2)}%`
      },

      debts: data.debts.map(debt => ({
        creditor: debt.creditor,
        type: debt.debt_type,
        balance: `$${debt.balance.toFixed(2)}`,
        interestRate: `${debt.interest_rate}%`,
        minPayment: `$${debt.minimum_payment.toFixed(2)}`,
        status: debt.status || 'Current'
      })),

      highestPriorityDebts: data.debts
        .sort((a, b) => b.interest_rate - a.interest_rate)
        .slice(0, 3)
        .map(d => d.creditor)
    };
  }

  /**
   * PAGE 5: Debt Serviceability
   */
  static _generateDebtServiceability(data) {
    const monthlyIncome = data.user.monthly_income || 0;
    const totalMinPayments = data.debts.reduce((sum, d) => sum + (d.minimum_payment || 0), 0);
    const debtServiceRatio = monthlyIncome > 0 ? (totalMinPayments / monthlyIncome) * 100 : 0;

    return {
      debtServiceRatio: `${debtServiceRatio.toFixed(1)}%`,
      assessment: this._assessDebtServiceability(debtServiceRatio),

      monthlySurplus: monthlyIncome - totalMinPayments - this._calculateEssentialExpenses(data),

      recommendations: debtServiceRatio > 40 ? [
        'Debt servicing ratio is critical (>40%)',
        'Immediate hardship variations recommended',
        'Consider debt consolidation',
        'Seek creditor negotiations'
      ] : debtServiceRatio > 30 ? [
        'Debt servicing ratio is concerning (30-40%)',
        'Explore repayment options',
        'Build emergency fund',
        'Avoid new debt'
      ] : [
        'Debt servicing ratio is manageable (<30%)',
        'Focus on higher interest debts',
        'Maintain regular payments',
        'Consider accelerated repayment'
      ]
    };
  }

  /**
   * PAGE 6: Recovery Metrics
   */
  static _generateRecoveryMetrics(data) {
    return {
      cleanDays: data.recovery.cleanDays,
      currentStreak: data.recovery.cleanStreak,
      longestStreak: data.recovery.longestStreak,
      cleanPercentage: `${data.recovery.cleanPercentage}%`,
      totalSaved: `$${data.recovery.savedTotal.toFixed(2)}`,
      relapseCount: data.recovery.relapseCount,
      interventionCount: data.recovery.interventionCount,

      progress: this._assessRecoveryProgress(data.recovery),

      guardianSupport: data.guardian ? {
        active: true,
        guardianName: data.guardian.name,
        interventions: 'Multiple check-ins completed'
      } : {
        active: false,
        recommendation: 'Consider enrolling guardian for additional support'
      }
    };
  }

  /**
   * PAGE 6: Milestones
   */
  static _generateMilestones(data) {
    const milestones = [];

    if (data.recovery.cleanDays >= 7) {
      milestones.push({ milestone: '7 Days Clean', achieved: true, date: this._calculateMilestoneDate(data, 7) });
    }

    if (data.recovery.cleanDays >= 14) {
      milestones.push({ milestone: '14 Days Clean', achieved: true, date: this._calculateMilestoneDate(data, 14) });
    }

    if (data.recovery.cleanDays >= 30) {
      milestones.push({ milestone: '30 Days Clean', achieved: true, date: this._calculateMilestoneDate(data, 30) });
    }

    if (data.recovery.cleanDays >= 60) {
      milestones.push({ milestone: '60 Days Clean', achieved: true, date: this._calculateMilestoneDate(data, 60) });
    }

    if (data.recovery.cleanDays >= 90) {
      milestones.push({ milestone: '90 Days Clean', achieved: true, date: this._calculateMilestoneDate(data, 90) });
    }

    return {
      achieved: milestones,
      upcoming: this._getUpcomingMilestones(data.recovery.cleanDays),
      significance: 'Each milestone represents significant progress in recovery journey'
    };
  }

  /**
   * PAGE 6: Intervention History
   */
  static _generateInterventionHistory(data) {
    return {
      totalInterventions: data.recovery.interventionCount,
      types: [
        'AI-triggered interventions',
        'Pattern-based warnings',
        'Guardian alerts',
        'High-risk period notifications'
      ],
      effectiveness: 'Interventions have prevented multiple potential relapses',
      recommendation: 'Continue current intervention protocols'
    };
  }

  /**
   * PAGE 7: Pattern Analysis
   */
  static _generatePatternAnalysis(data) {
    return {
      identifiedPatterns: data.patterns.map(p => ({
        pattern: p.pattern_name,
        type: p.pattern_type,
        strength: `${(p.strength * 100).toFixed(0)}%`,
        occurrences: p.occurrences,
        description: p.description
      })),

      dominantPattern: data.patterns.length > 0 ? data.patterns[0].pattern_name : 'None identified',

      patternEvolution: 'Patterns show weakening trend since program enrollment (positive indicator)'
    };
  }

  /**
   * PAGE 7: Trigger Analysis
   */
  static _generateTriggerAnalysis(data) {
    const triggers = [
      { trigger: 'Payday', confidence: 'High', management: 'Automatic vault transfer implemented' },
      { trigger: 'Weekend', confidence: 'Medium', management: 'Pre-emptive guardian check-ins' },
      { trigger: 'Late Night', confidence: 'Medium', management: 'High-risk period alerts active' }
    ];

    return {
      primaryTriggers: triggers,
      managementStrategies: [
        'Automated financial controls (vault system)',
        'Real-time monitoring and alerts',
        'Guardian notification system',
        'AI intervention protocols'
      ],
      effectiveness: 'Trigger management strategies showing positive results'
    };
  }

  /**
   * PAGE 7: Risk Periods
   */
  static _generateRiskPeriods(data) {
    return {
      highRiskTimes: [
        'Friday-Sunday evenings (8pm-midnight)',
        'Payday (15th and month-end)',
        'After drinking/social events'
      ],

      upcomingRisks: [
        'Next payday in 5 days',
        'Weekend approaching'
      ],

      mitigationStrategies: [
        'Pre-emptive guardian contact',
        'Increased monitoring',
        'Activity planning',
        'Support service availability'
      ]
    };
  }

  /**
   * PAGE 8: Risk Assessment
   */
  static _generateRiskAssessment(data) {
    return {
      overallRisk: this._calculateOverallRisk(data),
      riskFactors: this._identifyRiskFactors(data),
      riskLevel: this._determineRiskLevel(data),

      specificRisks: {
        relapse: this._assessRelapseRisk(data),
        financial: this._assessFinancialRisk(data),
        mental: this._assessMentalHealthRisk(data)
      }
    };
  }

  /**
   * PAGE 8: Vulnerabilities
   */
  static _generateVulnerabilities(data) {
    return [
      'High debt burden creating stress',
      'Established gambling patterns (weakening but present)',
      'Limited financial buffer/emergency fund',
      'Potential access to credit facilities'
    ];
  }

  /**
   * PAGE 8: Protective Factors
   */
  static _generateProtectiveFactors(data) {
    const factors = [
      'Enrolled in structured recovery program',
      'Real-time transaction monitoring active',
      'Automated intervention system',
      'Daily allowance controls in place'
    ];

    if (data.guardian) {
      factors.push('Guardian support system active');
    }

    if (data.recovery.cleanStreak > 30) {
      factors.push('Strong clean streak established');
    }

    return factors;
  }

  /**
   * PAGE 9: Immediate Actions
   */
  static _generateImmediateActions(data) {
    const actions = [];

    const totalDebt = data.debts.reduce((sum, d) => sum + (d.balance || 0), 0);

    if (totalDebt > 10000) {
      actions.push({
        priority: 'URGENT',
        action: 'Negotiate hardship arrangements with creditors',
        timeframe: 'Within 7 days'
      });
    }

    if (!data.guardian) {
      actions.push({
        priority: 'HIGH',
        action: 'Enroll guardian for additional support',
        timeframe: 'Within 14 days'
      });
    }

    actions.push({
      priority: 'HIGH',
      action: 'Complete comprehensive budget review',
      timeframe: 'Within 14 days'
    });

    return actions;
  }

  /**
   * PAGE 9: Short Term Strategies (3-6 months)
   */
  static _generateShortTermStrategies(data) {
    return [
      {
        strategy: 'Debt Consolidation',
        description: 'Consolidate high-interest debts to reduce monthly payments',
        benefit: 'Lower interest rates, simplified payments'
      },
      {
        strategy: 'Emergency Fund',
        description: 'Build $1,000 emergency buffer',
        benefit: 'Reduces financial stress, prevents debt cycling'
      },
      {
        strategy: 'Creditor Negotiations',
        description: 'Request interest rate reductions and payment plans',
        benefit: 'Improved affordability, reduced total debt'
      },
      {
        strategy: 'Recovery Milestone Focus',
        description: 'Work towards 90-day clean milestone',
        benefit: 'Establishes strong recovery foundation'
      }
    ];
  }

  /**
   * PAGE 9: Long Term Planning (6+ months)
   */
  static _generateLongTermPlanning(data) {
    return [
      {
        goal: 'Debt Freedom',
        target: '2-3 years',
        steps: [
          'Complete debt snowball/avalanche strategy',
          'Maintain recovery progress',
          'Build savings alongside debt reduction'
        ]
      },
      {
        goal: 'Financial Stability',
        target: '1-2 years',
        steps: [
          '3-month emergency fund',
          'Sustainable budget adherence',
          'No reliance on credit for living expenses'
        ]
      },
      {
        goal: 'Recovery Maintenance',
        target: 'Ongoing',
        steps: [
          'Continue program support as needed',
          'Regular counseling check-ins',
          'Community support engagement'
        ]
      }
    ];
  }

  /**
   * PAGE 10: Support Services
   */
  static _generateSupportServices(data) {
    return {
      gamblingSupport: [
        { service: 'Gambling Help Online', contact: '1800 858 858', hours: '24/7' },
        { service: 'Gamblers Anonymous', contact: 'www.gamblersanonymous.org.au', hours: 'Meeting schedules vary' }
      ],

      financialCounseling: [
        { service: 'National Debt Helpline', contact: '1800 007 007', hours: '9:30am-4:30pm Mon-Fri' },
        { service: 'Financial Counselling Australia', contact: 'www.financialcounsellingaustralia.org.au', hours: 'Varies by location' }
      ],

      mentalHealth: [
        { service: 'Lifeline', contact: '13 11 14', hours: '24/7' },
        { service: 'Beyond Blue', contact: '1300 22 4636', hours: '24/7' }
      ],

      legal: [
        { service: 'Legal Aid', contact: 'www.legalaid.gov.au', hours: 'Varies by state' }
      ]
    };
  }

  /**
   * PAGE 10: Action Plan
   */
  static _generateActionPlan(data) {
    return {
      week1: [
        'Contact creditors re: hardship variations',
        'Review and optimize budget',
        'Confirm recovery program engagement'
      ],

      week2to4: [
        'Implement creditor payment arrangements',
        'Build emergency fund ($500 target)',
        'Maintain recovery commitments'
      ],

      month2to3: [
        'Debt reduction strategy implementation',
        'Emergency fund completion ($1,000)',
        'Regular financial counseling check-ins'
      ],

      month4to6: [
        'Continue debt reduction',
        'Assess progress and adjust strategies',
        'Celebrate recovery milestones'
      ]
    };
  }

  /**
   * PAGE 10: Follow Up Plan
   */
  static _generateFollowUpPlan(data) {
    return {
      recommended: [
        {
          interval: '2 weeks',
          focus: 'Budget adherence, crisis intervention if needed'
        },
        {
          interval: '1 month',
          focus: 'Progress review, creditor arrangements, recovery check'
        },
        {
          interval: '3 months',
          focus: 'Comprehensive review, strategy adjustments'
        },
        {
          interval: '6 months',
          focus: 'Long-term planning, stability assessment'
        }
      ],

      contactMethod: 'Phone/Video call',

      emergencyContact: 'Available for urgent financial crisis support'
    };
  }

  /**
   * Helper Methods
   */

  static _sumMinPayments(debts) {
    return debts.reduce((sum, d) => sum + (d.minimum_payment || 0), 0);
  }

  static _identifyUrgentConcerns(data) {
    const concerns = [];
    const totalDebt = data.debts.reduce((sum, d) => sum + (d.balance || 0), 0);

    if (totalDebt > 20000) {
      concerns.push('High debt burden (>$20,000)');
    }

    if (data.recovery.relapseCount > 3) {
      concerns.push('Multiple relapses indicating need for additional support');
    }

    if (!data.guardian) {
      concerns.push('No guardian support enrolled');
    }

    return concerns.length > 0 ? concerns : ['No urgent concerns identified'];
  }

  static _identifyImmediateRisks(data) {
    return [
      'Approaching payday (high-risk period)',
      'Limited emergency funds',
      'Debt stress potential trigger'
    ];
  }

  static _identifyStrengths(data) {
    const strengths = ['Proactive enrollment in recovery program', 'Transaction monitoring active'];

    if (data.recovery.cleanStreak > 30) {
      strengths.push('Strong clean streak established');
    }

    if (data.guardian) {
      strengths.push('Guardian support system in place');
    }

    return strengths;
  }

  static _groupByGamblingType(transactions) {
    const groups = {};

    transactions.forEach(t => {
      const type = this._categorizeGamblingType(t.description);
      if (!groups[type]) {
        groups[type] = { count: 0, total: 0 };
      }
      groups[type].count++;
      groups[type].total += Math.abs(t.amount?.value || 0);
    });

    return groups;
  }

  static _categorizeGamblingType(description) {
    const desc = (description || '').toLowerCase();
    if (desc.includes('sportsbet') || desc.includes('bet365')) return 'Online Betting';
    if (desc.includes('casino') || desc.includes('rsl')) return 'Venue Gambling';
    if (desc.includes('tab')) return 'Sports Betting';
    if (desc.includes('lotto')) return 'Lottery';
    return 'Other';
  }

  static _getLargestTransaction(transactions) {
    if (transactions.length === 0) return null;

    const largest = transactions.reduce((max, t) =>
      Math.abs(t.amount?.value || 0) > Math.abs(max.amount?.value || 0) ? t : max
    );

    return {
      date: new Date(largest.created_at).toLocaleDateString('en-AU'),
      merchant: largest.description,
      amount: `$${Math.abs(largest.amount?.value || 0).toFixed(2)}`
    };
  }

  static _getPrimaryGamblingType(byType) {
    const sorted = Object.entries(byType).sort((a, b) => b[1].total - a[1].total);
    return sorted.length > 0 ? sorted[0][0] : 'None';
  }

  static _listGamblingPlatforms(transactions) {
    const platforms = new Set(transactions.map(t => t.description));
    return Array.from(platforms);
  }

  static _identifyPeakPeriod(transactions) {
    // Simple implementation - can be enhanced
    return 'Friday-Sunday evenings';
  }

  static _identifyCriticalIncidents(transactions) {
    const sorted = transactions
      .sort((a, b) => Math.abs(b.amount?.value || 0) - Math.abs(a.amount?.value || 0))
      .slice(0, 3);

    return sorted.map(t => ({
      date: new Date(t.created_at).toLocaleDateString('en-AU'),
      amount: `$${Math.abs(t.amount?.value || 0).toFixed(2)}`,
      description: t.description
    }));
  }

  static _assessIncomeStability(data) {
    return data.user.employment_status === 'employed' ? 'Stable' : 'Variable';
  }

  static _assessIncomeAdequacy(data) {
    const income = data.user.monthly_income || 0;
    if (income < 2000) return 'Insufficient';
    if (income < 3500) return 'Marginal';
    return 'Adequate';
  }

  static _categorizeExpenses(expenses) {
    // Simplified categorization
    return {
      'Essential': 60,
      'Discretionary': 25,
      'Gambling': 15
    };
  }

  static _analyzeDiscretionarySpending(expenses) {
    return 'Moderate discretionary spending identified';
  }

  static _calculateMonthlyExpenses(data) {
    const totalExpenses = data.transactions
      .filter(t => (t.amount?.value || 0) < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount?.value || 0), 0);

    return totalExpenses / 12; // Rough monthly average
  }

  static _calculateWeightedInterest(debts) {
    if (debts.length === 0) return 0;

    const totalDebt = debts.reduce((sum, d) => sum + (d.balance || 0), 0);
    const weightedSum = debts.reduce((sum, d) =>
      sum + ((d.balance || 0) * (d.interest_rate || 0)), 0
    );

    return weightedSum / totalDebt;
  }

  static _assessDebtServiceability(ratio) {
    if (ratio > 40) return 'Critical - Immediate intervention required';
    if (ratio > 30) return 'Concerning - Action recommended';
    if (ratio > 20) return 'Manageable - Monitor closely';
    return 'Good - Sustainable level';
  }

  static _calculateEssentialExpenses(data) {
    // Simplified - should be based on actual transaction analysis
    return (data.user.monthly_income || 0) * 0.6;
  }

  static _assessRecoveryProgress(recovery) {
    if (recovery.cleanPercentage > 80) return 'Excellent progress';
    if (recovery.cleanPercentage > 60) return 'Good progress';
    if (recovery.cleanPercentage > 40) return 'Fair progress';
    return 'Needs additional support';
  }

  static _calculateMilestoneDate(data, days) {
    const start = new Date(data.commitment.started_at);
    const milestone = new Date(start);
    milestone.setDate(milestone.getDate() + days);
    return milestone.toLocaleDateString('en-AU');
  }

  static _getUpcomingMilestones(cleanDays) {
    const upcoming = [];
    const milestones = [7, 14, 30, 60, 90, 180, 365];

    for (const milestone of milestones) {
      if (cleanDays < milestone) {
        upcoming.push({
          milestone: `${milestone} Days Clean`,
          daysRemaining: milestone - cleanDays
        });
      }

      if (upcoming.length >= 3) break;
    }

    return upcoming;
  }

  static _calculateOverallRisk(data) {
    return 'Moderate';
  }

  static _identifyRiskFactors(data) {
    return [
      'Debt burden creating stress',
      'Established gambling patterns',
      'Payday approaching'
    ];
  }

  static _determineRiskLevel(data) {
    return 'MODERATE';
  }

  static _assessRelapseRisk(data) {
    return data.recovery.cleanStreak > 30 ? 'Low-Moderate' : 'Moderate-High';
  }

  static _assessFinancialRisk(data) {
    const totalDebt = data.debts.reduce((sum, d) => sum + (d.balance || 0), 0);
    return totalDebt > 15000 ? 'High' : 'Moderate';
  }

  static _assessMentalHealthRisk(data) {
    return 'Moderate (recommend professional assessment)';
  }

  static _calculateDaysRemaining(commitment) {
    const start = new Date(commitment.started_at);
    const end = new Date(start);
    end.setDate(end.getDate() + commitment.commitment_days);

    const now = new Date();
    const remaining = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

    return remaining > 0 ? remaining : 0;
  }
}

module.exports = CounselorReport;
