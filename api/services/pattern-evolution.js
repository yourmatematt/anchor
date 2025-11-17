/**
 * Pattern Evolution Service
 *
 * Tracks how gambling patterns change and evolve during recovery phases:
 * - Early recovery (0-30 days): High-risk identification
 * - Mid recovery (31-90 days): Pattern stabilization
 * - Late recovery (90+ days): Relapse prevention
 *
 * Monitors:
 * - Pattern emergence and decay
 * - Trigger evolution
 * - Risk level changes
 * - Behavioral shifts
 * - Recovery phase transitions
 */

class PatternEvolution {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;

    // Recovery phases
    this.phases = {
      early: { min: 0, max: 30, name: 'Early Recovery', riskLevel: 'critical' },
      mid: { min: 31, max: 90, name: 'Mid Recovery', riskLevel: 'high' },
      late: { min: 91, max: 999, name: 'Late Recovery', riskLevel: 'moderate' }
    };
  }

  /**
   * Update user patterns based on new analysis
   */
  async updatePatterns(userId, analysis) {
    try {
      // Get current patterns
      const currentPatterns = await this.getUserPatterns(userId);

      // Extract patterns from analysis
      const newPatterns = analysis.patterns || [];

      // Update pattern database
      for (const pattern of newPatterns) {
        await this._updatePattern(userId, pattern, analysis);
      }

      // Update triggers
      const triggers = analysis.triggers || [];
      for (const trigger of triggers) {
        await this._updateTrigger(userId, trigger, analysis);
      }

      // Check for pattern evolution
      await this._checkPatternEvolution(userId, currentPatterns, newPatterns);

      // Update phase if needed
      await this._updateRecoveryPhase(userId);

      return { success: true };
    } catch (error) {
      console.error('Error updating patterns:', error);
      throw error;
    }
  }

  /**
   * Get user's current patterns
   */
  async getUserPatterns(userId) {
    try {
      const { data: patterns } = await this.supabase
        .from('user_patterns')
        .select('*')
        .eq('user_id', userId)
        .order('strength', { ascending: false });

      return patterns || [];
    } catch (error) {
      console.error('Error getting patterns:', error);
      return [];
    }
  }

  /**
   * Get pattern evolution over time
   */
  async getPatternEvolution(userId, timeframe = 90) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeframe);

      // Get pattern history
      const { data: history } = await this.supabase
        .from('pattern_history')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (!history || history.length === 0) {
        return {
          evolution: 'insufficient_data',
          message: 'Not enough data to track pattern evolution'
        };
      }

      // Analyze evolution
      const evolution = this._analyzeEvolution(history);

      return {
        timeframe,
        currentPhase: await this._getCurrentPhase(userId),
        evolution,
        patternsEmerged: evolution.emerged,
        patternsDecayed: evolution.decayed,
        dominantPattern: evolution.dominant,
        riskTrend: evolution.riskTrend,
        recommendations: this._getEvolutionRecommendations(evolution)
      };
    } catch (error) {
      console.error('Error getting pattern evolution:', error);
      throw error;
    }
  }

  /**
   * Get current recovery phase
   */
  async getCurrentPhase(userId) {
    return await this._getCurrentPhase(userId);
  }

  /**
   * Get phase-specific recommendations
   */
  async getPhaseRecommendations(userId) {
    const phase = await this._getCurrentPhase(userId);
    const patterns = await this.getUserPatterns(userId);

    const recommendations = {
      phase: phase.name,
      riskLevel: phase.riskLevel,
      focus: [],
      actions: [],
      warnings: []
    };

    if (phase.name === 'Early Recovery') {
      recommendations.focus.push('Pattern identification', 'Baseline establishment', 'Trigger recognition');
      recommendations.actions.push(
        'Daily check-ins essential',
        'Guardian oversight critical',
        'Strict allowance enforcement',
        'High-risk period monitoring'
      );
      recommendations.warnings.push(
        'Highest relapse risk period',
        'Pattern detection still learning',
        'Overconfidence is dangerous'
      );
    } else if (phase.name === 'Mid Recovery') {
      recommendations.focus.push('Pattern refinement', 'Trigger management', 'Streak building');
      recommendations.actions.push(
        'Pattern-based interventions',
        'Pre-emptive warnings',
        'Guardian collaboration',
        'Savings tracking motivation'
      );
      recommendations.warnings.push(
        'Complacency risk increasing',
        'Old patterns may resurface',
        'Special events can trigger'
      );
    } else {
      recommendations.focus.push('Relapse prevention', 'Long-term sustainability', 'Life rebuilding');
      recommendations.actions.push(
        'Reduced but continued monitoring',
        'Focus on life improvements',
        'Guardian support as needed',
        'Consider graduated independence'
      );
      recommendations.warnings.push(
        'Major life events can trigger',
        'Past patterns can return unexpectedly',
        'Vigilance still required'
      );
    }

    // Pattern-specific recommendations
    for (const pattern of patterns) {
      if (pattern.strength > 0.7) {
        recommendations.warnings.push(
          `Strong ${pattern.name} pattern detected (${(pattern.strength * 100).toFixed(0)}% strength)`
        );
      }
    }

    return recommendations;
  }

  /**
   * Check for pattern evolution
   */
  async _checkPatternEvolution(userId, oldPatterns, newPatterns) {
    // Check for new patterns
    for (const newPattern of newPatterns) {
      const exists = oldPatterns.find(p => p.name === newPattern.name);

      if (!exists) {
        // Pattern emerged
        await this._logEvolutionEvent(userId, 'pattern_emerged', newPattern);
      } else if (Math.abs(exists.strength - newPattern.strength) > 0.2) {
        // Significant strength change
        const change = newPattern.strength > exists.strength ? 'strengthened' : 'weakened';
        await this._logEvolutionEvent(userId, `pattern_${change}`, newPattern);
      }
    }

    // Check for decayed patterns
    for (const oldPattern of oldPatterns) {
      const stillExists = newPatterns.find(p => p.name === oldPattern.name);

      if (!stillExists && oldPattern.strength > 0.3) {
        // Pattern decayed
        await this._logEvolutionEvent(userId, 'pattern_decayed', oldPattern);
      }
    }
  }

  /**
   * Update pattern in database
   */
  async _updatePattern(userId, pattern, analysis) {
    try {
      // Check if pattern exists
      const { data: existing } = await this.supabase
        .from('user_patterns')
        .select('*')
        .eq('user_id', userId)
        .eq('pattern_name', pattern.name)
        .single();

      if (existing) {
        // Update existing pattern
        await this.supabase
          .from('user_patterns')
          .update({
            pattern_type: pattern.type,
            strength: pattern.strength,
            occurrences: existing.occurrences + 1,
            last_detected: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Create new pattern
        await this.supabase
          .from('user_patterns')
          .insert({
            user_id: userId,
            pattern_name: pattern.name,
            pattern_type: pattern.type,
            strength: pattern.strength,
            occurrences: 1,
            first_detected: new Date().toISOString(),
            last_detected: new Date().toISOString(),
            description: pattern.description
          });
      }

      // Log to history
      await this._logPatternHistory(userId, pattern);
    } catch (error) {
      console.error('Error updating pattern:', error);
    }
  }

  /**
   * Update trigger in database
   */
  async _updateTrigger(userId, trigger, analysis) {
    try {
      const { data: existing } = await this.supabase
        .from('user_triggers')
        .select('*')
        .eq('user_id', userId)
        .eq('trigger_name', trigger.trigger)
        .single();

      if (existing) {
        // Update existing trigger
        const newCount = existing.occurrences + 1;
        const newConfidence = (existing.confidence * existing.occurrences + trigger.confidence) / newCount;

        await this.supabase
          .from('user_triggers')
          .update({
            occurrences: newCount,
            confidence: newConfidence,
            last_detected: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Create new trigger
        await this.supabase
          .from('user_triggers')
          .insert({
            user_id: userId,
            trigger_name: trigger.trigger,
            confidence: trigger.confidence,
            occurrences: 1,
            first_detected: new Date().toISOString(),
            last_detected: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error updating trigger:', error);
    }
  }

  /**
   * Get current recovery phase
   */
  async _getCurrentPhase(userId) {
    try {
      // Get commitment start date
      const { data: user } = await this.supabase
        .from('users')
        .select('commitment_start')
        .eq('id', userId)
        .single();

      if (!user || !user.commitment_start) {
        return { name: 'No Active Commitment', riskLevel: 'unknown', days: 0 };
      }

      const start = new Date(user.commitment_start);
      const now = new Date();
      const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));

      // Determine phase
      if (days <= 30) {
        return { ...this.phases.early, days };
      } else if (days <= 90) {
        return { ...this.phases.mid, days };
      } else {
        return { ...this.phases.late, days };
      }
    } catch (error) {
      console.error('Error getting current phase:', error);
      return { name: 'Unknown', riskLevel: 'unknown', days: 0 };
    }
  }

  /**
   * Update recovery phase
   */
  async _updateRecoveryPhase(userId) {
    const phase = await this._getCurrentPhase(userId);

    try {
      await this.supabase
        .from('users')
        .update({
          recovery_phase: phase.name,
          recovery_phase_risk: phase.riskLevel,
          recovery_days: phase.days
        })
        .eq('id', userId);
    } catch (error) {
      console.error('Error updating recovery phase:', error);
    }
  }

  /**
   * Analyze pattern evolution
   */
  _analyzeEvolution(history) {
    const evolution = {
      emerged: [],
      decayed: [],
      strengthened: [],
      weakened: [],
      dominant: null,
      riskTrend: 'stable'
    };

    // Group by pattern name
    const patternGroups = {};
    for (const record of history) {
      const name = record.pattern_name;
      if (!patternGroups[name]) {
        patternGroups[name] = [];
      }
      patternGroups[name].push(record);
    }

    // Analyze each pattern
    for (const [name, records] of Object.entries(patternGroups)) {
      if (records.length < 2) continue;

      const first = records[0];
      const last = records[records.length - 1];

      // Check for emergence (first occurrence in recent history)
      if (records.length <= 3) {
        evolution.emerged.push({ name, strength: last.strength });
      }

      // Check for strength changes
      const strengthChange = last.strength - first.strength;
      if (strengthChange > 0.2) {
        evolution.strengthened.push({ name, change: strengthChange });
      } else if (strengthChange < -0.2) {
        evolution.weakened.push({ name, change: Math.abs(strengthChange) });
      }

      // Check for decay (no recent occurrences)
      const daysSinceLast = (new Date() - new Date(last.created_at)) / (1000 * 60 * 60 * 24);
      if (daysSinceLast > 14) {
        evolution.decayed.push({ name, daysSince: daysSinceLast });
      }
    }

    // Find dominant pattern
    const allPatterns = history.filter(h => h.strength > 0.5);
    if (allPatterns.length > 0) {
      const sorted = allPatterns.sort((a, b) => b.strength - a.strength);
      evolution.dominant = {
        name: sorted[0].pattern_name,
        strength: sorted[0].strength
      };
    }

    // Determine risk trend
    if (evolution.strengthened.length > evolution.weakened.length) {
      evolution.riskTrend = 'increasing';
    } else if (evolution.weakened.length > evolution.strengthened.length) {
      evolution.riskTrend = 'decreasing';
    }

    return evolution;
  }

  /**
   * Get evolution-based recommendations
   */
  _getEvolutionRecommendations(evolution) {
    const recommendations = [];

    if (evolution.riskTrend === 'increasing') {
      recommendations.push({
        priority: 'high',
        message: 'Risk is increasing. Consider increasing guardian oversight.'
      });
    }

    if (evolution.emerged.length > 0) {
      recommendations.push({
        priority: 'medium',
        message: `New patterns detected: ${evolution.emerged.map(p => p.name).join(', ')}`
      });
    }

    if (evolution.dominant && evolution.dominant.strength > 0.8) {
      recommendations.push({
        priority: 'high',
        message: `Strong ${evolution.dominant.name} pattern (${(evolution.dominant.strength * 100).toFixed(0)}%). Pre-emptive intervention recommended.`
      });
    }

    if (evolution.decayed.length > 0) {
      recommendations.push({
        priority: 'low',
        message: `Positive: Some patterns are decaying (${evolution.decayed.map(p => p.name).join(', ')})`
      });
    }

    return recommendations;
  }

  /**
   * Log pattern to history
   */
  async _logPatternHistory(userId, pattern) {
    try {
      await this.supabase
        .from('pattern_history')
        .insert({
          user_id: userId,
          pattern_name: pattern.name,
          pattern_type: pattern.type,
          strength: pattern.strength,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging pattern history:', error);
    }
  }

  /**
   * Log evolution event
   */
  async _logEvolutionEvent(userId, eventType, pattern) {
    try {
      await this.supabase
        .from('pattern_evolution_events')
        .insert({
          user_id: userId,
          event_type: eventType,
          pattern_name: pattern.name,
          pattern_strength: pattern.strength,
          created_at: new Date().toISOString()
        });

      console.log(`Pattern evolution: ${eventType} - ${pattern.name} for user ${userId}`);
    } catch (error) {
      console.error('Error logging evolution event:', error);
    }
  }

  /**
   * Get pattern statistics
   */
  async getPatternStatistics(userId) {
    try {
      const patterns = await this.getUserPatterns(userId);

      return {
        totalPatterns: patterns.length,
        strongPatterns: patterns.filter(p => p.strength > 0.7).length,
        moderatePatterns: patterns.filter(p => p.strength >= 0.4 && p.strength <= 0.7).length,
        weakPatterns: patterns.filter(p => p.strength < 0.4).length,
        mostCommonType: this._getMostCommonType(patterns),
        averageStrength: patterns.reduce((sum, p) => sum + p.strength, 0) / patterns.length || 0
      };
    } catch (error) {
      console.error('Error getting pattern statistics:', error);
      return null;
    }
  }

  /**
   * Helper: Get most common pattern type
   */
  _getMostCommonType(patterns) {
    if (patterns.length === 0) return 'none';

    const typeCounts = {};
    patterns.forEach(p => {
      typeCounts[p.pattern_type] = (typeCounts[p.pattern_type] || 0) + 1;
    });

    return Object.keys(typeCounts).sort((a, b) => typeCounts[b] - typeCounts[a])[0];
  }
}

module.exports = PatternEvolution;
