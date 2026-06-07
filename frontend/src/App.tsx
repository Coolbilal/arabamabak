import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import AuctionsPage from './pages/AuctionsPage';
import ValuationPage from './pages/ValuationPage';
import CategoryPage from './pages/CategoryPage';
import VehicleDetailPage from './pages/VehicleDetailPage';
import CreateListingPage from './pages/CreateListingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import WalletPage from './pages/WalletPage';
import MessagesPage from './pages/MessagesPage';
import FavoritesPage from './pages/FavoritesPage';
import ExpertisePage from './pages/ExpertisePage';
import MyListingsPage from './pages/MyListingsPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="/kategori/:cat" element={<CategoryPage />} />
        <Route path="/ilan/:id" element={<VehicleDetailPage />} />
        <Route path="/giris" element={<LoginPage />} />
        <Route path="/kayit" element={<RegisterPage />} />
        <Route path="/profil" element={<ProfilePage />} />
        <Route path="/profil/cuzdan" element={<WalletPage />} />
        <Route path="/profil/ilanlarim" element={<MyListingsPage />} />
        <Route path="/profil/mesajlar" element={<MessagesPage />} />
        <Route path="/profil/favoriler" element={<FavoritesPage />} />
        <Route path="/profil/ekspertiz" element={<ExpertisePage />} />
        <Route path="/ilan-ver" element={<CreateListingPage />} />
        <Route path="/ekspertiz" element={<ExpertisePage />} />
        <Route path="/muzayedeler" element={<AuctionsPage />} />
        <Route path="/arac-deger" element={<ValuationPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
