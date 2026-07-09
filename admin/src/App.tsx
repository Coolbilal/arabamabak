import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AuctionApplicationsPage from './pages/AuctionApplicationsPage';
import IncomingAuctionsPage from './pages/IncomingAuctionsPage';
import LiveAuctionsPage from './pages/LiveAuctionsPage';
import SoldAuctionsPage from './pages/SoldAuctionsPage';
import FreeListingsPage from './pages/FreeListingsPage';
import ExpertisePage from './pages/ExpertisePage';
import SettingsPage from './pages/SettingsPage';
import AuthorizationPage from './pages/AuthorizationPage';
import DealershipsPage from './pages/DealershipsPage';
import UsersPage from './pages/UsersPage';
import TransactionsPage from './pages/TransactionsPage';
import SlotsPage from './pages/SlotsPage';
import PaymentMethodsPage from './pages/PaymentMethodsPage';
import PendingListingsPage from './pages/PendingListingsPage';
import NotFoundPage from './pages/NotFoundPage';
import CorporateApplicationsPage from './pages/CorporateApplicationsPage';
import ExpertValetApplicationsPage from './pages/ExpertValetApplicationsPage';
import ExpertiseDealershipApplicationsPage from './pages/ExpertiseDealershipApplicationsPage';
import PaymentsPage from './pages/PaymentsPage';
import ExpertValetsPage from './pages/ExpertValetsPage';
import ExpertiseDealershipsPage from './pages/ExpertiseDealershipsPage';
import AdBannersPage from './pages/AdBannersPage';

function Protected({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">Yükleniyor...</div>;
  if (!admin) return <Navigate to="/giris" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/giris" element={<LoginPage />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<DashboardPage />} />
        <Route path="auctions" element={<AuctionApplicationsPage />} />
        <Route path="free-listings" element={<FreeListingsPage />} />
        <Route path="expertise" element={<ExpertisePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="payment-methods" element={<PaymentMethodsPage />} />
        <Route path="pending-listings" element={<PendingListingsPage />} />
        <Route path="auction-applications" element={<AuctionApplicationsPage />} />
        <Route path="auctions-incoming" element={<IncomingAuctionsPage />} />
        <Route path="auctions-live" element={<LiveAuctionsPage />} />
        <Route path="auctions-sold" element={<SoldAuctionsPage />} />
        <Route path="authorization" element={<AuthorizationPage />} />
        <Route path="dealerships" element={<DealershipsPage />} />
        <Route path="corporate-applications" element={<CorporateApplicationsPage />} />
        <Route path="expert-valet-applications" element={<ExpertValetApplicationsPage />} />
        <Route path="expertise-dealership-applications" element={<ExpertiseDealershipApplicationsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="expert-valets" element={<ExpertValetsPage />} />
        <Route path="expertise-dealerships" element={<ExpertiseDealershipsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="slots" element={<SlotsPage />} />
        <Route path="site/reklamlar" element={<AdBannersPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
