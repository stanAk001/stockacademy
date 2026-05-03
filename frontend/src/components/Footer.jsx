import { Link } from 'react-router-dom';
import Logo from './Logo';
import { Github, Twitter, Linkedin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-ink text-cream mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2">
            <Logo />
            <p className="mt-4 text-sm text-cream/60 max-w-sm leading-relaxed">
              The friendliest way to learn the stock market. From zero to confident investor — through courses,
              simulations, and a community that actually helps.
            </p>
            <div className="flex gap-3 mt-5">
              {[ Twitter].map((Icon, i) => (
                <a key={i} href="https://x.com/ak_stan001" className="w-10 h-10 rounded-full bg-cream/5 hover:bg-sun-300 hover:text-ink grid place-items-center transition">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display font-bold mb-3 text-sun-300">Learn</h4>
            <ul className="space-y-2 text-sm text-cream/70">
              <li><Link to="/courses" className="hover:text-cream">Courses</Link></li>
              <li><Link to="/simulator" className="hover:text-cream">Simulator</Link></li>
              <li><Link to="/forum" className="hover:text-cream">Community</Link></li>
              <li><Link to="/leaderboard" className="hover:text-cream">Leaderboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold mb-3 text-sun-300">About</h4>
            <ul className="space-y-2 text-sm text-cream/70">
              <li><a href="#" className="hover:text-cream">Our mission</a></li>
              <li><a href="#" className="hover:text-cream">Contact</a></li>
              <li><a href="#" className="hover:text-cream">Privacy</a></li>
              <li><a href="#" className="hover:text-cream">Terms</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-cream/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-cream/50">
            © {new Date().getFullYear()} StockAcademy. Educational analysis and research tools.
          </p>
          <p className="text-xs text-cream/50 font-mono">Built with 💛 on the PERN stack</p>
        </div>
        <p className="mt-4 text-[10px] text-cream/30 text-center max-w-3xl mx-auto leading-relaxed">
          We may earn commissions when users sign up through partner links — at no extra cost to you.
          Investment decisions are yours to make based on your own goals and circumstances.
        </p>
      </div>
    </footer>
  );
}
