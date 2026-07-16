import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import HeaderTopAdBanner from './HeaderTopAdBanner';
import ModalAdBanner from './ModalAdBanner';

export default function Layout() {
  return (
    <div className="flex min-h-full flex-col">
      <ModalAdBanner />
      <HeaderTopAdBanner />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
