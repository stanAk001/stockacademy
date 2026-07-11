import ReactMarkdown from 'react-markdown';

// Renders AI markdown (tutor, stock verdict, comparisons, news, portfolio) as
// clean styled text matched to the app — so "##" become tidy bold sub-headings
// and "**x**" renders as bold, instead of showing raw symbols. react-markdown
// builds a React tree (no raw HTML), so it's safe by default.
//
// tone: 'light' for cards on cream, 'dark' for cards on ink.
function makeComponents(dark) {
  const heading = dark ? 'text-cream' : 'text-ink';
  const marker = dark ? 'marker:text-cream/40' : 'marker:text-ink/40';
  const codeCls = dark ? 'bg-cream/10 text-cream' : 'bg-ink/[0.07] text-ink';
  const link = dark ? 'text-sun-300' : 'text-bull-600';
  const rule = dark ? 'border-cream/15' : 'border-ink/10';
  const quote = dark ? 'border-cream/20 text-cream/70' : 'border-ink/15 text-ink/70';
  return {
    h1: ({ children }) => <p className={`font-display font-black ${heading} text-[15px] leading-snug mt-3 mb-1 first:mt-0`}>{children}</p>,
    h2: ({ children }) => <p className={`font-display font-bold ${heading} text-[14.5px] leading-snug mt-3 mb-1 first:mt-0`}>{children}</p>,
    h3: ({ children }) => <p className={`font-display font-bold ${heading} text-sm leading-snug mt-2.5 mb-1 first:mt-0`}>{children}</p>,
    h4: ({ children }) => <p className={`font-display font-bold ${heading} text-sm leading-snug mt-2.5 mb-1 first:mt-0`}>{children}</p>,
    p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
    strong: ({ children }) => <strong className={`font-bold ${heading}`}>{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    ul: ({ children }) => <ul className={`list-disc pl-4 space-y-1 mb-2 ${marker}`}>{children}</ul>,
    ol: ({ children }) => <ol className={`list-decimal pl-4 space-y-1 mb-2 ${marker}`}>{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed pl-0.5">{children}</li>,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className={`${link} font-semibold underline`}>{children}</a>
    ),
    code: ({ children }) => <code className={`${codeCls} rounded px-1 py-0.5 text-[12.5px] font-mono`}>{children}</code>,
    hr: () => <hr className={`${rule} my-2.5`} />,
    blockquote: ({ children }) => <blockquote className={`border-l-2 ${quote} pl-3 my-2 italic`}>{children}</blockquote>,
  };
}

const LIGHT = makeComponents(false);
const DARK = makeComponents(true);

export default function ChatMarkdown({ children, tone = 'light', className = '' }) {
  return (
    <div className={`text-sm break-words ${className}`}>
      <ReactMarkdown components={tone === 'dark' ? DARK : LIGHT}>{children || ''}</ReactMarkdown>
    </div>
  );
}
