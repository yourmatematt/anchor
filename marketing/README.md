# Anchor Marketing Site

Brutally honest, direct marketing site for people who've hit rock bottom with gambling.

## Overview

Single-page marketing site with:
- Hero section with Matt's real story
- Problem/solution framework
- Qualification-based waitlist
- Privacy-focused analytics
- Crisis resources prominently displayed

## Files

```
marketing/
├── index.html         # Main marketing page
├── styles.css         # Dark, mobile-first design
├── waitlist.js        # Waitlist form with qualification logic
├── analytics.js       # Privacy-focused GA4 tracking
└── README.md          # This file
```

## Design Philosophy

**No Soft Talk**
- Brutally honest about gambling addiction
- No stock photos, only real data
- No false promises, just hard accountability
- Speaks directly to people at rock bottom

**Privacy-First**
- IP anonymization
- No cross-device tracking
- No ad personalization
- 30-day data retention

**Mobile-First**
- Optimized for mobile (most users)
- Fast loading (no frameworks)
- Accessible (WCAG 2.1 AA)
- Dark theme (reduces eye strain)

## Qualification Tiers

Waitlist submissions are automatically qualified into tiers:

### Priority (First Wave)
- Lost $5k+ to gambling: Yes
- Relapsed after trying to quit: Yes
- Has Up Bank account or will switch: Yes
- Has identified guardian: Yes
- Ready to lose control of money: Yes

**Auto-responder:** Early access notification, guardian prep guide, first-wave onboarding

### High (Second Wave)
- Lost $5k+ OR relapsed: Yes
- Ready to lose control: Yes

**Auto-responder:** Waitlist confirmation, preparation steps, resources

### Standard (Later Access)
- Ready to lose control: Yes
- Doesn't meet other criteria

**Auto-responder:** Waitlist confirmation, counseling resources

### Not Ready
- Ready to lose control: No

**Auto-responder:** "Come back when you're ready" message with crisis resources

## SEO Optimization

**Primary Keywords:**
- gambling intervention
- stop gambling permanently
- gambling financial control
- problem gambling help australia
- gambling addiction recovery

**Meta Tags:**
- Title: "Anchor - Your Last Shot at Beating Gambling"
- Description: "Anchor locks your money away from you. No soft talk. No escape hatches. Just hard accountability."
- Open Graph tags for social sharing

**Content Strategy:**
- H1: Main problem statement
- H2: Sections (Problem, Solution, How It Works)
- Semantic HTML5 structure
- Fast loading (Core Web Vitals)
- Mobile responsive

## Analytics Setup

### Google Analytics 4

1. Create GA4 property at https://analytics.google.com
2. Get Measurement ID (format: `G-XXXXXXXXXX`)
3. Update `analytics.js`:
   ```javascript
   const GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX';
   ```

### Privacy Settings

Already configured:
- ✅ IP anonymization
- ✅ No Google Signals
- ✅ No ad personalization
- ✅ SameSite cookies
- ✅ 30-day expiration

### Events Tracked

- Page views (automatic)
- CTA clicks (Join Waitlist button)
- Scroll depth (25%, 50%, 75%, 100%)
- Section views (which content people read)
- Crisis link clicks (help-seeking behavior)
- Time on page (engagement)
- Waitlist submissions (by tier)

## Deployment

### Option 1: Static Hosting (Recommended)

**Cloudflare Pages** (Free, fast CDN):
```bash
# Connect GitHub repo
# Deploy from /marketing directory
# Domain: anchor.app
```

**Netlify** (Free tier):
```bash
# Publish directory: marketing
# Build command: (none needed)
```

**Vercel** (Free tier):
```bash
# Framework: None
# Root directory: marketing
```

### Option 2: Self-Hosted

**Nginx**:
```nginx
server {
    listen 80;
    server_name anchor.app www.anchor.app;
    root /var/www/anchor/marketing;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location ~* \.(css|js)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # SSL (use Let's Encrypt)
    # include /etc/nginx/ssl/anchor.conf;
}
```

