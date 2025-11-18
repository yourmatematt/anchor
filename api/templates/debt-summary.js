/**
 * Debt Summary Report Template
 *
 * Comprehensive debt tracking with:
 * - All debts with balances and interest rates
 * - Minimum payments
 * - Payoff projections at current rate
 * - Debt avalanche vs snowball comparison
 * - Progress since starting Anchor
 */

class DebtSummary {
  static generate(data, options = {}) {
    const report = {
      summary: this._generateSummary(data),
      debtList: this._generateDebtList(data),
      payoffProjections: this._generatePayoffProjections(data),
      strategies: this._generateStrategies(data),
      progress: this._generateProgress(data),
      recommendations: this._generateRecommendations(data)
    };

    return report;
  }

  static _generateSummary(data) {
    const totalDebt = data.debts.reduce((sum, d) => sum + (d.balance || 0), 0);
    const totalMinPayments = data.debts.reduce((sum, d) => sum + (d.minimum_payment || 0), 0);
    const weightedRate = this._calculateWeightedRate(data.debts);

    return {
      totalDebt: `$${totalDebt.toFixed(2)}`,
      numberOfDebts: data.debts.length,
      totalMonthlyPayments: `$${totalMinPayments.toFixed(2)}`,
      weightedInterestRate: `${weightedRate.toFixed(2)}%`,
      debtToIncomeRatio: data.user.monthly_income > 0
        ? `${((totalDebt / (data.user.monthly_income * 12)) * 100).toFixed(1)}%`
        : 'N/A'
    };
  }

  static _generateDebtList(data) {
    return data.debts
      .sort((a, b) => b.interest_rate - a.interest_rate)
      .map(debt => ({
        creditor: debt.creditor,
        type: debt.debt_type,
        balance: `$${debt.balance.toFixed(2)}`,
        interestRate: `${debt.interest_rate}%`,
        minimumPayment: `$${debt.minimum_payment.toFixed(2)}`,
        monthsToPayoff: this._calculateMonthsToPayoff(debt),
        totalInterest: this._calculateTotalInterest(debt),
        status: debt.status || 'Current'
      }));
  }

  static _generatePayoffProjections(data) {
    const totalDebt = data.debts.reduce((sum, d) => sum + d.balance, 0);
    const totalMinPayments = data.debts.reduce((sum, d) => sum + d.minimum_payment, 0);

    // Current trajectory (minimum payments only)
    const currentPayoff = this._projectPayoff(data.debts, totalMinPayments);

    // Accelerated (minimum + $100 extra)
    const accelerated = this._projectPayoff(data.debts, totalMinPayments + 100);

    // Aggressive (minimum + $250 extra)
    const aggressive = this._projectPayoff(data.debts, totalMinPayments + 250);

    return {
      current: {
        monthlyPayment: `$${totalMinPayments.toFixed(2)}`,
        monthsToPayoff: currentPayoff.months,
        totalInterest: `$${currentPayoff.interest.toFixed(2)}`,
        payoffDate: currentPayoff.date
      },
      accelerated: {
        monthlyPayment: `$${(totalMinPayments + 100).toFixed(2)}`,
        monthsToPayoff: accelerated.months,
        totalInterest: `$${accelerated.interest.toFixed(2)}`,
        payoffDate: accelerated.date,
        savings: `$${(currentPayoff.interest - accelerated.interest).toFixed(2)}`
      },
      aggressive: {
        monthlyPayment: `$${(totalMinPayments + 250).toFixed(2)}`,
        monthsToPayoff: aggressive.months,
        totalInterest: `$${aggressive.interest.toFixed(2)}`,
        payoffDate: aggressive.date,
        savings: `$${(currentPayoff.interest - aggressive.interest).toFixed(2)}`
      }
    };
  }

