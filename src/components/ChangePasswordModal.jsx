import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { X, Lock, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function ChangePasswordModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setError(t('passwordMismatch') || "Passwords do not match");
    }
    if (newPassword.length < 6) {
      return setError(t('passwordLengthError') || "Password must be at least 6 characters");
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Re-authenticate user
      // Note: This relies on the user object being from Firebase Auth state, which it should be.
      // If user signed in with custom logic, we need to ensure this keeps working.
      // The requirement asks to double check this works for Kitchen/Service/Cashier.
      // All use the same AuthContext, so `user` object is the Firebase User.
      
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);
      
      setSuccess(t('success'));
      setTimeout(() => {
        onClose();
        // Reset form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setSuccess('');
      }, 2000);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/wrong-password') {
        setError(t('incorrectPassword') || "Incorrect current password");
      } else if (err.code === 'auth/too-many-requests') {
        setError(t('tooManyRequests') || "Too many attempts. Please try again later.");
      } else {
        setError(t('error') + ": " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Lock size={18} /> {t('changePassword')}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
          {success && <div className="bg-green-50 text-green-600 p-3 rounded mb-4 text-sm">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('currentPassword') || 'Current Password'}</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="******"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('newPassword') || 'New Password'}</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="******"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('confirmPassword') || 'Confirm Password'}</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="******"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : t('update')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
