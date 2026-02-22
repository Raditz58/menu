import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { useOutletContext } from 'react-router-dom';
import { Trash2, UserPlus, Shield, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

// Reuse the secondary app workaround for creating staff without logging out admin
import { getApp, getApps, initializeApp as initializeAppImpl } from 'firebase/app';
import { firebaseConfig } from '../../lib/firebase';

let secondaryAuth;

function getSecondaryAuth() {
    if (secondaryAuth) return secondaryAuth;
    
    const appName = "SecondaryStaff";
    let secondaryApp = getApps().find(a => a.name === appName);
    
    if (!secondaryApp) {
        secondaryApp = initializeAppImpl(firebaseConfig, appName);
    }
    
    secondaryAuth = getAuth(secondaryApp);
    return secondaryAuth;
}

export default function Staff() {
  const { role: currentRole } = useAuth();
  const { restaurantId } = useOutletContext();
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('service');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // Access Control
  const canCreateStaff = currentRole === 'superadmin';
  const canDeleteStaff = currentRole === 'superadmin';

  useEffect(() => {
    if (restaurantId) {
      fetchStaff();
    }
  }, [restaurantId]);

  const fetchStaff = async () => {
    try {
        const q = query(collection(db, 'users'), where('restaurantId', '==', restaurantId));
        const snap = await getDocs(q);
        setUsers(snap.docs.map(d => ({ ...d.data(), uid: d.id }))); 
    } catch (err) {
        console.error("Error fetching staff:", err);
    }
  };

  // Create user
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (currentRole !== 'superadmin') {
        setMsg(t('unauthorized') || 'Error: Unauthorized.');
        return;
    }

    setLoading(true);
    setMsg('');
    try {
        // Construct email from username
        const email = `${username}@omfy.com`;

        // Ensure secondary app for auth creation
        const authToUse = getSecondaryAuth();

        const userCred = await createUserWithEmailAndPassword(authToUse, email, password);
        const uid = userCred.user.uid;

        await setDoc(doc(db, 'users', uid), {
            uid,
            email,
            role, // kitchen, service, cashier, admin
            restaurantId,
            status: 'active', // Default status
            createdAt: serverTimestamp()
        });

        setMsg(t('success'));
        setUsername('');
        setPassword('');
        fetchStaff();
    } catch (err) {
        console.error(err);
        setMsg(t('error') + ': ' + err.message);
    } finally {
        setLoading(false);
    }
  };

  // Toggle User Status (Active/Passive)
  const handleToggleStatus = async (user) => {
      if (currentRole !== 'superadmin') {
          alert(t('unauthorized') || 'Unauthorized');
          return;
      }

      const newStatus = user.status === 'active' ? 'passive' : 'active';
      const actionName = newStatus === 'active' ? t('activate') : t('deactivate');

      if(!confirm(`${t('confirm')} ${actionName}?`)) return;
      
      setLoading(true);
      try {
        await setDoc(doc(db, 'users', user.uid), { status: newStatus }, { merge: true });
        // setMsg(`User marked as ${newStatus}.`);
        await fetchStaff();
      } catch (err) {
        console.error("Error updating status:", err);
        setMsg(t('error') + ': ' + err.message);
      } finally {
        setLoading(false);
      }
  };

  return (
    <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <UserPlus className="text-blue-600" /> {t('staff')}
        </h2>

        {/* Only SuperAdmin can create staff */}
        {canCreateStaff ? (
          <div className="bg-white p-6 rounded-lg shadow mb-8 border border-gray-100">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">{t('add')} {t('staff')}</h3>
            {msg && <p className={`mb-4 text-sm ${msg.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>}
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('username')}</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        required 
                        value={username} 
                        onChange={e => setUsername(e.target.value)} 
                        className="w-full border rounded-lg p-2 pr-24 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="waiter01"
                      />
                      <span className="absolute right-3 top-2 text-gray-400 text-sm">@omfy.com</span>
                    </div>
                </div>
                <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
                    <input 
                        type="password" 
                        required 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                    />
                </div>
                <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('role')}</label>
                    <select 
                        value={role} 
                        onChange={e => setRole(e.target.value)} 
                        className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                        <option value="service">Service (Waiter)</option>
                        <option value="kitchen">Kitchen</option>
                        <option value="cashier">Cashier</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <button 
                    disabled={loading} 
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <><UserPlus size={18} /> {t('create')}</>}
                </button>
            </form>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-8">
            <p className="text-sm text-yellow-800 flex items-center gap-2">
              <Shield size={16} />
              Only SuperAdmins can manage staff members. You can view the list below.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map(u => {
                const isActive = u.status === 'active' || !u.status; // Default to active if undefined
                return (
                    <div key={u.uid} className={`bg-white p-4 rounded-xl shadow-sm border flex justify-between items-start transition-all hover:shadow-md ${!isActive ? 'opacity-60 bg-gray-50' : ''}`}>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Shield size={16} className={u.role === 'admin' || u.role === 'superadmin' ? 'text-purple-600' : 'text-gray-400'} />
                                <span className="font-bold capitalize text-gray-800">{u.role}</span>
                                {!isActive && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold ml-2">{t('passive') || 'PASSIVE'}</span>}
                            </div>
                            <p className="text-gray-900 font-semibold">{u.email?.split('@')[0]}</p>
                            <p className="text-xs text-gray-400 mt-1">{t('status')}: <span className={isActive ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>{isActive ? t('active') : t('passive')}</span></p>
                        </div>
                        {/* Only SuperAdmin can toggle status */}
                        {canDeleteStaff && (
                          <button 
                            onClick={() => handleToggleStatus(u)} 
                            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                                isActive 
                                ? 'border-red-200 text-red-600 hover:bg-red-50' 
                                : 'border-green-200 text-green-600 hover:bg-green-50'
                            }`}
                        >
                            {isActive ? t('deactivate') : t('activate')}
                          </button>
                        )}
                    </div>
                );
            })}
             {users.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed">
                    <UserPlus size={48} className="mx-auto text-gray-300 mb-4" />
                    <p>{t('noData')}</p>
                </div>
            )}
        </div>
    </div>
  );
}
