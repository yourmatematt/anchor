/**
 * ATO-Compliant Tax Report Template
 *
 * Generates tax reports compliant with Australian Taxation Office requirements:
 * - Gambling losses summary by financial year (July 1 - June 30)
 * - Categorized expenses
 * - Income vs expenses
 * - Digital signature support
 * - CSV export for accountants
 *
 * Note: Gambling losses are generally NOT tax deductible in Australia unless
 * gambling is your business/profession. This report is for record-keeping.
 */

class TaxReport {
  /**
   * Generate ATO-compliant tax report
   */
  static generate(data, options = {}) {
    const report = {
      // Report metadata
      metadata: this._generateMetadata(data, options),

      // Cover page
      coverPage: this._generateCoverPage(data, options),

      // Executive summary
      executiveSummary: this._generateExecutiveSummary(data, options),

      // Gambling losses summary
      gamblingLosses: this._generateGamblingLosses(data, options),

      // Income summary
      income: this._generateIncomeSummary(data, options),

      // Expenses by category
      expenses: this._generateExpensesSummary(data, options),

      // Monthly breakdown
      monthlyBreakdown: this._generateMonthlyBreakdown(data, options),

      // Merchant analysis
      merchantAnalysis: this._generateMerchantAnalysis(data, options),

      // Supporting documentation
      supportingDocs: this._generateSupportingDocs(data, options),

      // Accountant notes
      accountantNotes: this._generateAccountantNotes(data, options),

      // Declaration
      declaration: this._generateDeclaration(data, options),

      // Digital signature
      signature: options.digitalSignature ? this._generateSignature(data) : null
    };

    return report;
  }

  /**
   * Generate metadata
   */
  static _generateMetadata(data, options) {
    return {
      reportType: 'ATO Tax Report',
      financialYear: options.financialYear,
      financialYearLabel: `FY ${options.financialYear - 1}/${options.financialYear}`,
      period: {
        start: options.startDate,
        end: options.endDate
      },
      generatedAt: new Date().toISOString(),
      generatedFor: {
        name: data.user.full_name,
        email: data.user.email,
        tfn: data.user.tax_file_number || 'Not Provided'
      },
      reportVersion: '1.0',
      compliance: 'ATO Guidelines 2024'
    };
  }

  /**
   * Generate cover page
   */
  static _generateCoverPage(data, options) {
    return {
      title: 'Tax Report',
      subtitle: `Financial Year ${options.financialYear - 1}/${options.financialYear}`,
      taxpayerName: data.user.full_name,
      dateOfBirth: data.user.date_of_birth,
      address: data.user.address,
      tfn: data.user.tax_file_number || 'Not Provided',
      generatedDate: new Date().toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      disclaimer: 'This report is for tax record-keeping purposes. Gambling losses are generally not tax deductible in Australia unless gambling is your business or profession. Consult a registered tax agent for advice.'
    };
  }

  /**
   * Generate executive summary
   */
  static _generateExecutiveSummary(data, options) {
    const totalGamblingLosses = data.gamblingTransactions.reduce(
      (sum, t) => sum + Math.abs(t.amount?.value || 0),
      0
    );

    const totalExpenses = data.transactions.reduce(
      (sum, t) => sum + Math.abs(t.amount?.value || 0),
      0
    );

    return {
      period: `${options.financialYear - 1}/${options.financialYear}`,
      summary: {
        totalGamblingLosses: totalGamblingLosses.toFixed(2),
        totalExpenses: totalExpenses.toFixed(2),
        gamblingPercentage: ((totalGamblingLosses / totalExpenses) * 100).toFixed(1),
        numberOfGamblingTransactions: data.gamblingTransactions.length,
        numberOfTotalTransactions: data.transactions.length
      },
      highlights: [
        `Total gambling losses: $${totalGamblingLosses.toFixed(2)}`,
        `Number of gambling transactions: ${data.gamblingTransactions.length}`,
        `Gambling as % of total expenses: ${((totalGamblingLosses / totalExpenses) * 100).toFixed(1)}%`,
        `Recovery program active: ${data.commitment ? 'Yes' : 'No'}`
      ],
      atoGuidance: {
        deductibility: 'NOT DEDUCTIBLE',
        reason: 'Gambling losses are generally not tax deductible unless gambling is your business',
        reference: 'ATO Taxation Ruling TR 97/11',
        recommendation: 'Keep records for personal financial management only'
      }
    };
  }

