import { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { ExternalLink, QrCode, Trash2, Plus, Download, X } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

export default function Tables() {
  const { restaurantId, restaurantData } = useOutletContext();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generateCount, setGenerateCount] = useState({
    prefix: 'ST',
    startNo: 1,
    endNo: 10
  });
  const [selectedQR, setSelectedQR] = useState(null);
  const qrRef = useRef(null);

  useEffect(() => {
    if (restaurantId) {
      fetchTables();
    }
  }, [restaurantId]);

  const fetchTables = async () => {
    const q = query(collection(db, 'tables'), where('restaurantId', '==', restaurantId));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => a.tableCode.localeCompare(b.tableCode, undefined, { numeric: true }));
    setTables(list);
  };

  const handleBulkGenerate = async () => {
    const { prefix, startNo, endNo } = generateCount;
    if (!prefix || startNo < 1 || endNo < startNo) {
      alert('Please provide a valid prefix and number range.');
      return;
    }

    setLoading(true);
    try {
        for (let i = startNo; i <= endNo; i++) {
            const code = `${prefix}-${String(i).padStart(2, '0')}`;
            
            await addDoc(collection(db, 'tables'), {
                tableCode: code,
                restaurantId: restaurantId,
                status: 'empty',
                currentSessionId: null,
                createdAt: serverTimestamp()
            });
        }

        alert(`Successfully generated ${endNo - startNo + 1} tables!`);
        fetchTables();
    } catch (err) {
        console.error(err);
        alert('Error generating tables: ' + err.message);
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove table?')) return;
    await deleteDoc(doc(db, 'tables', id));
    fetchTables();
  };

  const downloadQR = () => {
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector('canvas');
    const image = canvas.toDataURL("image/png");
    const link = document.createElement('a');
    link.href = image;
    link.download = `QR-${restaurantData?.slug}-${selectedQR?.tableCode}.png`;
    link.click();
  };

  const qrUrl = (code) => {
      // Use window.location.origin to support local dev and prod
      const origin = window.location.origin;
      return `${origin}/menu/${restaurantData?.slug}/${code}`;
  };

  return (
    <div>
        <h2 className="text-2xl font-bold mb-6">Masa Yönetimi</h2>

        <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h3 className="text-lg font-semibold mb-4">Masaları Yönet</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Manual Add */}
                <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Tekli Masa Ekle</h4>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const code = e.target.elements.tableCode.value;
                        if(code) {
                             addDoc(collection(db, 'tables'), {
                                tableCode: code,
                                restaurantId: restaurantId,
                                status: 'empty',
                                currentSessionId: null,
                                createdAt: serverTimestamp()
                            }).then(() => {
                                e.target.reset();
                                fetchTables();
                            });
                        }
                    }} className="flex gap-2 items-end">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Masa Kodu</label>
                            <input name="tableCode" type="text" placeholder="e.g. T-01, S-02" className="border p-2 rounded w-40" required />
                        </div>
                        <button type="submit" disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2">
                            <Plus size={18} />
                            Ekle
                        </button>
                    </form>
                </div>

                {/* Bulk Generation */}
                <div className="border-l pl-8">
                     <h4 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Toplu Masa Oluşturma</h4>
                     <p className="text-xs text-gray-500 mb-4">Özel bir önek ve sayı aralığı ile birden fazla masa oluşturun</p>
                    <div className="flex gap-3 items-end flex-wrap">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Önek</label>
                            <input 
                              type="text" 
                              value={generateCount.prefix || 'ST'} 
                              onChange={e => setGenerateCount({...generateCount, prefix: e.target.value})} 
                              className="border p-2 rounded w-20"
                              placeholder="ST"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç No.</label>
                            <input 
                              type="number" 
                              min="1"
                              value={generateCount.startNo || 1} 
                              onChange={e => setGenerateCount({...generateCount, startNo: parseInt(e.target.value)})} 
                              className="border p-2 rounded w-24" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş No.</label>
                            <input 
                              type="number" 
                              min="1"
                              value={generateCount.endNo || 10} onChange={e => setGenerateCount({...generateCount, endNo: parseInt(e.target.value)})} 
                              className="border p-2 rounded w-24" 
                            />
                        </div>
                        <button onClick={handleBulkGenerate} disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center gap-2">
                            <Plus size={18} />
                            {((generateCount.endNo || 10) - (generateCount.startNo || 1) + 1)} Masa Oluştur
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {tables.map(table => (
                <div key={table.id} className="bg-white p-4 rounded shadow flex flex-col items-center justify-center border-t-4 border-indigo-500 relative group hover:shadow-lg transition-shadow">
                    <button onClick={() => handleDelete(table.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500">
                        <Trash2 size={16} />
                    </button>
                    <div className="text-2xl font-bold mb-1">{table.tableCode}</div>
                    <div className={`text-xs px-2 py-1 rounded-full ${table.status === 'occupied' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {table.status}
                    </div>
                    <div className="mt-4 flex gap-2">
                        <button 
                            onClick={() => setSelectedQR(table)}
                            className="bg-gray-100 text-gray-600 p-2 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                            title="View QR Code"
                        >
                            <QrCode size={20} />
                        </button>
                        {restaurantData?.slug && (
                            <a 
                                href={qrUrl(table.tableCode)}
                                target="_blank" 
                                className="bg-gray-100 text-gray-600 p-2 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                title="Open Menu Link"
                            >
                                <ExternalLink size={20} />
                            </a>
                        )}
                    </div>
                </div>
            ))}
        </div>

        {/* QR Code Modal */}
        {selectedQR && (
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                <div onClick={() => setSelectedQR(null)} className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
                <div className="relative z-10 w-[calc(100%-2rem)] mx-4 sm:w-full sm:max-w-sm sm:mx-auto bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col items-center animate-in zoom-in-95 duration-200 max-h-[90vh]">
                    <div className="w-full relative p-5 sm:p-8 flex flex-col items-center overflow-y-auto">
                        <button 
                            onClick={() => setSelectedQR(null)}
                            className="absolute top-4 right-4 min-w-[40px] min-h-[40px] flex items-center justify-center text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                        
                        <h3 className="text-xl font-bold mb-1">Masa {selectedQR.tableCode}</h3>
                        <p className="text-gray-500 text-sm mb-6">{restaurantData?.name}</p>
                        
                        <div ref={qrRef} className="bg-white p-4 rounded-xl shadow-inner border border-gray-100 mb-6 flex-shrink-0">
                            <QRCodeCanvas 
                                value={qrUrl(selectedQR.tableCode)}
                                size={200}
                                level={"H"}
                                includeMargin={true}
                                imageSettings={{
                                    src: "/logo-placeholder.png", // Or restaurant logo if available
                                    x: undefined,
                                    y: undefined,
                                    height: 24,
                                    width: 24,
                                    excavate: true,
                                }}
                            />
                        </div>

                        <p className="text-xs text-center text-gray-400 mb-6 break-all">
                            {qrUrl(selectedQR.tableCode)}
                        </p>

                        <button 
                            onClick={downloadQR}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors flex-shrink-0"
                        >
                            <Download size={20} />
                            QR Kodunu İndir
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
