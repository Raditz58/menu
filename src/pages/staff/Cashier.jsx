import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, query, where, onSnapshot, doc, writeBatch, serverTimestamp, orderBy, getDoc, updateDoc
} from 'firebase/firestore';
import { DollarSign, X, Banknote, CheckCircle } from 'lucide-react';

export default function CashierView({ restaurantId }) {
  const [tables, setTables] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatedItemKey, setUpdatedItemKey] = useState(null); // flash toast key

  useEffect(() => {
    // 1. Listen to Tables
    const qTables = query(
        collection(db, 'tables'), 
        where('restaurantId', '==', restaurantId)
    );
    const unsubTables = onSnapshot(qTables, (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort by tableCode alphanumerically if possible
        list.sort((a, b) => a.tableCode.localeCompare(b.tableCode, undefined, { numeric: true }));
        setTables(list);
    });

    // 2. Listen to Active Orders (not paid)
    const qOrders = query(
        collection(db, 'orders'), 
        where('restaurantId', '==', restaurantId),
        where('status', 'in', ['pending', 'preparing', 'ready', 'delivered']),
        orderBy('createdAt', 'asc')
    );
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setActiveOrders(list);
        setLoading(false);
    });

    return () => {
        unsubTables();
        unsubOrders();
    };
  }, [restaurantId]);

  // Helper to check if table is occupied
  const getTableOrders = (tableCode) => {
      return activeOrders.filter(o => o.tableCode === tableCode);
  };

  const isTableOccupied = (tableCode) => {
      return getTableOrders(tableCode).length > 0;
  };

  const handleTableClick = (table) => {
      if (isTableOccupied(table.tableCode)) {
          setSelectedTable(table);
      }
  };

  const closeAccount = async () => {
      if (!selectedTable) return;
      if (!confirm(`Close account for ${selectedTable.tableCode}? This will mark all orders as paid.`)) return;

      const tableOrders = getTableOrders(selectedTable.tableCode);
      const batch = writeBatch(db);

      // 1. Update all orders to 'paid'
      tableOrders.forEach(order => {
          const ref = doc(db, 'orders', order.id);
          batch.update(ref, {
              status: 'paid',
              completedAt: serverTimestamp()
          });
      });

      // 2. Update table status to 'empty'
      const tableRef = doc(db, 'tables', selectedTable.id);
      batch.update(tableRef, {
          status: 'empty',
          currentSessionId: null
      });

      try {
          await batch.commit();
          setSelectedTable(null);
      } catch (error) {
          console.error("Payment failed:", error);
          alert("Payment failed. Please try again.");
      }
  };

  // Cancel a single item by index in its order
  const cancelItem = async (orderId, itemIndex) => {
    if (!confirm('Bu ürünü iptal etmek istediğinize emin misiniz?')) return;
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        const updatedItems = [...orderData.items];
        if (updatedItems[itemIndex]) {
          updatedItems[itemIndex] = { ...updatedItems[itemIndex], status: 'cancelled' };
          await updateDoc(orderRef, {
            items: updatedItems,
            updatedAt: serverTimestamp()
          });
        }
      }
    } catch (err) {
      console.error('Error cancelling item:', err);
      alert('Ürün iptal edilemedi. Lütfen tekrar deneyin.');
    }
  };

  // Update item quantity (-/+). Reaching 0 marks item as cancelled.
  const updateItemQty = async (orderId, itemIndex, delta) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) return;

      const orderData = orderSnap.data();
      const updatedItems = orderData.items.map((item, idx) => {
        if (idx !== itemIndex) return item;
        const newQty = (item.quantity || 1) + delta;
        if (newQty <= 0) return { ...item, quantity: 0, status: 'cancelled' };
        return { ...item, quantity: newQty, status: item.status === 'cancelled' ? 'pending' : item.status };
      });

      await updateDoc(orderRef, { items: updatedItems, updatedAt: serverTimestamp() });

      const key = `${orderId}_${itemIndex}`;
      setUpdatedItemKey(key);
      setTimeout(() => setUpdatedItemKey(null), 1500);
    } catch (err) {
      console.error('Error updating item qty:', err);
      alert('Ürün güncellenemedi. Lütfen tekrar deneyin.');
    }
  };

  // Calculate Bill
  const getBillDetails = () => {
      if (!selectedTable) return { items: [], total: 0 };
      const orders = getTableOrders(selectedTable.tableCode);
      
      // Flatten items from ALL active orders
      let allItems = [];
      let total = 0;

      orders.forEach(order => {
          if (order.items) {
              order.items.forEach((item, idx) => {
                  allItems.push({ ...item, orderId: order.id, itemIndex: idx });
                  // Only add to total if NOT cancelled
                  if (item.status !== 'cancelled') {
                      total += (Number(item.price) * (Number(item.quantity) || 0));
                  }
              });
          } else if (order.totalPrice) {
               // Fallback for orders without items array (legacy)
               total += order.totalPrice;
          }
      });
      
      return { items: allItems, total };
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading POS...</div>;

  const { items, total } = getBillDetails();

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6 text-gray-800">
            <DollarSign className="text-emerald-600" /> Cashier / POS
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {tables.map(table => {
                // Use table status from DB for consistency
                const occupied = table.status === 'occupied';
                return (
                    <button 
                        key={table.id}
                        onClick={() => handleTableClick(table)}
                        disabled={!occupied}
                        className={`
                            aspect-square rounded-xl shadow-lg flex flex-col items-center justify-center p-4 transition-all
                            ${occupied 
                                ? 'bg-red-500 text-white hover:bg-red-600 cursor-pointer transform hover:scale-105' 
                                : 'bg-emerald-500 text-white opacity-70 cursor-default'}
                        `}
                    >
                        <span className="text-3xl font-bold">{table.tableCode}</span>
                        <div className="mt-2 text-xs uppercase font-bold tracking-wider px-2 py-1 rounded bg-black/20">
                            {occupied ? 'Occupied' : 'Empty'}
                        </div>
                        {occupied && (
                            <div className="mt-2 text-sm font-semibold">
                                ₺{getTableOrders(table.tableCode).reduce((acc, order) => {
                                    // Calculate total from items, filtering out cancelled
                                    const orderTotal = order.items
                                        ? order.items.reduce((s, i) => s + (i.status !== 'cancelled' ? (Number(i.price) * (Number(i.quantity) || 0)) : 0), 0)
                                        : (order.totalPrice || 0); // Fallback
                                    return acc + orderTotal;
                                }, 0).toFixed(0)}
                            </div>
                        )}
                    </button>
                );
            })}
        </div>

        {/* Selected Table Modal / Overlay */}
        {selectedTable && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Table {selectedTable.tableCode}</h2>
                            <p className="text-sm text-gray-500">Bill Details</p>
                        </div>
                        <button onClick={() => setSelectedTable(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1">
                        {/* Summary of Non-Delivered Orders */}
                        {getTableOrders(selectedTable.tableCode).filter(o => o.status !== 'delivered').length > 0 && (
                             <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <Banknote className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-yellow-700">
                                            There are {getTableOrders(selectedTable.tableCode).filter(o => o.status !== 'delivered').length} orders not yet delivered. They will be marked as paid.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {items.length > 0 ? (
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tüm Ürünler</h3>
                                <ul className="space-y-3">
                                    {items.map((item, i) => {
                                      const itemKey = `${item.orderId}_${item.itemIndex}`;
                                      const isUpdated = updatedItemKey === itemKey;
                                      const isCancelled = item.status === 'cancelled';
                                      return (
                                        <li key={i} className={`flex justify-between items-center pb-2 border-b border-dashed border-gray-200 last:border-0 transition-all duration-300 ${isCancelled ? 'opacity-40' : isUpdated ? 'bg-green-50 rounded-lg px-2' : ''}`}>
                                            {/* Name + qty */}
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <span className={`bg-gray-100 text-gray-600 font-bold px-2 py-1 rounded text-sm flex-shrink-0 ${isCancelled ? 'line-through' : ''}`}>
                                                  {item.quantity}x
                                                </span>
                                                <div className="flex flex-col min-w-0">
                                                    <span className={isCancelled ? 'line-through text-gray-400' : 'text-gray-700'}>{item.name}</span>
                                                    {isCancelled && <span className="text-[10px] text-red-500 font-bold uppercase">İptal Edildi</span>}
                                                    {isUpdated && <span className="text-[10px] text-green-600 font-bold">Güncellendi ✓</span>}
                                                </div>
                                            </div>

                                            {/* Price + controls */}
                                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                <span className={`font-semibold text-sm ${isCancelled ? 'line-through text-gray-400 decoration-red-400' : 'text-gray-900'}`}>
                                                    ₺{item.price ? (item.price * item.quantity).toFixed(2) : '-'}
                                                </span>
                                                {!isCancelled && (
                                                  <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg px-1">
                                                    <button
                                                      onClick={() => updateItemQty(item.orderId, item.itemIndex, -1)}
                                                      className="w-7 h-7 flex items-center justify-center text-red-500 hover:bg-red-100 rounded font-bold text-lg leading-none transition-colors"
                                                      title="Azalt"
                                                    >
                                                      −
                                                    </button>
                                                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                                    <button
                                                      onClick={() => updateItemQty(item.orderId, item.itemIndex, +1)}
                                                      className="w-7 h-7 flex items-center justify-center text-green-600 hover:bg-green-100 rounded font-bold text-lg leading-none transition-colors"
                                                      title="Artır"
                                                    >
                                                      +
                                                    </button>
                                                  </div>
                                                )}
                                            </div>
                                        </li>
                                      );
                                    })}
                                </ul>
                            </div>
                        ) : (
                            <div className="text-center py-10 text-gray-400">
                                <p>No items found.</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-50 p-6 border-t">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-lg font-medium text-gray-600">Total Amount</span>
                            <span className="text-4xl font-bold text-gray-900">${total.toFixed(2)}</span>
                        </div>

                        <button 
                            onClick={closeAccount}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all active:scale-98"
                        >
                            <CheckCircle size={24} /> Close Account & Pay
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