### DNS Configuration

```
Type    Name    Value
A       @       [server-ip]
A       www     [server-ip]
CNAME   api     api.anchor.app
```

### SSL Certificate

Use **Let's Encrypt** (free):
```bash
sudo certbot --nginx -d anchor.app -d www.anchor.app
```

## API Integration

Marketing site connects to API for waitlist submissions:

**Development:**
```javascript
const API_URL = 'http://localhost:3000';
```

**Production:**
```javascript
const API_URL = 'https://api.anchor.app';
```

### CORS Configuration

Add marketing domain to API `.env`:
```
ALLOWED_ORIGINS=https://anchor.app,https://www.anchor.app,http://localhost:3001,http://localhost:19000
```

## Email Auto-Responders

Currently logged to console. To enable real emails:

1. **Choose email service:**
   - SendGrid (99¢/month for 40k emails)
   - Postmark ($10/month for 10k emails)
   - AWS SES (cheap but complex setup)

2. **Update `api/routes/waitlist.js`:**
   ```javascript
   // Replace console.log with actual email sending
   await sendEmail({
     to: entry.email,
     subject: template.subject,
     text: template.body,
   });
   ```

3. **Add credentials to `.env`:**
   ```
   SENDGRID_API_KEY=...
   # or
   POSTMARK_SERVER_TOKEN=...
   ```

## Testing Checklist

Before launch:

- [ ] Test all form fields (validation)
- [ ] Test each qualification path (priority, high, standard, not ready)
- [ ] Verify auto-responder messages
- [ ] Test on mobile devices (iOS Safari, Android Chrome)
- [ ] Test crisis links (phone numbers)
- [ ] Check GA4 tracking (page views, events)
- [ ] Test with screen reader (accessibility)
- [ ] Verify API connection (waitlist submission)
- [ ] Check Core Web Vitals (PageSpeed Insights)
- [ ] Proofread all copy for typos

## Crisis Resources

Always prominently displayed:
- **Gambling Help:** 1800 858 858 (24/7 helpline)
- **Lifeline:** 13 11 14 (crisis support)

## Legal & Compliance

**Disclaimer:**
"Anchor is a financial accountability tool, not a substitute for professional gambling counseling."

**Privacy:**
- No personal data sold
- No third-party tracking
- Minimal data collection
- Privacy-focused analytics

**Accessibility:**
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader compatible
- High contrast ratios
- Focus indicators

## Performance Targets

- **First Contentful Paint:** < 1.5s
- **Largest Contentful Paint:** < 2.5s
- **Cumulative Layout Shift:** < 0.1
- **Time to Interactive:** < 3.5s
- **Mobile PageSpeed Score:** > 90

Achieved by:
- No JavaScript frameworks
- Minimal dependencies
- Inline critical CSS (optional)
- CDN delivery
- Optimized images (if added later)

## Future Enhancements

Potential additions (NOT launch-critical):

- [ ] Up Bank switching guide (embedded)
- [ ] Guardian preparation checklist (PDF download)
- [ ] Success stories (when we have real users with 6+ months clean)
- [ ] FAQ section (common questions)
- [ ] Blog (problem gambling education)
- [ ] Comparison to alternatives (Betfilter, self-exclusion)

## Launch Checklist

- [ ] Set GA4_MEASUREMENT_ID in analytics.js
- [ ] Update API_URL in waitlist.js for production
- [ ] Configure email service for auto-responders
- [ ] Set up custom domain (anchor.app)
- [ ] Configure SSL certificate
- [ ] Test all functionality end-to-end
- [ ] Submit to Google Search Console
- [ ] Create social media accounts (optional)
- [ ] Monitor first 100 signups
- [ ] Review auto-responder effectiveness

## Contact

Built by Matt, founder of Anchor.
For critical issues: [contact method to be determined]

---

**Remember:** This site exists to help people at their lowest point. Every word matters. Keep it honest, direct, and focused on accountability over comfort.
