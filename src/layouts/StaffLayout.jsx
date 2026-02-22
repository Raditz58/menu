import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, KeyRound } from 'lucide-react';
import ChangePasswordModal from '../components/ChangePasswordModal';

export default function StaffLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
      alert("Çıkış yapılırken bir hata oluştu.");
    }
  };

  const username = user?.email?.split('@')[0] || 'Personel';

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Bar - Dark Premium Theme for Staff */}
      <header className="bg-admin-bg text-admin-text shadow-lg sticky top-0 z-40">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-admin-primary flex items-center justify-center font-bold text-white shadow-sm">
                {username.charAt(0).toUpperCase()}
             </div>
             <div>
                <span className="text-xs text-admin-text-muted hidden sm:block">Hoş Geldiniz,</span>
                <p className="font-semibold text-white leading-tight capitalize">{username}</p>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button
               onClick={() => setIsPasswordModalOpen(true)}
               className="flex items-center gap-2 text-sm bg-admin-surface hover:bg-admin-surface/80 border border-gray-700 px-3 py-2 rounded-lg transition-colors text-white"
               title="Şifre Değiştir"
             >
                <KeyRound size={16} />
                <span className="hidden sm:inline">Şifre Değiştir</span>
             </button>
             
             <button
               onClick={handleLogout}
               className="flex items-center gap-2 text-sm bg-admin-danger hover:bg-red-600 px-3 py-2 rounded-lg transition-colors text-white shadow-sm"
               title="Çıkış Yap"
             >
                <LogOut size={16} />
                <span className="hidden sm:inline">Çıkış Yap</span>
             </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        <Outlet />
      </main>

      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />
    </div>
  );
}
