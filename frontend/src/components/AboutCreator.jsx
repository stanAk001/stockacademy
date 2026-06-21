import { motion } from 'framer-motion';
import { Github, Twitter, Linkedin, Mail, Globe, Quote, MapPin } from 'lucide-react';
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
    <section className="py-16 sm:py-24 bg-cream-warm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 sm:gap-14 items-center">

          {/* ----- PHOTO: clean editorial offset frame ----- */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5 flex justify-center"
          >
            <div className="relative w-64 sm:w-80">
              {/* solid offset accent (crisp, not blurred) */}
              <div className="absolute inset-0 translate-x-3 translate-y-3 sm:translate-x-4 sm:translate-y-4 rounded-[2rem] bg-sun-300" />

              {/* the portrait */}
              <div className="relative rounded-[2rem] overflow-hidden ring-4 ring-ink bg-ink aspect-[4/5]">
                {creator.photo ? (
                  <img src={creator.photo} alt={creator.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center">
                    <span className="font-display text-7xl font-black text-sun-300">{initials}</span>
                  </div>
                )}
              </div>

              {/* CREATOR tag */}
              <div className="absolute -top-3 left-4 bg-ink text-cream text-[10px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-full shadow-sm">
                Creator
              </div>

              {/* friendly corner badge */}
              <div className="absolute -bottom-3 -right-3 bg-bull-500 text-cream rounded-2xl px-3 py-2 text-center shadow-sm">
                <p className="text-lg leading-none">👋</p>
                <p className="text-[9px] font-black uppercase tracking-wider mt-0.5">Hi there</p>
              </div>
            </div>
          </motion.div>

          {/* ----- TEXT ----- */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:col-span-7 min-w-0"
          >
            <p className="text-xs sm:text-sm font-black uppercase tracking-[0.15em] text-coral-500 mb-3">
              Meet the maker
            </p>

            <h2 className="font-display font-black text-[2rem] leading-[1.05] sm:text-5xl sm:leading-[1.04] mb-4 break-words">
              Made by one of us,<br />
              <span className="italic text-coral-500">for the rest of us.</span>
            </h2>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-5">
              <span className="font-display text-lg sm:text-xl font-bold">{creator.name}</span>
              <span className="text-ink/50">· {creator.role}</span>
              {creator.location && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink/55 bg-white border border-ink/10 rounded-full px-2.5 py-1">
                  <MapPin size={12} className="text-coral-500" /> {creator.location}
                </span>
              )}
            </div>

            {/* Pull-quote */}
            <div className="relative pl-5 sm:pl-6 border-l-4 border-sun-400 mb-6">
              <Quote className="absolute -top-1 -left-3 bg-cream-warm text-sun-500" size={22} />
              <p className="font-display italic text-xl sm:text-2xl leading-snug text-ink break-words">
                "{creator.tagline}"
              </p>
            </div>

            <p className="text-ink/70 leading-relaxed text-[15px] sm:text-lg mb-6 break-words">
              {creator.bio}
            </p>

            {/* Fact chips */}
            {creator.facts?.filter(Boolean).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-7">
                {creator.facts.filter(Boolean).map((fact) => (
                  <span key={fact} className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-ink/75 bg-white border border-ink/10 rounded-full px-3 py-1.5">
                    <span className="text-coral-500">✦</span> {fact}
                  </span>
                ))}
              </div>
            )}

            {/* Socials */}
            {activeSocials.length > 0 && (
              <div className="flex flex-wrap gap-2.5">
                {activeSocials.map(([key, url]) => {
                  const Icon = socialIcons[key];
                  const href = key === 'email' ? `mailto:${url}` : url;
                  return (
                    <a
                      key={key}
                      href={href}
                      target={key === 'email' ? '_self' : '_blank'}
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ink text-cream hover:bg-ink-soft transition"
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
