import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-menu-bg flex flex-col items-center justify-center p-4">
      <div className="bg-menu-surface p-8 rounded-2xl shadow-xl border border-menu-border text-center max-w-md w-full">
        <h1 className="text-4xl font-bold text-menu-primary mb-4">404</h1>
        <h2 className="text-xl font-semibold text-menu-text mb-2">Sayfa Bulunamadı</h2>
        <p className="text-menu-text-muted mb-8">veya Geçersiz Masa Bağlantısı</p>
        
        <button
          onClick={() => navigate('/')}
          className="w-full bg-menu-primary hover:bg-menu-accent text-menu-bg font-bold py-3 px-6 rounded-xl transition duration-300 shadow-lg"
        >
          Ana Sayfaya Dön
        </button>
      </div>
    </div>
  );
}
