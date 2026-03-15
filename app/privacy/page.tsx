export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a1628', color: '#fff', fontFamily: 'DM Sans, sans-serif', padding: '80px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <a href="/" style={{ fontSize: 13, fontWeight: 700, color: '#e8a020', letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}>← NomadPilot</a>
          <h1 style={{ fontSize: 42, fontWeight: 700, fontFamily: 'Cormorant Garamond, serif', marginTop: 24, marginBottom: 8 }}>Privacy Policy</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Last updated: March 2026</p>
        </div>

        {/* Promise box */}
        <div style={{ background: 'rgba(45,212,160,0.08)', border: '1px solid rgba(45,212,160,0.2)', borderRadius: 16, padding: '24px 28px', marginBottom: 48 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#2dd4a0' }}>Our core promise</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, margin: 0 }}>
            <strong>We will never sell, rent, or share your personal data with advertisers or third parties for commercial gain.</strong> NomadPilot exists to help you travel smarter — not to monetise your personal information.
          </p>
        </div>

        {[
          {
            title: '1. Who we are',
            content: 'NomadPilot is an AI-powered travel planning platform. We help users search for flights, hotels, and plan trips. References to "we", "us", or "NomadPilot" in this policy refer to the NomadPilot team.',
          },
          {
            title: '2. What data we collect',
            content: `We collect only what is necessary to provide our service:

• **Account data** — your email address, name, and password (encrypted) when you create an account.
• **Usage data** — searches you perform, trips you save, and features you use. This helps us improve the product.
• **Device data** — browser type, IP address, and general location (country level). Used to detect fraud and improve performance.
• **Cookie data** — session cookies to keep you signed in, and preference cookies to remember your settings.

We do NOT collect passport numbers, payment card details, or any sensitive financial information. These are passed directly to booking partners and never stored on our servers.`,
          },
          {
            title: '3. How we use your data',
            content: `We use your data to:

• Provide and improve the NomadPilot service
• Send you beta access notifications and product updates (you can unsubscribe at any time)
• Detect and prevent fraud or abuse
• Comply with legal obligations

We do NOT use your data for advertising. We do NOT profile you for third-party marketing.`,
          },
          {
            title: '4. Cookies',
            content: `We use two types of cookies:

• **Essential cookies** — required for the service to function (keeping you logged in, security tokens). You cannot opt out of these without stopping use of the service.
• **Preference cookies** — remember your settings like currency and language preferences.

We do not use advertising, tracking, or analytics cookies from third parties.`,
          },
          {
            title: '5. Data sharing',
            content: `We share data only in these limited circumstances:

• **Booking partners** (Kiwi, Booking.com, Agoda etc.) — when you click to book, your search parameters are passed to these providers. Their own privacy policies apply.
• **Supabase** — our database provider, used to store your account and trip data securely.
• **Legal requirements** — if required by law, court order, or to protect the rights and safety of our users.

We will never sell your data. Ever.`,
          },
          {
            title: '6. Data retention',
            content: 'We retain your account data for as long as your account is active. If you request deletion, we will remove your personal data within 30 days, except where we are required by law to retain it.',
          },
          {
            title: '7. Your rights',
            content: `Depending on your location, you may have the right to:

• Access the personal data we hold about you
• Correct inaccurate data
• Request deletion of your data
• Object to or restrict processing
• Data portability

To exercise any of these rights, email us at privacy@nomadpilot.app. We will respond within 30 days.`,
          },
          {
            title: '8. Security',
            content: 'We use industry-standard security measures including encrypted connections (HTTPS), hashed passwords, and row-level security on our database. No method of transmission over the internet is 100% secure, but we take every reasonable precaution.',
          },
          {
            title: '9. Children',
            content: 'NomadPilot is not directed at children under 16. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us and we will delete it.',
          },
          {
            title: '10. Changes to this policy',
            content: 'We may update this policy from time to time. We will notify registered users of material changes by email. Continued use of the service after changes constitutes acceptance of the updated policy.',
          },
          {
            title: '11. Contact',
            content: 'For any privacy-related questions or requests, contact us at privacy@nomadpilot.app',
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: '#fff' }}>{section.title}</h2>
            <div style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, fontSize: 15, whiteSpace: 'pre-line' }}>
              {section.content.split('**').map((part, i) =>
                i % 2 === 1
                  ? <strong key={i} style={{ color: 'rgba(255,255,255,0.85)' }}>{part}</strong>
                  : part
              )}
            </div>
          </div>
        ))}

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 32, marginTop: 48, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            NomadPilot · privacy@nomadpilot.app ·{' '}
            <a href="/" style={{ color: '#e8a020', textDecoration: 'none' }}>Back to app</a>
          </p>
        </div>
      </div>
    </div>
  );
}
