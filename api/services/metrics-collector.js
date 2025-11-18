/**
 * Metrics Collector Service
 *
 * Collects custom application metrics for Prometheus
 * Tracks: API performance, user behavior, AI metrics, business KPIs
 */

const client = require('prom-client');

class MetricsCollector {
  constructor() {
    // Create a Registry
    this.register = new client.Registry();

    // Add default metrics (CPU, memory, event loop lag, etc.)
    client.collectDefaultMetrics({
      register: this.register,
      prefix: 'anchor_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
    });

    // Initialize all custom metrics
    this._initializeSystemMetrics();
    this._initializeUserMetrics();
    this._initializeAIMetrics();
    this._initializeBusinessMetrics();
  }

  /**
   * Initialize system/API metrics
   */
  _initializeSystemMetrics() {
    // HTTP request duration histogram
    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'endpoint', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
      registers: [this.register]
    });

    // HTTP request counter
    this.httpRequests = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'endpoint', 'status'],
      registers: [this.register]
    });

    // Database query duration
    this.databaseQueryDuration = new client.Histogram({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['query_type', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.register]
    });

    // Cache operations
    this.cacheHits = new client.Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_type'],
      registers: [this.register]
    });

    this.cacheMisses = new client.Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_type'],
      registers: [this.register]
    });

    // Webhook metrics
    this.webhookAttempts = new client.Counter({
      name: 'webhook_attempts_total',
      help: 'Total number of webhook delivery attempts',
      labelNames: ['webhook_type'],
      registers: [this.register]
    });

    this.webhookSuccess = new client.Counter({
      name: 'webhook_success_total',
      help: 'Total number of successful webhook deliveries',
      labelNames: ['webhook_type'],
      registers: [this.register]
    });

    // Queue depth gauge
    this.syncQueueSize = new client.Gauge({
      name: 'sync_queue_size',
      help: 'Current number of items in sync queue',
      registers: [this.register]
    });

    // Third-party API latency
    this.thirdPartyApiDuration = new client.Histogram({
      name: 'third_party_api_duration_seconds',
      help: 'Duration of third-party API calls',
      labelNames: ['provider', 'endpoint'],
      buckets: [0.5, 1, 2, 5, 10, 30],
      registers: [this.register]
    });
  }

  /**
   * Initialize user behavior metrics
   */
  _initializeUserMetrics() {
    // Active users gauge
    this.activeUsers = new client.Gauge({
      name: 'user_activity_total',
      help: 'Number of active users',
      labelNames: ['period'], // 1d, 7d, 30d
      registers: [this.register]
    });

    // User registrations
    this.userRegistrations = new client.Counter({
      name: 'user_registrations_total',
      help: 'Total number of user registrations',
      registers: [this.register]
    });

    // Clean streak distribution
    this.userCleanStreakDays = new client.Gauge({
      name: 'user_clean_streak_days',
      help: 'User clean streak in days',
      labelNames: ['user_id', 'streak_range'],
      registers: [this.register]
    });

    // Intervention success/attempts
    this.interventionAttempts = new client.Counter({
      name: 'intervention_attempts_total',
      help: 'Total intervention attempts',
      labelNames: ['intervention_type'],
      registers: [this.register]
    });

    this.interventionSuccess = new client.Counter({
      name: 'intervention_success_total',
      help: 'Total successful interventions',
      labelNames: ['intervention_type'],
      registers: [this.register]
    });

    // Pattern detection
    this.patternDetectionTotal = new client.Counter({
      name: 'pattern_detection_total',
      help: 'Total pattern detections',
      labelNames: ['pattern_type'],
      registers: [this.register]
    });

    this.patternDetectionCorrect = new client.Counter({
      name: 'pattern_detection_correct_total',
      help: 'Total correct pattern detections',
      labelNames: ['pattern_type'],
      registers: [this.register]
    });

    // User relapses
    this.userRelapses = new client.Counter({
      name: 'user_relapses_total',
      help: 'Total user relapses',
      labelNames: ['phase'], // early, mid, late
      registers: [this.register]
    });

    // Guardian engagement
    this.guardianEngagement = new client.Gauge({
      name: 'guardian_engagement',
      help: 'Guardian engagement level',
      labelNames: ['guardian_id', 'level'], // high, medium, low, none
      registers: [this.register]
    });

    // Feature usage
    this.featureUsage = new client.Counter({
      name: 'feature_usage_total',
      help: 'Total feature usage',
      labelNames: ['feature'],
      registers: [this.register]
    });

    // Transactions blocked/allowed
    this.transactionsBlocked = new client.Counter({
      name: 'transactions_blocked_total',
      help: 'Total transactions blocked',
      registers: [this.register]
    });

    this.transactionsAllowed = new client.Counter({
      name: 'transactions_allowed_total',
      help: 'Total transactions allowed',
      registers: [this.register]
    });

    // User risk level
    this.userRiskLevel = new client.Gauge({
      name: 'user_risk_level',
      help: 'User risk level',
      labelNames: ['user_id', 'level'], // low, medium, high
      registers: [this.register]
    });

    // Gambling amount saved
    this.gamblingAmountSaved = new client.Counter({
      name: 'gambling_amount_saved_total',
      help: 'Total gambling amount saved (AUD)',
      registers: [this.register]
    });

    // User satisfaction
    this.userSatisfactionScore = new client.Gauge({
      name: 'user_satisfaction_score',
      help: 'User satisfaction score (1-5)',
      labelNames: ['user_id'],
      registers: [this.register]
    });
  }

  /**
   * Initialize AI/ML metrics
   */
  _initializeAIMetrics() {
    // AI conversation duration
    this.aiConversationDuration = new client.Histogram({
      name: 'ai_conversation_duration_seconds',
      help: 'Duration of AI conversations',
      labelNames: ['outcome'],
      buckets: [10, 30, 60, 120, 300, 600, 1800],
      registers: [this.register]
    });

    // AI conversation counter
    this.aiConversationTotal = new client.Counter({
      name: 'ai_conversation_total',
      help: 'Total AI conversations',
      labelNames: ['input_type'], // voice, text
      registers: [this.register]
    });

    // Manipulation detection
    this.aiManipulationDetected = new client.Counter({
      name: 'ai_manipulation_detected_total',
      help: 'Total manipulation attempts detected',
      labelNames: ['technique'],
      registers: [this.register]
    });

    // Voice transcription accuracy
    this.voiceTranscriptionAccuracy = new client.Gauge({
      name: 'voice_transcription_accuracy_percent',
      help: 'Voice transcription accuracy percentage',
      registers: [this.register]
    });

    // AI response generation time
    this.aiResponseGenerationDuration = new client.Histogram({
      name: 'ai_response_generation_duration_seconds',
      help: 'AI response generation duration',
      buckets: [0.5, 1, 2, 3, 5, 10],
      registers: [this.register]
    });

    // Conversation outcomes
    this.aiConversationOutcome = new client.Counter({
      name: 'ai_conversation_outcome_total',
      help: 'AI conversation outcomes',
      labelNames: ['outcome'], // helpful, intervention_triggered, crisis_detected, neutral
      registers: [this.register]
    });

    // AI intervention effectiveness
    this.aiInterventionSuccess = new client.Counter({
      name: 'ai_intervention_success_total',
      help: 'Successful AI interventions',
      labelNames: ['intervention_type'],
      registers: [this.register]
    });

    this.aiInterventionFailure = new client.Counter({
      name: 'ai_intervention_failure_total',
      help: 'Failed AI interventions',
      labelNames: ['intervention_type'],
      registers: [this.register]
    });

    // AI cost tracking
    this.aiCost = new client.Counter({
      name: 'ai_cost_total',
      help: 'Total AI cost in USD',
      labelNames: ['provider', 'model'],
      registers: [this.register]
    });

    // Sentiment analysis
    this.aiSentiment = new client.Counter({
      name: 'ai_sentiment_total',
      help: 'AI sentiment analysis results',
      labelNames: ['sentiment'], // positive, neutral, negative, crisis
      registers: [this.register]
    });

    // Crisis detection
    this.aiCrisisDetected = new client.Counter({
      name: 'ai_crisis_detected_total',
      help: 'Total crisis situations detected',
      labelNames: ['severity'], // low, medium, high, critical
      registers: [this.register]
    });

    // ML model inference time
    this.mlModelInferenceDuration = new client.Histogram({
      name: 'ml_model_inference_duration_seconds',
      help: 'ML model inference duration',
      labelNames: ['model', 'operation'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
      registers: [this.register]
    });

    // Pattern detection confidence
    this.patternDetectionConfidence = new client.Gauge({
      name: 'pattern_detection_confidence',
      help: 'Pattern detection confidence score',
      labelNames: ['pattern_type'],
      registers: [this.register]
    });

    // Voice/text input usage
    this.aiVoiceInput = new client.Counter({
      name: 'ai_voice_input_total',
      help: 'Total voice inputs',
      registers: [this.register]
    });

    this.aiTextInput = new client.Counter({
      name: 'ai_text_input_total',
      help: 'Total text inputs',
      registers: [this.register]
    });

    // Conversation length
    this.aiConversationMessageCount = new client.Gauge({
      name: 'ai_conversation_message_count',
      help: 'Number of messages in conversation',
      labelNames: ['conversation_id'],
      registers: [this.register]
    });

    // AI model errors
    this.aiModelError = new client.Counter({
      name: 'ai_model_error_total',
      help: 'Total AI model errors',
      labelNames: ['error_type', 'model'],
      registers: [this.register]
    });

    // AI response quality score
    this.aiResponseQualityScore = new client.Gauge({
      name: 'ai_response_quality_score',
      help: 'AI response quality score (1-5)',
      labelNames: ['conversation_id'],
      registers: [this.register]
    });
  }

  /**
   * Initialize business metrics
   */
  _initializeBusinessMetrics() {
    // Total users
    this.totalUsers = new client.Gauge({
      name: 'total_users',
      help: 'Total registered users',
      registers: [this.register]
    });

    // Users with guardians
    this.usersWithGuardians = new client.Gauge({
      name: 'users_with_guardians',
      help: 'Number of users with guardians',
      registers: [this.register]
    });

    // Daily allowance resets
    this.dailyAllowanceResets = new client.Counter({
      name: 'daily_allowance_resets_total',
      help: 'Total daily allowance resets',
      registers: [this.register]
    });

    this.dailyAllowanceResetFailures = new client.Counter({
      name: 'daily_allowance_reset_failures_total',
      help: 'Failed daily allowance resets',
      registers: [this.register]
    });
  }

  // ==================== TRACKING METHODS ====================

  /**
   * Track HTTP request
   */
  trackHttpRequest(method, endpoint, statusCode, durationSeconds) {
    this.httpRequestDuration
      .labels(method, endpoint, statusCode.toString())
      .observe(durationSeconds);

    this.httpRequests
      .labels(method, endpoint, Math.floor(statusCode / 100) + 'xx')
      .inc();
  }

  /**
   * Track database query
   */
  trackDatabaseQuery(queryType, table, durationSeconds) {
    this.databaseQueryDuration
      .labels(queryType, table)
      .observe(durationSeconds);
  }

  /**
   * Track cache operation
   */
  trackCacheHit(cacheType) {
    this.cacheHits.labels(cacheType).inc();
  }

  trackCacheMiss(cacheType) {
    this.cacheMisses.labels(cacheType).inc();
  }

  /**
   * Track webhook delivery
   */
  trackWebhookAttempt(webhookType) {
    this.webhookAttempts.labels(webhookType).inc();
  }

  trackWebhookSuccess(webhookType) {
    this.webhookSuccess.labels(webhookType).inc();
  }

  /**
   * Update queue size
   */
  updateQueueSize(size) {
    this.syncQueueSize.set(size);
  }

  /**
   * Track third-party API call
   */
  trackThirdPartyApi(provider, endpoint, durationSeconds) {
    this.thirdPartyApiDuration
      .labels(provider, endpoint)
      .observe(durationSeconds);
  }

  /**
   * Track user registration
   */
  trackUserRegistration() {
    this.userRegistrations.inc();
  }

  /**
   * Update active users count
   */
  updateActiveUsers(period, count) {
    this.activeUsers.labels(period).set(count);
  }

  /**
   * Track intervention
   */
  trackIntervention(type, success) {
    this.interventionAttempts.labels(type).inc();
    if (success) {
      this.interventionSuccess.labels(type).inc();
    }
  }

  /**
   * Track pattern detection
   */
  trackPatternDetection(patternType, correct, confidence) {
    this.patternDetectionTotal.labels(patternType).inc();
    if (correct) {
      this.patternDetectionCorrect.labels(patternType).inc();
    }
    if (confidence !== undefined) {
      this.patternDetectionConfidence.labels(patternType).set(confidence);
    }
  }

  /**
   * Track user relapse
   */
  trackRelapse(phase) {
    this.userRelapses.labels(phase).inc();
  }

  /**
   * Track transaction block/allow
   */
  trackTransaction(blocked, amount) {
    if (blocked) {
      this.transactionsBlocked.inc();
      if (amount) {
        this.gamblingAmountSaved.inc(amount);
      }
    } else {
      this.transactionsAllowed.inc();
    }
  }

  /**
   * Track AI conversation
   */
  trackAIConversation(inputType, durationSeconds, outcome) {
    this.aiConversationTotal.labels(inputType).inc();
    this.aiConversationDuration.labels(outcome).observe(durationSeconds);
    this.aiConversationOutcome.labels(outcome).inc();

    if (inputType === 'voice') {
      this.aiVoiceInput.inc();
    } else {
      this.aiTextInput.inc();
    }
  }

  /**
   * Track AI response generation
   */
  trackAIResponseGeneration(durationSeconds) {
    this.aiResponseGenerationDuration.observe(durationSeconds);
  }

  /**
   * Track manipulation detection
   */
  trackManipulationDetection(technique) {
    this.aiManipulationDetected.labels(technique).inc();
  }

  /**
   * Track AI cost
   */
  trackAICost(provider, model, cost) {
    this.aiCost.labels(provider, model).inc(cost);
  }

  /**
   * Track sentiment
   */
  trackSentiment(sentiment) {
    this.aiSentiment.labels(sentiment).inc();
  }

  /**
   * Track crisis detection
   */
  trackCrisisDetection(severity) {
    this.aiCrisisDetected.labels(severity).inc();
  }

  /**
   * Track ML model inference
   */
  trackMLInference(model, operation, durationSeconds) {
    this.mlModelInferenceDuration
      .labels(model, operation)
      .observe(durationSeconds);
  }

  /**
   * Update voice transcription accuracy
   */
  updateVoiceTranscriptionAccuracy(accuracy) {
    this.voiceTranscriptionAccuracy.set(accuracy);
  }

  /**
   * Track daily allowance reset
   */
  trackDailyAllowanceReset(success) {
    this.dailyAllowanceResets.inc();
    if (!success) {
      this.dailyAllowanceResetFailures.inc();
    }
  }

  /**
   * Get metrics for Prometheus
   */
  async getMetrics() {
    return await this.register.metrics();
  }

  /**
   * Get metrics in JSON format
   */
  async getMetricsJSON() {
    const metrics = await this.register.getMetricsAsJSON();
    return metrics;
  }

  /**
   * Reset all metrics (for testing)
   */
  resetMetrics() {
    this.register.resetMetrics();
  }
}

// Export singleton instance
const metricsCollector = new MetricsCollector();
module.exports = metricsCollector;

// Export class for testing
module.exports.MetricsCollector = MetricsCollector;
