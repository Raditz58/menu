import { useAuth } from '../../contexts/AuthContext';
import KitchenView from './Kitchen';
import ServiceView from './Service';
import CashierView from './Cashier';

export default function StaffDashboard() {
  const { role, userData, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;

  if (!userData?.restaurantId) {
    return <div className="p-8 text-center text-red-500">Hata: Bu hesapla ilişkilendirilmiş herhangi bir restoran bulunamadı.</div>;
  }

  const { restaurantId } = userData;

  switch (role) {
    case 'kitchen':
      return <KitchenView restaurantId={restaurantId} />;
    case 'service':
      return <ServiceView restaurantId={restaurantId} />;
    case 'cashier':
      return <CashierView restaurantId={restaurantId} />;
    default:
      return <div className="p-8 text-center">Yetkisiz erişim veya bilinmeyen rol: {role}</div>;
  }
}
