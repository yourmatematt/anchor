/**
 * Risk Alert Component
 *
 * Displays proactive risk notifications for guardians
 * Shows upcoming risks, pattern alerts, and milestones
 */

import React from 'react';
import styles from '../styles/RiskAlert.module.css';

const RiskAlert = ({ risk, onDismiss, onTakeAction }) => {
  /**
   * Get alert styling based on severity
   */
  const getAlertStyle = (severity) => {
    switch (severity) {
      case 'very-high':
        return styles.alertCritical;
      case 'high':
        return styles.alertHigh;
      case 'medium':
        return styles.alertMedium;
      case 'low':
        return styles.alertLow;
      default:
        return styles.alertInfo;
    }
  };

  /**
   * Get icon based on risk type
   */
  const getIcon = (type) => {
    switch (type) {
      case 'payday':
        return '💰';
      case 'weekend':
        return '📅';
      case 'time_of_day':
        return '🕐';
      case 'pattern_escalation':
        return '⚠️';
      case 'milestone':
        return '🎉';
      default:
        return '🔔';
    }
  };

  /**
   * Get urgency text
   */
  const getUrgencyText = (daysAway) => {
    if (daysAway === 0) return 'Today';
    if (daysAway === 1) return 'Tomorrow';
    return `In ${daysAway} days`;
  };

  return (
    <div className={`${styles.riskAlert} ${getAlertStyle(risk.severity)}`}>
      <div className={styles.alertIcon}>
        <span className={styles.icon}>{getIcon(risk.type)}</span>
      </div>

      <div className={styles.alertContent}>
        <div className={styles.alertHeader}>
          <span className={styles.alertType}>{risk.type.replace(/_/g, ' ').toUpperCase()}</span>
          {risk.daysAway !== undefined && (
            <span className={styles.alertUrgency}>{getUrgencyText(risk.daysAway)}</span>
          )}
        </div>

        <p className={styles.alertMessage}>{risk.message}</p>

        {risk.recommendation && (
          <p className={styles.alertRecommendation}>
            <strong>Recommended:</strong> {risk.recommendation}
          </p>
        )}

        <div className={styles.alertActions}>
          {onTakeAction && (
            <button
              className={styles.actionButton}
              onClick={() => onTakeAction(risk)}
            >
              Take Action
            </button>
          )}
          {onDismiss && (
            <button
              className={styles.dismissButton}
              onClick={() => onDismiss(risk)}
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Risk Alert List Component
 */
export const RiskAlertList = ({ risks, onDismiss, onTakeAction }) => {
  if (!risks || risks.length === 0) {
    return (
      <div className={styles.noAlerts}>
        <span className={styles.noAlertsIcon}>✅</span>
        <p className={styles.noAlertsText}>No active risk alerts</p>
        <p className={styles.noAlertsSubtext}>All patterns are stable</p>
      </div>
    );
  }

  return (
    <div className={styles.riskAlertList}>
      {risks.map((risk, index) => (
        <RiskAlert
          key={index}
          risk={risk}
          onDismiss={onDismiss}
          onTakeAction={onTakeAction}
        />
      ))}
    </div>
  );
};

/**
 * Risk Summary Badge
 */
export const RiskSummaryBadge = ({ count, highestSeverity }) => {
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'very-high':
        return '#dc2626';
      case 'high':
        return '#ea580c';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  if (count === 0) {
    return null;
  }

  return (
    <div
      className={styles.riskBadge}
      style={{ backgroundColor: getSeverityColor(highestSeverity) }}
    >
      {count}
    </div>
  );
};

export default RiskAlert;
