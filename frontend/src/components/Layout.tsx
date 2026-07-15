import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import HeaderTopAdBanner from './HeaderTopAdBanner';

export default function Layout() {
  return (
    <div className="flex min-h-full flex-col">
      <HeaderTopAdBanner />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
