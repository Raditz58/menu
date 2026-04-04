import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { Upload, X, Loader2, Settings as SettingsIcon } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function Settings() {
  const { restaurantId } = useOutletContext();
  const { t } = useLanguage();
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (restaurantId) {
      fetchRestaurantData();
    }
  }, [restaurantId]);

  const fetchRestaurantData = async () => {
    try {
      const snap = await getDoc(doc(db, 'restaurants', restaurantId));
      if (snap.exists()) {
        const data = snap.data();
        setLogoUrl(data.logoUrl || '');
      }
    } catch (err) {
      console.error('Error fetching restaurant settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageUploading(true);
      setUploadProgress(10);
      
      try {
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET; 
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', `logos/${restaurantId}`);

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
        setLogoUrl(data.secure_url);
        setUploadProgress(100);
      } catch (error) {
        console.error("Upload error:", error);
        alert(t('uploadError') || "Image upload failed: " + error.message);
      } finally {
        setImageUploading(false);
      }
    }
  };

  const handleSave = async () => {
    if (imageUploading) {
        alert(t('waitImageUpload') || "Please wait for the image to finish uploading.");
        return;
    }
    setSaving(true);
    try {
        await updateDoc(doc(db, 'restaurants', restaurantId), { logoUrl });
        alert(t('success') || 'Settings saved successfully!');
    } catch (err) {
        console.error('Error saving settings:', err);
        alert(t('error') + ': ' + err.message);
    } finally {
        setSaving(false);
    }
  };

  const handleRemoveLogo = () => {
    if (confirm(t('confirmDelete') || 'Remove logo?')) {
        setLogoUrl('');
    }
  };

  if (loading) {
    return <div className="p-8"><Loader2 className="animate-spin text-gray-400" /></div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <SettingsIcon className="text-gray-700" /> {t('settings') || 'Ayarlar'}
      </h2>
       
      <div className="bg-white p-6 rounded-lg shadow max-w-2xl">
        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Restoran Logosu</h3>
        
        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
            
            {logoUrl ? (
                <div className="relative inline-block border-2 border-gray-200 rounded-lg p-2 bg-gray-50">
                    <img 
                      src={logoUrl} 
                      alt="Restaurant Logo" 
                      className="h-32 w-auto object-contain bg-white rounded shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md transition-transform active:scale-95"
                      title="Logoyu Kaldır"
                    >
                      <X size={16} />
                    </button>
                </div>
            ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors bg-gray-50">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="logo-upload"
                    />
                    <label 
                        htmlFor="logo-upload" 
                        className="cursor-pointer flex flex-col items-center gap-3"
                    >
                        <Upload className="text-gray-400" size={36} />
                        <span className="text-sm font-medium text-gray-600">
                           {t('clickToUpload') || 'Yüklemek için tıklayın'}
                        </span>
                        <span className="text-xs text-gray-400">
                           Önerilen: PNG, Taze arka plan
                        </span>
                    </label>
                </div>
            )}

            {/* Upload Progress */}
            {imageUploading && (
                <div className="mt-4 max-w-xs">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>{t('uploading') || 'Yüklüyor...'}</span>
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

        <button 
           onClick={handleSave}
           disabled={saving || imageUploading} 
           className="bg-indigo-600 border border-transparent text-white px-6 py-3 shadow-md rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 font-bold w-full md:w-auto transition-all"
        >
            {saving && <Loader2 className='animate-spin' size={18} />}
            {t('save') || 'Kaydet'}
        </button>
      </div>
    </div>
  );
}
