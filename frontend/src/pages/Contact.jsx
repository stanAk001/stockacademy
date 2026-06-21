import { useState } from 'react';
import { Mail, Twitter, MapPin, Send } from 'lucide-react';
import Layout from '../components/Layout';
import { creator } from '../siteConfig';

const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-ink/10 bg-cream-warm text-sm focus:outline-none focus:border-ink/30 transition';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = `StockAcademia — message from ${form.name || 'a user'}`;
    const body = `${form.message}\n\n— ${form.name}${form.email ? ` (${form.email})` : ''}`;
    window.location.href = `mailto:${creator.socials.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <p className="text-xs sm:text-sm font-black uppercase tracking-[0.15em] text-coral-500 mb-3">Get in touch</p>
        <h1 className="font-display text-3xl sm:text-5xl font-black leading-[1.05]">
          Questions, feedback, or <span className="italic text-coral-500">just say hi.</span>
        </h1>
        <p className="text-ink/65 text-base sm:text-lg mt-4 leading-relaxed max-w-2xl">
          StockAcademia is built by one person who genuinely reads every message. Tell us what’s confusing,
          what’s missing, or what you’d love to see next.
        </p>

        <div className="grid lg:grid-cols-5 gap-6 mt-10">
          {/* Methods */}
          <div className="lg:col-span-2 space-y-3">
            <a href={`mailto:${creator.socials.email}`} className="card-soft p-5 flex items-center gap-3 hover:-translate-y-0.5 transition">
              <div className="w-10 h-10 bg-ink text-sun-300 rounded-xl grid place-items-center shrink-0"><Mail size={18} /></div>
              <div className="min-w-0">
                <p className="font-bold text-sm">Email</p>
                <p className="text-xs text-ink/55 truncate">{creator.socials.email}</p>
              </div>
            </a>
            <a href={creator.socials.twitter} target="_blank" rel="noreferrer" className="card-soft p-5 flex items-center gap-3 hover:-translate-y-0.5 transition">
              <div className="w-10 h-10 bg-ink text-sun-300 rounded-xl grid place-items-center shrink-0"><Twitter size={18} /></div>
              <div className="min-w-0">
                <p className="font-bold text-sm">X (Twitter)</p>
                <p className="text-xs text-ink/55 truncate">@ak_stan001</p>
              </div>
            </a>
            <div className="card-soft p-5 flex items-center gap-3">
              <div className="w-10 h-10 bg-ink text-sun-300 rounded-xl grid place-items-center shrink-0"><MapPin size={18} /></div>
              <div className="min-w-0">
                <p className="font-bold text-sm">Based in</p>
                <p className="text-xs text-ink/55">{creator.location}</p>
              </div>
            </div>
            <p className="text-[11px] text-ink/45 leading-relaxed px-1">
              We usually reply within a couple of days. For account or payment issues, include the email you signed up with.
            </p>
          </div>

          {/* Form (opens the user's email app) */}
          <form className="lg:col-span-3 card-soft p-6" onSubmit={handleSubmit}>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <input required value={form.name} onChange={set('name')} placeholder="Your name" className={inputCls} />
              <input required type="email" value={form.email} onChange={set('email')} placeholder="Your email" className={inputCls} />
            </div>
            <textarea required rows={5} value={form.message} onChange={set('message')} placeholder="What’s on your mind?" className={`${inputCls} resize-none`} />
            <button type="submit" className="btn-primary mt-3 w-full justify-center">Send message <Send size={15} /></button>
            <p className="text-[11px] text-ink/45 mt-2 text-center">This opens your email app with the message ready to send.</p>
          </form>
        </div>
      </div>
    </Layout>
  );
}
