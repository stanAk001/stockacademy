import { motion } from 'framer-motion';
import { Github, Twitter, Linkedin, Mail, Globe, Quote } from 'lucide-react';
import { creator } from '../siteConfig';

const socialIcons = {
  twitter: Twitter,
  github: Github,
  linkedin: Linkedin,
  email: Mail,
  website: Globe,
};

export default function AboutCreator() {
  const initials = creator.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const activeSocials = Object.entries(creator.socials).filter(([, v]) => v);

  return (
    <section className="py-24 bg-cream-warm relative overflow-hidden">
      {/* Decorative shapes */}
      <div className="absolute top-10 right-10 w-32 h-32 bg-sun-300/30 animate-blob" />
      <div className="absolute bottom-10 left-10 w-40 h-40 bg-coral-300/30 animate-blob" style={{ animationDelay: '4s' }} />
      <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-bull-500 rounded-full animate-float-slow" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 items-center">

          {/* ----- CREATIVE PHOTO COLUMN ----- */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-5 flex justify-center lg:justify-start"
          >
            <div className="relative">
              {/* Outer decorative rings */}
              <div className="absolute inset-0 animate-spin-slow" style={{ animationDuration: '40s' }}>
                <svg viewBox="0 0 300 300" className="w-[22rem] h-[22rem]">
                  <defs>
                    <path id="circlePath" d="M 150, 150 m -130, 0 a 130,130 0 1,1 260,0 a 130,130 0 1,1 -260,0" />
                  </defs>
                  <text className="fill-ink font-mono text-[11px] uppercase tracking-[0.3em] font-bold">
                    <textPath href="#circlePath">
                      · Built with curiosity · Built with care · Built with curiosity · Built with care ·
                    </textPath>
                  </text>
                </svg>
              </div>

              {/* Photo container */}
              <div className="relative w-80 h-80 mx-auto">
                {/* Background blob */}
                <div className="absolute -top-4 -left-4 w-full h-full bg-sun-300 animate-blob" />
                <div className="absolute top-4 left-4 w-full h-full bg-coral-300 animate-blob" style={{ animationDelay: '2s' }} />

                {/* The photo itself */}
                <div className="absolute inset-0 rounded-full overflow-hidden ring-8 ring-ink bg-ink grain-overlay">
                  {creator.photo ? (
                    <img src={creator.photo} alt={creator.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-ink to-ink-soft">
                      <span className="font-display text-8xl font-black text-sun-300">{initials}</span>
                    </div>
                  )}
                </div>

                {/* Floating badge 1 */}
                <div className="absolute -top-2 -right-2 bg-bull-500 text-cream rounded-2xl px-4 py-2 rotate-6 shadow-xl animate-float-fast">
                  <p className="text-xs font-bold uppercase">Creator</p>
                </div>

                {/* Floating badge 2 */}
                <div className="absolute -bottom-4 -left-6 bg-ink text-cream rounded-full w-24 h-24 grid place-items-center -rotate-12 shadow-xl animate-float-slow">
                  <div className="text-center">
                    <p className="text-2xl">👋</p>
                    <p className="text-[10px] font-bold uppercase">Hi there</p>
                  </div>
                </div>

                {/* Dotted outline */}
                <svg className="absolute -inset-8 pointer-events-none" viewBox="0 0 400 400">
                  <circle cx="200" cy="200" r="195" fill="none" stroke="#0F1419" strokeWidth="2" strokeDasharray="2 8" className="opacity-20" />
                </svg>
              </div>
            </div>
          </motion.div>

          {/* ----- TEXT COLUMN ----- */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-7"
          >
            <p className="text-sm font-bold uppercase tracking-widest text-coral-500 mb-3">
              Meet the maker
            </p>

            <h2 className="font-display font-black text-4xl sm:text-5xl leading-[1.05] mb-3">
              Made by one person,<br />
              <span className="italic">for people like you.</span>
            </h2>

            <p className="font-display text-xl text-ink/80 mb-2">
              <span className="font-bold">{creator.name}</span>
              <span className="text-ink/50 font-normal"> · {creator.role}</span>
            </p>

            <div className="relative my-6 pl-6 border-l-4 border-sun-400">
              <Quote className="absolute -top-2 -left-3 bg-cream-warm text-sun-500" size={24} />
              <p className="font-display italic text-2xl leading-snug text-ink">
                "{creator.tagline}"
              </p>
            </div>

            <p className="text-ink/70 leading-relaxed text-lg mb-6">
              {creator.bio}
            </p>

            {/* Fun fact chips */}
            {creator.facts?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {creator.facts.map((fact) => (
                  <span key={fact} className="chip bg-white text-ink border border-ink/10 px-4 py-1.5">
                    ✦ {fact}
                  </span>
                ))}
              </div>
            )}

            {/* Socials */}
            {activeSocials.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {activeSocials.map(([key, url]) => {
                  const Icon = socialIcons[key];
                  const href = key === 'email' ? `mailto:${url}` : url;
                  return (
                    <a
                      key={key}
                      href={href}
                      target={key === 'email' ? '_self' : '_blank'}
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-ink text-cream hover:bg-ink-soft transition group"
                    >
                      <Icon size={16} className="group-hover:text-sun-300 transition" />
                      <span className="text-sm font-semibold capitalize">{key}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
