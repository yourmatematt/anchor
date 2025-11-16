/**
 * Waitlist Form Handler
 * Qualifies users and submits to API
 */

(function() {
  'use strict';

  const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://api.anchor.app';

  const form = document.getElementById('waitlist-form');
  const formResponse = document.getElementById('form-response');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get form data
    const formData = new FormData(form);
    const data = {
      email: formData.get('email').trim(),
      name: formData.get('name').trim(),
      lost_5k: formData.get('lost_5k'),
      relapsed: formData.get('relapsed'),
      up_bank: formData.get('up_bank'),
      guardian: formData.get('guardian'),
      ready: formData.get('ready'),
    };

    // Validate all questions answered
    if (!data.lost_5k || !data.relapsed || !data.up_bank || !data.guardian || !data.ready) {
      showResponse('error', 'Please answer all questions.');
      return;
    }

    // Determine qualification tier
    const qualification = qualifyUser(data);
    data.qualification_tier = qualification.tier;

    // Show immediate feedback based on qualification
    if (qualification.tier === 'not_ready') {
      showNotReadyMessage();
      trackEvent('waitlist_submit', { tier: 'not_ready' });
      return;
    }

    // Disable form while submitting
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    document.body.classList.add('loading');

    try {
      // Submit to API
      const response = await fetch(`${API_URL}/api/waitlist/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        // Success
        showSuccessMessage(qualification);
        form.style.display = 'none';
        trackEvent('waitlist_submit', { tier: qualification.tier });
      } else {
        // Error from API
        showResponse('error', result.message || 'Something went wrong. Please try again.');
        submitButton.disabled = false;
        submitButton.textContent = 'Join Waitlist';
      }
    } catch (error) {
      console.error('Waitlist submission error:', error);
      showResponse('error', 'Network error. Please check your connection and try again.');
      submitButton.disabled = false;
      submitButton.textContent = 'Join Waitlist';
    } finally {
      document.body.classList.remove('loading');
    }
  });

  /**
   * Qualify user based on answers
   */
  function qualifyUser(data) {
    // Critical question: Are you ready?
    if (data.ready === 'no') {
      return {
        tier: 'not_ready',
        reason: 'User not ready to lose control',
      };
    }

    // Priority tier: All "yes" answers
    if (data.lost_5k === 'yes' &&
        data.relapsed === 'yes' &&
        (data.up_bank === 'yes' || data.up_bank === 'will_switch') &&
        data.guardian &&
        data.ready === 'yes') {
      return {
        tier: 'priority',
        reason: 'Meets all qualification criteria',
      };
    }

    // High tier: Most criteria met
    if ((data.lost_5k === 'yes' || data.relapsed === 'yes') &&
        data.ready === 'yes') {
      return {
        tier: 'high',
        reason: 'Meets most qualification criteria',
      };
    }

    // Standard tier: Ready but doesn't meet other criteria
    return {
      tier: 'standard',
      reason: 'Ready but limited qualification criteria',
    };
  }

  /**
   * Show success message based on qualification tier
   */
  function showSuccessMessage(qualification) {
    let message = '';

    if (qualification.tier === 'priority') {
      message = `
        <h3>You're In - Priority Waitlist</h3>
        <p><strong>You'll be in the first wave.</strong></p>
        <p>We launch in approximately 6-8 weeks. You'll receive:</p>
        <ul style="text-align: left; margin: 1rem 0; padding-left: 1.5rem;">
          <li>Early access notification (1 week before public launch)</li>
          <li>Guardian preparation guide</li>
          <li>Up Bank setup instructions${qualification.data?.up_bank === 'will_switch' ? ' (important - you need to switch now)' : ''}</li>
          <li>What to expect in your first 30 days</li>
        </ul>
        <p>Check your email (including spam folder). The first email is coming soon.</p>
        <p><strong>Start preparing your guardian now.</strong> They need to know what they're signing up for.</p>
      `;
    } else if (qualification.tier === 'high') {
      message = `
        <h3>You're On the Waitlist</h3>
        <p>We'll contact you when we're ready to onboard new users.</p>
        <p>In the meantime:</p>
        <ul style="text-align: left; margin: 1rem 0; padding-left: 1.5rem;">
          <li>Talk to your potential guardian - get their buy-in</li>
          <li>If not with Up Bank, start the switch process</li>
          <li>Keep track of how much you're losing - it's fuel for commitment</li>
        </ul>
        <p>If you're in crisis, call Gambling Help: <a href="tel:1800858858">1800 858 858</a></p>
      `;
    } else {
      message = `
        <h3>You're On the Waitlist</h3>
        <p>We'll be in touch when we're expanding access.</p>
        <p>Anchor works best for people who've lost significant amounts and relapsed multiple times. If that becomes you, we'll be here.</p>
        <p>In the meantime, Gambling Help can connect you with counseling: <a href="tel:1800858858">1800 858 858</a></p>
      `;
    }

    showResponse('success', message);
  }

  /**
   * Show "not ready" message
   */
  function showNotReadyMessage() {
    const message = `
      <h3>Come Back When You're Ready</h3>
      <p>You said you're not ready to lose control of your money. That's honest.</p>
      <p>Anchor only works if you're desperate enough to lock yourself in. Half-measures don't work with gambling addiction.</p>
      <p><strong>When you hit rock bottom - really hit it - come back.</strong></p>
      <p>Until then, these services can help:</p>
      <ul style="text-align: left; margin: 1rem 0; padding-left: 1.5rem;">
        <li><strong>Gambling Help:</strong> <a href="tel:1800858858">1800 858 858</a> - Free counseling, 24/7</li>
        <li><strong>Lifeline:</strong> <a href="tel:131114">13 11 14</a> - Crisis support</li>
        <li><strong>Self-exclusion:</strong> Register at <a href="https://www.betfilter.com.au" target="_blank" rel="noopener">BetFilter.com.au</a></li>
      </ul>
      <p>We'll be here when you're ready for the nuclear option.</p>
    `;

    showResponse('warning', message);
  }

  /**
   * Show response message
   */
  function showResponse(type, message) {
    formResponse.className = `form-response ${type}`;
    formResponse.innerHTML = message;
    formResponse.style.display = 'block';

    // Scroll to response
    formResponse.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Track event (if analytics loaded)
   */
  function trackEvent(eventName, params) {
    if (typeof gtag === 'function') {
      gtag('event', eventName, params);
    }
  }

})();
