import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { Trash2, Edit2, Upload, X, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function Products() {
  const { restaurantId } = useOutletContext();
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    imageUrl: '', 
    isAvailable: true
  });

  useEffect(() => {
    if (restaurantId) {
      fetchCategories();
      fetchProducts();
    }
  }, [restaurantId]);

  const fetchCategories = async () => {
    try {
        const q = query(collection(db, 'categories'), where('restaurantId', '==', restaurantId));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.order || 0) - (b.order || 0));
        setCategories(list);
    } catch (err) {
        console.error("Error fetching categories:", err);
    }
  };

  const fetchProducts = async () => {
    try {
        const q = query(collection(db, 'products'), where('restaurantId', '==', restaurantId));
        const snap = await getDocs(q);
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
        console.error("Error fetching products:", err);
    }
  };

  const [imageUploading, setImageUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (imageUploading) {
        alert(t('waitImageUpload') || "Please wait for the image to finish uploading.");
        return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        restaurantId: restaurantId,
      };

      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), payload);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'products'), payload);
      }
      
      setForm({ name: '', description: '', price: '', categoryId: '', imageUrl: '', isAvailable: true });
      setImageFile(null);
      setImagePreview('');
      setUploadProgress(0);
      fetchProducts();
    } catch (error) {
      console.error(error);
      alert(t('error') + ': ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      setImageUploading(true);
      setUploadProgress(10);
      
      try {
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET; 
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', `products/${restaurantId}`);

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            {
              method: 'POST',
              body: formData
            }
        );

        setUploadProgress(80);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to upload image');
        }

        const data = await response.json();
        setForm(prev => ({ ...prev, imageUrl: data.secure_url }));
        setUploadProgress(100);
      } catch (error) {
        console.error("Upload error:", error);
        alert(t('uploadError') || "Image upload failed: " + error.message);
        setForm(prev => ({ ...prev, imageUrl: '' }));
      } finally {
        setImageUploading(false);
      }
    }
  };

  const handleEdit = (prod) => {
    setForm({
      name: prod.name,
      description: prod.description || '',
      price: prod.price,
      categoryId: prod.categoryId,
      imageUrl: prod.imageUrl || '',
      isAvailable: prod.isAvailable
    });
    setImagePreview(prod.imageUrl || '');
    setImageFile(null);
    setEditingId(prod.id);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({ name: '', description: '', price: '', categoryId: '', imageUrl: '', isAvailable: true });
    setImageFile(null);
    setImagePreview('');
    setUploadProgress(0);
  };

  const handleDelete = async (id) => {
    if (!confirm(t('confirmDelete') || 'Delete this product?')) return;
    await deleteDoc(doc(db, 'products', id));
    fetchProducts();
  };

  return (
    <div>
       <h2 className="text-2xl font-bold mb-6">{t('products')}</h2>
       
       <div className="bg-white p-6 rounded-lg shadow mb-8">
         <h3 className="text-lg font-semibold mb-4">{editingId ? t('edit') : t('add')} {t('products')}</h3>
         <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">{t('name')}</label>
                <input type="text" required className="w-full border p-2 rounded" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">{t('description')}</label>
                <textarea className="w-full border p-2 rounded" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">{t('price')}</label>
                <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">₺</span>
                    <input type="number" step="0.01" required className="w-full border p-2 pl-8 rounded" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">{t('categories')}</label>
                <select required className="w-full border p-2 rounded" value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})}>
                    <option value="">{t('selectCategory') || 'Select Category'}</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('image')}</label>
                
                {imagePreview && (
                  <div className="mb-4 relative inline-block">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="h-32 w-32 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview('');
                        setForm({...form, imageUrl: ''});
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* File Input */}
                {!imagePreview && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="image-upload"
                    />
                    <label 
                        htmlFor="image-upload" 
                        className="cursor-pointer flex flex-col items-center gap-2"
                    >
                        <Upload className="text-gray-400" size={32} />
                        <span className="text-sm text-gray-600">
                        {t('clickToUpload') || 'Click to upload'}
                        </span>
                        <span className="text-xs text-gray-400">
                        PNG, JPG, GIF up to 10MB
                        </span>
                    </label>
                    </div>
                )}

                {/* Upload Progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{t('uploading') || 'Uploading...'}</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
            </div>

            <div className="md:col-span-2 flex items-center gap-2">
                <input type="checkbox" id="avail" checked={form.isAvailable} onChange={e => setForm({...form, isAvailable: e.target.checked})} />
                <label htmlFor="avail">{t('available') || 'Available'}</label>
            </div>

            <div className="md:col-span-2 flex gap-2">
                <button disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2">
                    {loading && <Loader2 className='animate-spin' size={16} />}
                    {editingId ? t('update') : t('create')}
                </button>
                {editingId && (
                    <button type="button" onClick={handleCancelEdit} className="text-gray-500 px-4 py-2 hover:bg-gray-100 rounded">
                        {t('cancel')}
                    </button>
                )}
            </div>
         </form>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.length === 0 && !loading && (
            <div className="col-span-full text-center py-12 text-gray-500">
                <UtensilsCrossed className="mx-auto mb-4 text-gray-300" size={48} />
                <p>{t('noData')}</p>
            </div>
          )}
         {products.map(prod => (
             <div key={prod.id} className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition">
                 <div className="h-48 bg-gray-200 flex items-center justify-center relative group">
                    {prod.imageUrl ? (
                        <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                    ) : <UtensilsCrossed className="text-gray-400" />}
                    {!prod.isAvailable && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white font-bold border border-white px-2 py-1 rounded">{t('unavailable') || 'UNAVAILABLE'}</span>
                        </div>
                    )}
                 </div>
                 <div className="p-4">
                     <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-lg">{prod.name}</h4>
                        <span className="font-mono font-semibold text-green-700">₺{prod.price}</span>
                     </div>
                     <p className="text-gray-500 text-sm mb-4 line-clamp-2">{prod.description}</p>
                     <div className="flex justify-between items-center text-sm text-gray-400">
                         <span>{categories.find(c => c.id === prod.categoryId)?.name || t('uncategorized')}</span>
                         <div className="flex gap-2">
                             <button onClick={() => handleEdit(prod)} className="text-blue-500 hover:text-blue-700"><Edit2 size={18} /></button>
                             <button onClick={() => handleDelete(prod.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                         </div>
                     </div>
                 </div>
             </div>
         ))}
       </div>
    </div>
  );
}

function UtensilsCrossed(props) {
    return (
        <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" />
      <path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2 0L19 10" />
      <path d="M9 11 2 18a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2l7-7" />
    </svg>
    )
}
