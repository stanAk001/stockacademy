import { Link } from 'react-router-dom';
import Layout from './Layout';
import { creator } from '../siteConfig';

// Renders a paragraph for strings and a bulleted list for arrays.
function Body({ body }) {
  return body.map((b, i) =>
    Array.isArray(b) ? (
      <ul key={i} className="list-disc pl-5 space-y-1.5 text-ink/70 text-sm sm:text-[15px] mb-3 marker:text-coral-400">
        {b.map((li, j) => <li key={j} className="leading-relaxed">{li}</li>)}
      </ul>
    ) : (
      <p key={i} className="text-ink/70 text-sm sm:text-[15px] leading-relaxed mb-3">{b}</p>
    )
  );
}

// Shared shell for Privacy & Terms — consistent, readable legal pages.
export default function LegalDoc({ eyebrow, title, titleAccent, updated, intro, sections }) {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <p className="text-xs sm:text-sm font-black uppercase tracking-[0.15em] text-coral-500 mb-3">{eyebrow}</p>
        <h1 className="font-display text-3xl sm:text-5xl font-black leading-[1.05]">
          {title} {titleAccent && <span className="italic text-coral-500">{titleAccent}</span>}
        </h1>
        <p className="text-ink/45 text-xs font-semibold uppercase tracking-wider mt-3">Last updated: {updated}</p>
        {intro && <p className="text-ink/65 text-base sm:text-lg mt-5 leading-relaxed">{intro}</p>}

        <div className="mt-10 space-y-9">
          {sections.map((s, i) => (
            <section key={s.h}>
              <h2 className="font-display text-xl sm:text-2xl font-bold mb-3 flex items-baseline gap-2.5">
                <span className="text-coral-400 font-mono text-sm">{String(i + 1).padStart(2, '0')}</span>
                {s.h}
              </h2>
              <Body body={s.body} />
            </section>
          ))}
        </div>

        <div className="mt-12 card-soft p-5 text-sm text-ink/65 leading-relaxed">
          Questions about this page? Email{' '}
          <a href={`mailto:${creator.socials.email}`} className="font-semibold text-bull-600 hover:underline">{creator.socials.email}</a>{' '}
          or visit our <Link to="/contact" className="font-semibold text-bull-600 hover:underline">contact page</Link>.
        </div>
      </div>
    </Layout>
  );
}
