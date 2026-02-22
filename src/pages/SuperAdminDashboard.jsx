import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth'; // Note: creating another user while logged in is tricky with client SDK. 
// Ideally SuperAdmin should use a separate Admin SDK or Cloud Function to create users without logging out. 
// However, for this MVP, we might simply create the user in Firestore and let them sign up, or re-auth? 
// Actually, client SDK creates user and signs them in, logging out the current user. 
// WORKAROUND: Use a temporary secondary app instance or just create the data and let the user 'claim' it? 
// OR: Just create the Restaurant and invitation link?
// User Requirement: "Ability to create the first 'Admin' user for a specific restaurant."
// We will try to use a secondary app instance to create user if possible, or just create the Document and assume the user registers. 
// BUT, to follow instructions, I will try to use a secondary app initialization to create user without logging out SuperAdmin.

import { initializeApp } from 'firebase/app';

// Re-init for secondary auth to avoid logging out superadmin
const secondaryApp = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
}, "Secondary");

const secondaryAuth = getAuth(secondaryApp);


export default function SuperAdminDashboard() {
  const [restaurants, setRestaurants] = useState([]);
  const [newRestName, setNewRestName] = useState('');
  const [newRestSlug, setNewRestSlug] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    const snaps = await getDocs(collection(db, 'restaurants'));
    setRestaurants(snaps.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleCreateRestaurant = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      // 1. Create Restaurant Doc
      const restRef = await addDoc(collection(db, 'restaurants'), {
        name: newRestName,
        slug: newRestSlug,
        createdAt: serverTimestamp(),
        // other defaults
      });

      // 2. Create Admin User
      // Using secondary auth to not logout current superadmin
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, adminEmail, adminPassword);
      const uid = userCred.user.uid;

      // 3. Store user in Firestore
      await setDoc(doc(db, 'users', uid), {
        uid,
        email: adminEmail,
        role: 'admin',
        restaurantId: restRef.id,
        createdAt: serverTimestamp()
      });

      setMsg('Restaurant and Admin created successfully!');
      setNewRestName('');
      setNewRestSlug('');
      setAdminEmail('');
      setAdminPassword('');
      fetchRestaurants();
    } catch (err) {
      console.error(err);
      setMsg('Error: ' + err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        <button 
            onClick={() => auth.signOut()}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm"
        >
            Logout
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">Create New Restaurant</h2>
          {msg && <p className="mb-4 text-sm font-medium text-blue-600">{msg}</p>}
          <form onSubmit={handleCreateRestaurant} className="space-y-4">
            <input type="text" placeholder="Restaurant Name" className="w-full border p-2 rounded" value={newRestName} onChange={e => setNewRestName(e.target.value)} required />
            <input type="text" placeholder="URL Slug" className="w-full border p-2 rounded" value={newRestSlug} onChange={e => setNewRestSlug(e.target.value)} required />
            <div className="border-t pt-4 mt-4">
                <p className="mb-2 text-sm text-gray-600">Initial Admin User</p>
                <input type="email" placeholder="Admin Email" className="w-full border p-2 rounded mb-2" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required />
                <input type="password" placeholder="Admin Password" className="w-full border p-2 rounded" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required />
            </div>
            <button disabled={loading} className="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 disabled:opacity-50">
                {loading ? 'Creating...' : 'Create Restaurant'}
            </button>
          </form>
        </div>

        <div className="bg-white p-6 rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Existing Restaurants</h2>
            <ul>
                {restaurants.map(r => (
                    <li key={r.id} className="border-b py-2 flex justify-between items-center">
                        <div>
                            <p className="font-bold">{r.name}</p>
                            <p className="text-sm text-gray-500">/{r.slug}</p>
                        </div>
                        <Link to={`/admin/${r.id}`} className="text-blue-600 hover:underline text-sm ml-4">
                            Manage &rarr;
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
      </div>
    </div>
  );
}
