import LegalDoc from '../components/LegalDoc';

const SECTIONS = [
  {
    h: 'Accepting these terms',
    body: [
      'By creating an account or using StockAcademia, you agree to these terms. If you don’t agree, please don’t use the platform.',
    ],
  },
  {
    h: 'Educational purpose only — not financial advice',
    body: [
      'This is the most important part. StockAcademia is an educational platform. We are not a licensed broker, dealer, or investment adviser, and nothing here is financial, investment, tax or legal advice.',
      'Our analysis, metrics, AI explanations, courses and any other content are for learning and research only. They are never a recommendation to buy, sell or hold any security. Every investment decision is yours alone, and you should consult a licensed professional before investing real money.',
    ],
  },
  {
    h: 'No guarantees',
    body: [
      'Investing carries risk, including the loss of your capital. Past performance never guarantees future results. We do not promise any outcome, profit or return from using StockAcademia.',
    ],
  },
  {
    h: 'Your account',
    body: [
      [
        'Provide accurate information and keep your login details secure.',
        'You’re responsible for activity under your account.',
        'One account per person; don’t share or sell access.',
      ],
    ],
  },
  {
    h: 'The simulator',
    body: [
      'The trading simulator uses virtual money only. No real trades are placed, and no real money is gained or lost. It exists purely for practice.',
    ],
  },
  {
    h: 'Premium & payments',
    body: [
      [
        'Premium is pay-first: access begins once payment is confirmed. There is no free trial.',
        'Payments are processed securely by Paystack.',
        'Fees are non-refundable once Premium access has been granted.',
        'If you choose card auto-renewal, you can cancel anytime — cancelling stops future charges but does not refund the current period.',
        'Prices and features may change; we’ll give reasonable notice of material changes.',
      ],
    ],
  },
  {
    h: 'Acceptable use',
    body: [
      'Don’t scrape, copy, resell or redistribute our content; don’t reverse-engineer or disrupt the platform; and don’t use it for anything unlawful.',
    ],
  },
  {
    h: 'Market data accuracy',
    body: [
      'Stock prices, fundamentals and other figures come from third-party providers and may be delayed, incomplete or contain errors. Always verify important numbers against an official source before acting on them.',
    ],
  },
  {
    h: 'Partner links',
    body: [
      'Some links to third-party brokers may be referral links, meaning StockAcademia can earn a referral fee if you sign up — always at no extra cost to you, and never affecting the price you pay. A referral is never a recommendation: which broker you use, and every investment you make, is entirely your own decision.',
    ],
  },
  {
    h: 'Service “as is”',
    body: [
      'StockAcademia is provided “as is”, without warranties of any kind. We don’t guarantee the service will be uninterrupted, error-free, or that any content is accurate or complete.',
    ],
  },
  {
    h: 'Limitation of liability',
    body: [
      'To the fullest extent permitted by law, StockAcademia and its creator are not liable for any investment losses, or any indirect or consequential damages, arising from your use of the platform. You use it, and you invest, at your own risk.',
    ],
  },
  {
    h: 'Suspension & termination',
    body: [
      'We may suspend or close accounts that violate these terms or misuse the platform.',
    ],
  },
  {
    h: 'Governing law',
    body: [
      'These terms are governed by the laws of the Federal Republic of Nigeria.',
    ],
  },
  {
    h: 'Changes to these terms',
    body: [
      'We may update these terms from time to time. Continued use after an update means you accept the revised terms.',
    ],
  },
];

export default function Terms() {
  return (
    <LegalDoc
      eyebrow="Terms of Service"
      title="The rules,"
      titleAccent="in plain English."
      updated="16 June 2026"
      intro="StockAcademia is built to teach, not to advise. These terms keep that clear and protect both of us."
      sections={SECTIONS}
    />
  );
}
