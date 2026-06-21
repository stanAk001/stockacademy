import LegalDoc from '../components/LegalDoc';

const SECTIONS = [
  {
    h: 'What this covers',
    body: [
      'This policy explains what information StockAcademia collects, why, and what we do with it. We keep it short and plain — the same way we treat everything else here.',
    ],
  },
  {
    h: 'Information we collect',
    body: [
      'When you create an account or use the platform, we collect:',
      [
        'Account details — your name, email and a securely hashed password. If you sign in with Google, we receive your basic Google profile (name, email, profile photo).',
        'Usage activity — courses and lessons you open, virtual simulator trades, stocks you view, your watchlist and price alerts.',
        'Payment information — handled entirely by our payment processor (Paystack). We never see or store your full card number.',
        'Messages you send us — e.g. via the contact page or email.',
      ],
    ],
  },
  {
    h: 'How we use it',
    body: [
      [
        'To run the platform — your courses, progress, simulator, watchlist and alerts.',
        'To process Premium payments and manage your subscription.',
        'To personalise your experience (for example, your preferred language for AI explanations).',
        'To send essential emails (account, payment, security). We don’t spam.',
        'To keep the service secure and improve it over time.',
      ],
    ],
  },
  {
    h: 'AI features',
    body: [
      'When you use an AI feature (stock verdicts, stock comparison, the in-lesson tutor, news scanning), the relevant stock data and your question are sent to our AI provider (Anthropic) to generate a response. Please don’t put sensitive personal information into AI prompts.',
    ],
  },
  {
    h: 'Services we rely on',
    body: [
      'We share only what’s needed with trusted providers, and we never sell your data:',
      [
        'Paystack — payment processing.',
        'Anthropic — AI-generated explanations.',
        'Finnhub and other market-data providers — stock prices and fundamentals.',
        'Google — optional sign-in.',
        'Our hosting and database providers — to store and serve your account.',
      ],
    ],
  },
  {
    h: 'Cookies & local storage',
    body: [
      'We store a login token and your language preference in your browser so the app works and remembers your choices. We don’t use advertising trackers.',
    ],
  },
  {
    h: 'Data retention & security',
    body: [
      'We keep your data while your account is active. Passwords are stored hashed, never in plain text. No system is perfectly secure, but we take reasonable steps to protect your information.',
    ],
  },
  {
    h: 'Your rights',
    body: [
      'You can ask us to access, correct or delete your personal data at any time — just email us and we’ll take care of it.',
    ],
  },
  {
    h: 'Children',
    body: [
      'StockAcademia is intended for adults (18+). It is not directed at children, and we don’t knowingly collect their data.',
    ],
  },
  {
    h: 'Changes to this policy',
    body: [
      'If we update this policy we’ll change the “last updated” date above. Significant changes will be communicated where appropriate.',
    ],
  },
];

export default function Privacy() {
  return (
    <LegalDoc
      eyebrow="Privacy"
      title="Your data,"
      titleAccent="handled with care."
      updated="16 June 2026"
      intro="We collect only what we need to run StockAcademia well — and we never sell it. Here’s exactly what that means."
      sections={SECTIONS}
    />
  );
}
