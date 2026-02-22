import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { Trash2, Edit2, Plus, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function Categories() {
  const { restaurantId } = useOutletContext();
  const { t } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [order, setOrder] = useState('0');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (restaurantId) {
      fetchCategories();
    }
  }, [restaurantId]);

  const fetchCategories = async () => {
    try {
      const q = query(
        collection(db, 'categories'), 
        where('restaurantId', '==', restaurantId)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      setCategories(list);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'categories', editingId), {
          name,
          order: parseInt(order),
        });
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'categories'), {
          name,
          order: parseInt(order),
          restaurantId: restaurantId
        });
      }
      setName('');
      setOrder('0');
      fetchCategories();
    } catch (error) {
      console.error(error);
      alert(t('error') + ': ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('confirmDelete') || 'Are you sure?')) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
      fetchCategories();
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (cat) => {
    setName(cat.name);
    setOrder(cat.order);
    setEditingId(cat.id);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t('categories')}</h2>
      
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h3 className="text-lg font-semibold mb-4">{editingId ? t('edit') : t('add')} {t('categories')}</h3>
        <form onSubmit={handleSubmit} className="flex gap-4 items-end flex-wrap">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('categoryName') || 'Category Name'}</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full border rounded p-2" 
              placeholder={t('namePlaceholder') || "e.g. Starters"}
              required 
            />
          </div>
          <div className="w-24">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('order') || 'Order'}</label>
            <input 
              type="number" 
              value={order} 
              onChange={e => setOrder(e.target.value)} 
              className="w-full border rounded p-2" 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : (editingId ? <Edit2 size={16} /> : <Plus size={16} />)}
            {editingId ? t('update') : t('add')}
          </button>
          {editingId && (
            <button 
              type="button" 
              onClick={() => { setEditingId(null); setName(''); setOrder('0'); }}
              className="text-gray-500 hover:text-gray-700 px-4 py-2"
            >
              {t('cancel')}
            </button>
          )}
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
                {t('noData')}
            </div>
        )}
        {categories.map(cat => (
          <div key={cat.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
            <div>
              <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full mr-2">#{cat.order}</span>
              <span className="font-semibold">{cat.name}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(cat)} className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                <Edit2 size={16} />
              </button>
              <button onClick={() => handleDelete(cat.id)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