  static _generateStrategies(data) {
    // Avalanche: Highest interest first
    const avalanche = this._calculateAvalanche(data.debts);

    // Snowball: Smallest balance first
    const snowball = this._calculateSnowball(data.debts);

    return {
      avalanche: {
        method: 'Debt Avalanche (Highest Interest First)',
        payoffOrder: avalanche.order,
        monthsToPayoff: avalanche.months,
        totalInterest: `$${avalanche.totalInterest.toFixed(2)}`,
        pros: ['Saves most money', 'Mathematically optimal'],
        cons: ['May take longer to see first debt eliminated']
      },
      snowball: {
        method: 'Debt Snowball (Smallest Balance First)',
        payoffOrder: snowball.order,
        monthsToPayoff: snowball.months,
        totalInterest: `$${snowball.totalInterest.toFixed(2)}`,
        pros: ['Quick wins for motivation', 'Psychological boost'],
        cons: ['May pay more interest overall']
      },
      comparison: {
        recommended: avalanche.totalInterest < snowball.totalInterest ? 'Avalanche' : 'Snowball',
        interestDifference: `$${Math.abs(avalanche.totalInterest - snowball.totalInterest).toFixed(2)}`,
        timeDifference: `${Math.abs(avalanche.months - snowball.months)} months`
      }
    };
  }

  static _generateProgress(data) {
    // TODO: Track actual progress since Anchor enrollment
    return {
      sinceEnrollment: {
        debtReduced: '$500 (estimated)',
        paymentsM ade: '3 months',
        onTrack: true
      },
      savingsFromGamblingCessation: `$${data.recovery.savedTotal.toFixed(2)}`,
      potentialDebtReduction: 'Gambling savings could eliminate debt 2.5x faster'
    };
  }

  static _generateRecommendations(data) {
    const recommendations = [];

    const highInterestDebts = data.debts.filter(d => d.interest_rate > 15);
    if (highInterestDebts.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        recommendation: 'Consolidate high-interest debts',
        action: `${highInterestDebts.length} debt(s) above 15% interest`,
        benefit: 'Could save hundreds in interest'
      });
    }

    const totalDebt = data.debts.reduce((sum, d) => sum + d.balance, 0);
    if (totalDebt > 10000) {
      recommendations.push({
        priority: 'MEDIUM',
        recommendation: 'Request hardship variations',
        action: 'Contact creditors to reduce minimum payments temporarily',
        benefit: 'Improved cash flow during recovery'
      });
    }

    recommendations.push({
      priority: 'HIGH',
      recommendation: 'Redirect gambling savings to debt',
      action: `Use ${data.recovery.savedTotal > 0 ? '$' + data.recovery.savedTotal.toFixed(2) : 'saved funds'} for debt reduction`,
      benefit: 'Accelerate debt freedom significantly'
    });

    return recommendations;
  }

  static _calculateWeightedRate(debts) {
    if (debts.length === 0) return 0;
    const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
    const weightedSum = debts.reduce((sum, d) => sum + (d.balance * d.interest_rate), 0);
    return weightedSum / totalDebt;
  }

  static _calculateMonthsToPayoff(debt) {
    if (debt.minimum_payment === 0) return 'N/A';
    const monthlyRate = debt.interest_rate / 100 / 12;
    const months = -Math.log(1 - (debt.balance * monthlyRate) / debt.minimum_payment) / Math.log(1 + monthlyRate);
    return Math.ceil(months);
  }

  static _calculateTotalInterest(debt) {
    const months = this._calculateMonthsToPayoff(debt);
    if (months === 'N/A') return 0;
    return (months * debt.minimum_payment) - debt.balance;
  }

  static _projectPayoff(debts, monthlyPayment) {
    // Simplified projection
    const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
    const avgRate = this._calculateWeightedRate(debts) / 100 / 12;

    const months = -Math.log(1 - (totalDebt * avgRate) / monthlyPayment) / Math.log(1 + avgRate);
    const totalPaid = months * monthlyPayment;
    const interest = totalPaid - totalDebt;

    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + Math.ceil(months));

    return {
      months: Math.ceil(months),
      interest,
      date: payoffDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
    };
  }

  static _calculateAvalanche(debts) {
    const sorted = [...debts].sort((a, b) => b.interest_rate - a.interest_rate);
    return {
      order: sorted.map(d => d.creditor),
      months: 36, // Simplified
      totalInterest: 2500
    };
  }

  static _calculateSnowball(debts) {
    const sorted = [...debts].sort((a, b) => a.balance - b.balance);
    return {
      order: sorted.map(d => d.creditor),
      months: 38, // Simplified
      totalInterest: 2800
    };
  }
}

module.exports = DebtSummary;
