import Navbar from './Navbar';
import Footer from './Footer';
import MembershipBanner from './MembershipBanner';

export default function Layout({ children, noFooter = false }) {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Navbar />
      <MembershipBanner />
      <main className="flex-1">{children}</main>
      {!noFooter && <Footer />}
    </div>
  );
}
