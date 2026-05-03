import { Link } from 'react-router-dom';
import { Home, TrendingDown } from 'lucide-react';
import Logo from '../components/Logo';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="p-6 sm:p-8">
        <Logo />
      </header>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bear-500 text-cream text-xs font-bold mb-6">
            <TrendingDown size={12}/> 404 · PAGE NOT FOUND
          </div>
          <h1 className="font-display text-7xl sm:text-9xl font-black leading-none mb-4">
            Oops.
          </h1>
          <p className="text-xl text-ink/60 mb-8">
            This page dropped harder than a bear market. Let's get you back.
          </p>
          <Link to="/" className="btn-primary">
            <Home size={16}/> Back to safety
          </Link>
        </div>
      </div>
    </div>
  );
}
