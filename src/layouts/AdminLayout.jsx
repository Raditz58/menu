import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Grid, LogOut, Users, MessageSquare, Globe, Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useLanguage } from '../contexts/LanguageContext';

import ChangePasswordModal from '../components/ChangePasswordModal';

export default function AdminLayout() {
  const { logout, userData, role, user } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { restaurantId } = useParams();
  
  const [activeRestaurant, setActiveRestaurant] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    // If Admin, ensure checking authorized access
    if (role === 'admin' && userData?.restaurantId !== restaurantId) {
        // Redirect to their own or handle error. 
        // For simplicity, just redirect them to their own
        if (userData?.restaurantId) navigate(`/admin/${userData.restaurantId}`);
        else navigate('/login');
        return;
    }
    
    // Fetch Restaurant Details for UI
    if (restaurantId) {
        getDoc(doc(db, 'restaurants', restaurantId)).then(snap => {
            if (snap.exists()) {
                setActiveRestaurant({ id: snap.id, ...snap.data() });
            }
        });
    }
  }, [restaurantId, role, userData, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const basePath = `/admin/${restaurantId}`;

  const navItems = [
    { label: t('overview'), path: basePath, icon: <LayoutDashboard size={20} /> },
    { label: t('categories'), path: `${basePath}/categories`, icon: <Grid size={20} /> },
    { label: t('products'), path: `${basePath}/products`, icon: <UtensilsCrossed size={20} /> },
    { label: t('tables'), path: `${basePath}/tables`, icon: <ShoppingBag size={20} /> },
    { label: t('staff'), path: `${basePath}/staff`, icon: <Users size={20} /> },
    { label: t('adminFeedback'), path: `${basePath}/feedback`, icon: <MessageSquare size={20} /> },
    { label: t('settings') || 'Ayarlar', path: `${basePath}/settings`, icon: <SettingsIcon size={20} /> },
  ];

  // If superadmin, show a "Back to Dashboard" link
  const isSuperAdmin = role === 'superadmin';

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r shadow-sm flex flex-col">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-xl font-bold text-gray-800">{t('management')}</h1>
            {/* Language Toggle */}
            <button
                onClick={toggleLanguage}
                className="p-1 hover:bg-gray-100 rounded transition-colors text-xs font-bold text-gray-600 flex items-center gap-1"
                title="Change Language"
            >
                <Globe size={14} />
                {language.toUpperCase()}
            </button>
          </div>
          {isSuperAdmin && <Link to="/superadmin" className="text-xs text-blue-500 hover:underline">← {t('back')} SuperAdmin</Link>}
          {activeRestaurant && <p className="text-sm font-semibold text-gray-600 mt-2">{activeRestaurant.name}</p>}
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            // Exact match for root, startsWith for sub-routes usually, but here exact paths defined
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t bg-gray-50">
          <div className="mb-4 text-sm text-gray-600">
            <p className="font-medium text-gray-800">{t('loggedInAs')}</p>
            <div className="flex items-center gap-2">
                <p className="truncate" title={userData?.email}>{userData?.email?.split('@')[0]}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                    userData?.status === 'active' || !userData?.status 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                    {userData?.status === 'active' || !userData?.status ? t('active') : t('passive')}
                </span>
            </div>
            <button 
                onClick={() => setShowPasswordModal(true)} 
                className="text-xs text-blue-600 hover:underline mt-1"
            >
                {t('changePassword')}
            </button>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-2 w-full text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
          >
            <LogOut size={18} />
            <span className="font-medium text-sm">{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        {/* Pass activeRestaurant and restaurantId down to children */}
        <Outlet context={{ restaurantId, restaurantData: activeRestaurant }} />
        
        {/* Change Password Modal */}
        {showPasswordModal && (
            <ChangePasswordModal 
                isOpen={showPasswordModal} 
                onClose={() => setShowPasswordModal(false)} 
            />
        )}
      </main>
    </div>
  );
}
