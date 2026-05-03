import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout({ children, noFooter = false }) {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Navbar />
      <main className="flex-1">{children}</main>
      {!noFooter && <Footer />}
    </div>
  );
}