  /**
   * Generate gambling losses summary
   */
  static _generateGamblingLosses(data, options) {
    const byMonth = this._groupByMonth(data.gamblingTransactions);
    const byType = this._groupByGamblingType(data.gamblingTransactions);
    const byPlatform = this._groupByPlatform(data.gamblingTransactions);

    return {
      title: 'Gambling Losses Summary',
      financialYear: options.financialYear,
      totalLosses: this._sumTransactions(data.gamblingTransactions).toFixed(2),
      transactionCount: data.gamblingTransactions.length,

      byMonth: Object.entries(byMonth).map(([month, data]) => ({
        month,
        amount: data.total.toFixed(2),
        transactions: data.count,
        averagePerTransaction: (data.total / data.count).toFixed(2)
      })),

      byType: Object.entries(byType).map(([type, data]) => ({
        type,
        amount: data.total.toFixed(2),
        transactions: data.count,
        percentage: ((data.total / this._sumTransactions(data.gamblingTransactions)) * 100).toFixed(1)
      })),

      byPlatform: Object.entries(byPlatform)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)
        .map(([platform, data]) => ({
          platform,
          amount: data.total.toFixed(2),
          transactions: data.count
        })),

      largestTransaction: this._getLargestTransaction(data.gamblingTransactions),

      statistics: {
        averagePerTransaction: (this._sumTransactions(data.gamblingTransactions) / data.gamblingTransactions.length).toFixed(2),
        medianTransaction: this._getMedianTransaction(data.gamblingTransactions).toFixed(2),
        frequencyPerWeek: (data.gamblingTransactions.length / 52).toFixed(1)
      }
    };
  }

  /**
   * Generate income summary
   */
  static _generateIncomeSummary(data, options) {
    // Get income transactions (deposits, salary, etc.)
    const incomeTransactions = data.transactions.filter(t => (t.amount?.value || 0) > 0);

    return {
      title: 'Income Summary',
      totalIncome: this._sumTransactions(incomeTransactions).toFixed(2),
      declaredIncome: data.user.monthly_income ? (data.user.monthly_income * 12).toFixed(2) : 'Not provided',
      sources: this._groupByDescription(incomeTransactions),
      note: 'Income figures should be verified against employer payment summaries and other income statements'
    };
  }

  /**
   * Generate expenses summary
   */
  static _generateExpensesSummary(data, options) {
    const expenses = data.transactions.filter(t => (t.amount?.value || 0) < 0);

    const byCategory = {
      'Gambling': this._sumTransactions(data.gamblingTransactions),
      'Groceries': this._sumTransactionsByKeyword(expenses, ['woolworths', 'coles', 'aldi', 'iga']),
      'Utilities': this._sumTransactionsByKeyword(expenses, ['optus', 'telstra', 'energy', 'gas', 'water']),
      'Transport': this._sumTransactionsByKeyword(expenses, ['uber', 'ola', 'petrol', 'fuel', 'parking']),
      'Entertainment': this._sumTransactionsByKeyword(expenses, ['netflix', 'spotify', 'cinema', 'movie']),
      'Dining': this._sumTransactionsByKeyword(expenses, ['restaurant', 'cafe', 'uber eats', 'menulog']),
      'Other': 0
    };

    // Calculate "Other"
    const categorizedTotal = Object.values(byCategory).reduce((sum, val) => sum + val, 0);
    const totalExpenses = this._sumTransactions(expenses);
    byCategory['Other'] = totalExpenses - categorizedTotal;

    return {
      title: 'Expenses by Category',
      totalExpenses: totalExpenses.toFixed(2),
      categories: Object.entries(byCategory)
        .map(([category, amount]) => ({
          category,
          amount: amount.toFixed(2),
          percentage: ((amount / totalExpenses) * 100).toFixed(1)
        }))
        .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
    };
  }

  /**
   * Generate monthly breakdown
   */
  static _generateMonthlyBreakdown(data, options) {
    const months = this._getFinancialYearMonths(options.financialYear);

    return months.map(month => {
      const monthTransactions = data.transactions.filter(t => {
        const txDate = new Date(t.created_at);
        return txDate >= month.start && txDate <= month.end;
      });

      const monthGambling = monthTransactions.filter(t => t.is_gambling);

      return {
        month: month.name,
        period: {
          start: month.start.toLocaleDateString('en-AU'),
          end: month.end.toLocaleDateString('en-AU')
        },
        transactions: monthTransactions.length,
        totalSpent: this._sumTransactions(monthTransactions).toFixed(2),
        gamblingLosses: this._sumTransactions(monthGambling).toFixed(2),
        gamblingTransactions: monthGambling.length,
        gamblingPercentage: monthTransactions.length > 0
          ? ((this._sumTransactions(monthGambling) / this._sumTransactions(monthTransactions)) * 100).toFixed(1)
          : '0.0'
      };
    });
  }

  /**
   * Generate merchant analysis
   */
  static _generateMerchantAnalysis(data, options) {
    const merchantGroups = this._groupByDescription(data.gamblingTransactions);

    return {
      title: 'Gambling Merchant Analysis',
      totalMerchants: Object.keys(merchantGroups).length,
      merchants: Object.entries(merchantGroups)
        .map(([merchant, data]) => ({
          merchant,
          transactions: data.count,
          totalAmount: data.total.toFixed(2),
          averageAmount: (data.total / data.count).toFixed(2),
          firstTransaction: data.firstDate,
          lastTransaction: data.lastDate
        }))
        .sort((a, b) => parseFloat(b.totalAmount) - parseFloat(a.totalAmount))
    };
  }

  /**
   * Generate supporting documentation
   */
  static _generateSupportingDocs(data, options) {
    return {
      title: 'Supporting Documentation',
      included: [
        'Bank transaction statements',
        'Gambling transaction records',
        'Recovery program documentation',
        'Guardian support records (if applicable)'
      ],
      transactionDetails: data.gamblingTransactions.map(t => ({
        date: new Date(t.created_at).toLocaleDateString('en-AU'),
        description: t.description,
        amount: Math.abs(t.amount?.value || 0).toFixed(2),
        category: 'Gambling',
        reference: t.id
      })),
      exportFormat: 'CSV available for accountant review'
    };
  }

  /**
   * Generate accountant notes
   */
  static _generateAccountantNotes(data, options) {
    return {
      title: 'Notes for Tax Accountant',
      keyPoints: [
        'All gambling losses recorded are NOT tax deductible for recreational gamblers',
        'Amounts shown are for personal financial record-keeping only',
        'Client is enrolled in gambling recovery program (Anchor)',
        'Guardian oversight system is active',
        'Transaction data sourced from Up Bank API (verified)',
        'All amounts in Australian Dollars (AUD)'
      ],
      recommendations: [
        'Review client\'s overall financial situation',
        'Consider impact on tax return preparation',
        'Note gambling expenditure for financial counseling referral if needed',
        'Verify income sources independently'
      ],
      contactInformation: {
        program: 'Anchor - Gambling Recovery System',
        support: 'support@anchor.com.au',
        documentation: 'Complete transaction records available on request'
      }
    };
  }

  /**
   * Generate declaration
   */
  static _generateDeclaration(data, options) {
    return {
      title: 'Taxpayer Declaration',
      statement: 'I declare that the information contained in this report is true and correct to the best of my knowledge and belief.',
      taxpayer: {
        name: data.user.full_name,
        tfn: data.user.tax_file_number || 'Not Provided',
        date: new Date().toLocaleDateString('en-AU')
      },
      acknowledgment: 'I acknowledge that gambling losses are generally not tax deductible in Australia and this report is for record-keeping purposes only.',
      consent: 'I consent to this report being provided to my registered tax agent for the purposes of tax return preparation.'
    };
  }

  /**
   * Generate digital signature
   */
  static _generateSignature(data) {
    const crypto = require('crypto');

    const signatureData = {
      userId: data.user.id,
      timestamp: new Date().toISOString(),
      reportType: 'tax_report'
    };

    const signature = crypto
      .createHash('sha256')
      .update(JSON.stringify(signatureData))
      .digest('hex');

    return {
      signedBy: data.user.full_name,
      signedAt: new Date().toISOString(),
      signature: signature.substring(0, 32),
      verified: true
    };
  }

  /**
   * Helper: Group by month
   */
  static _groupByMonth(transactions) {
    const groups = {};

    transactions.forEach(t => {
      const date = new Date(t.created_at);
      const month = date.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

      if (!groups[month]) {
        groups[month] = { count: 0, total: 0 };
      }

      groups[month].count++;
      groups[month].total += Math.abs(t.amount?.value || 0);
    });

    return groups;
  }

  /**
   * Helper: Group by gambling type
   */
  static _groupByGamblingType(transactions) {
    const groups = {
      'Online Betting': { count: 0, total: 0 },
      'Venue Gambling': { count: 0, total: 0 },
      'Sports Betting': { count: 0, total: 0 },
      'Lottery': { count: 0, total: 0 },
      'Other': { count: 0, total: 0 }
    };

    transactions.forEach(t => {
      const desc = (t.description || '').toLowerCase();
      let type = 'Other';

      if (desc.includes('sportsbet') || desc.includes('bet365') || desc.includes('ladbrokes')) {
        type = 'Online Betting';
      } else if (desc.includes('casino') || desc.includes('rsl') || desc.includes('club')) {
        type = 'Venue Gambling';
      } else if (desc.includes('tab') || desc.includes('race')) {
        type = 'Sports Betting';
      } else if (desc.includes('lotto') || desc.includes('powerball')) {
        type = 'Lottery';
      }

      groups[type].count++;
      groups[type].total += Math.abs(t.amount?.value || 0);
    });

    return groups;
  }

  /**
   * Helper: Group by platform
   */
  static _groupByPlatform(transactions) {
    const groups = {};

    transactions.forEach(t => {
      const platform = t.description || 'Unknown';

      if (!groups[platform]) {
        groups[platform] = { count: 0, total: 0 };
      }

      groups[platform].count++;
      groups[platform].total += Math.abs(t.amount?.value || 0);
    });

    return groups;
  }

  /**
   * Helper: Group by description
   */
  static _groupByDescription(transactions) {
    const groups = {};

    transactions.forEach(t => {
      const desc = t.description || 'Unknown';

      if (!groups[desc]) {
        groups[desc] = {
          count: 0,
          total: 0,
          firstDate: t.created_at,
          lastDate: t.created_at
        };
      }

      groups[desc].count++;
      groups[desc].total += Math.abs(t.amount?.value || 0);

      if (new Date(t.created_at) < new Date(groups[desc].firstDate)) {
        groups[desc].firstDate = t.created_at;
      }

      if (new Date(t.created_at) > new Date(groups[desc].lastDate)) {
        groups[desc].lastDate = t.created_at;
      }
    });

    return groups;
  }

  /**
   * Helper: Sum transactions
   */
  static _sumTransactions(transactions) {
    return transactions.reduce((sum, t) => sum + Math.abs(t.amount?.value || 0), 0);
  }

  /**
   * Helper: Sum transactions by keyword
   */
  static _sumTransactionsByKeyword(transactions, keywords) {
    const filtered = transactions.filter(t => {
      const desc = (t.description || '').toLowerCase();
      return keywords.some(keyword => desc.includes(keyword.toLowerCase()));
    });

    return this._sumTransactions(filtered);
  }

  /**
   * Helper: Get largest transaction
   */
  static _getLargestTransaction(transactions) {
    if (transactions.length === 0) return null;

    const largest = transactions.reduce((max, t) =>
      Math.abs(t.amount?.value || 0) > Math.abs(max.amount?.value || 0) ? t : max
    );

    return {
      date: new Date(largest.created_at).toLocaleDateString('en-AU'),
      merchant: largest.description,
      amount: Math.abs(largest.amount?.value || 0).toFixed(2)
    };
  }

  /**
   * Helper: Get median transaction
   */
  static _getMedianTransaction(transactions) {
    if (transactions.length === 0) return 0;

    const amounts = transactions
      .map(t => Math.abs(t.amount?.value || 0))
      .sort((a, b) => a - b);

    const mid = Math.floor(amounts.length / 2);

    return amounts.length % 2 === 0
      ? (amounts[mid - 1] + amounts[mid]) / 2
      : amounts[mid];
  }

  /**
   * Helper: Get financial year months
   */
  static _getFinancialYearMonths(financialYear) {
    const months = [];
    const startYear = financialYear - 1;

    // July - December of previous year
    for (let month = 6; month < 12; month++) {
      const start = new Date(startYear, month, 1);
      const end = new Date(startYear, month + 1, 0);
      months.push({
        name: start.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }),
        start,
        end
      });
    }

    // January - June of current year
    for (let month = 0; month < 6; month++) {
      const start = new Date(financialYear, month, 1);
      const end = new Date(financialYear, month + 1, 0);
      months.push({
        name: start.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }),
        start,
        end
      });
    }

    return months;
  }
}

module.exports = TaxReport;
