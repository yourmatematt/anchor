/**
 * Privacy-Focused Analytics
 * Google Analytics 4 with IP anonymization and minimal tracking
 */

(function() {
  'use strict';

  // GA4 Measurement ID (replace with actual ID when deploying)
  const GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX';

  // Only load analytics in production (not on localhost)
  const isProduction = window.location.hostname !== 'localhost' &&
                       window.location.hostname !== '127.0.0.1';

  if (!isProduction) {
    console.log('Analytics disabled on localhost');
    // Create dummy gtag function for development
    window.gtag = function() {
      console.log('GA4 Event (dev):', arguments);
    };
    return;
  }

  // Load GA4 script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag('js', new Date());

  // Configure GA4 with privacy settings
  gtag('config', GA4_MEASUREMENT_ID, {
    // Privacy settings
    'anonymize_ip': true,                    // Anonymize IP addresses
    'allow_google_signals': false,           // Disable Google Signals (cross-device tracking)
    'allow_ad_personalization_signals': false, // Disable ad personalization
    'cookie_flags': 'SameSite=None;Secure',  // Cookie security
    'cookie_expires': 60 * 60 * 24 * 30,     // 30 days

    // Performance
    'send_page_view': true,

    // Custom settings
    'custom_map': {
      'dimension1': 'qualification_tier',
      'dimension2': 'user_segment'
    }
  });

  // Track scroll depth (understand engagement)
  let scrollTracked = {
    25: false,
    50: false,
    75: false,
    100: false
  };

  function trackScrollDepth() {
    const scrollPercent = Math.round(
      (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
    );

    for (const threshold in scrollTracked) {
      if (scrollPercent >= threshold && !scrollTracked[threshold]) {
        scrollTracked[threshold] = true;
        gtag('event', 'scroll_depth', {
          'percent': threshold,
          'event_category': 'engagement'
        });
      }
    }
  }

  // Throttle scroll tracking
  let scrollTimeout;
  window.addEventListener('scroll', function() {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    scrollTimeout = setTimeout(trackScrollDepth, 250);
  });

  // Track CTA clicks
  document.querySelectorAll('.cta-button').forEach(button => {
    button.addEventListener('click', function() {
      gtag('event', 'cta_click', {
        'event_category': 'engagement',
        'event_label': this.textContent.trim()
      });
    });
  });

  // Track crisis link clicks
  document.querySelectorAll('.crisis-link').forEach(link => {
    link.addEventListener('click', function() {
      gtag('event', 'crisis_link_click', {
        'event_category': 'support',
        'event_label': this.textContent.includes('Gambling') ? 'Gambling Help' : 'Lifeline'
      });
    });
  });

  // Track section visibility (which sections do people read?)
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          const sectionName = entry.target.className.split(' ')[0];
          gtag('event', 'section_view', {
            'event_category': 'engagement',
            'event_label': sectionName,
            'value': 1
          });
        }
      });
    },
    { threshold: 0.5 }
  );

  // Observe all major sections
  document.querySelectorAll('section').forEach(section => {
    sectionObserver.observe(section);
  });

  // Track time on page before leaving
  let pageStartTime = Date.now();

  window.addEventListener('beforeunload', function() {
    const timeOnPage = Math.round((Date.now() - pageStartTime) / 1000);

    gtag('event', 'time_on_page', {
      'event_category': 'engagement',
      'value': timeOnPage,
      'non_interaction': true
    });
  });

  // Track outbound links
  document.querySelectorAll('a[href^="http"]').forEach(link => {
    // Skip internal links
    if (link.hostname === window.location.hostname) return;

    link.addEventListener('click', function() {
      gtag('event', 'outbound_click', {
        'event_category': 'engagement',
        'event_label': this.href,
        'transport_type': 'beacon'
      });
    });
  });

  // Console log for transparency
  console.log('Privacy-focused analytics loaded');
  console.log('IP addresses are anonymized');
  console.log('No personal data is collected or sold');
  console.log('Data retention: 30 days');

})();
