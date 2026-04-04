import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  collection, query, where, getDocs, doc, onSnapshot, 
  setDoc, updateDoc, serverTimestamp, addDoc, deleteDoc, getDoc 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, Plus, Minus, X, UtensilsCrossed, ChevronRight, 
  Clock, CheckCircle, ChefHat, BellRing, Bell, MessageSquare, Globe, Loader2
} from 'lucide-react';

export default function Menu() {
  const { restaurantSlug, tableCode } = useParams();
  const { t, language, toggleLanguage } = useLanguage();
  
  const [restaurant, setRestaurant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('cart'); // 'cart' or 'orders'
  const [orderStatus, setOrderStatus] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [waiterCallSuccess, setWaiterCallSuccess] = useState(false);
  const [updatedItemKey, setUpdatedItemKey] = useState(null); // e.g. `${orderId}_${idx}`
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [wasOccupied, setWasOccupied] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);

  const [localGuestId] = useState(() => {
    let gid = localStorage.getItem('guestId');
    if (!gid) {
      gid = crypto.randomUUID();
      localStorage.setItem('guestId', gid);
    }
    return gid;
  });

  const optimizeImage = (url, width) => {
    if (!url) return '';
    if (url.includes('cloudinary.com')) {
      return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
    }
    return url;
  };

  // 1. Fetch Restaurant by Slug
  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const q = query(collection(db, 'restaurants'), where('slug', '==', restaurantSlug));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setRestaurant({ id: snap.docs[0].id, ...data });
        } else {
          console.error("Restaurant not found");
        }
      } catch (err) {
        console.error("Error fetching restaurant:", err);
      }
    };
    if (restaurantSlug) fetchRestaurant();
  }, [restaurantSlug]);

  // 2. Fetch Menu Data
  useEffect(() => {
    if (!restaurant?.id) return;

    const fetchMenu = async () => {
      try {
        const catQ = query(collection(db, 'categories'), where('restaurantId', '==', restaurant.id));
        const catSnap = await getDocs(catQ);
        const cats = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        cats.sort((a, b) => (a.order || 0) - (b.order || 0));
        setCategories(cats);
        if (cats.length > 0) setActiveCategory(cats[0].id);

        const prodQ = query(collection(db, 'products'), where('restaurantId', '==', restaurant.id));
        const prodSnap = await getDocs(prodQ);
        setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching menu:", err);
        setLoading(false);
      }
    };
    fetchMenu();
  }, [restaurant]);

  // 3. Real-Time Cart
  useEffect(() => {
    if (!restaurant?.id || !tableCode) return;

    const sessionId = `${restaurant.id}_${tableCode}`;
    const sessionRef = doc(db, 'active_sessions', sessionId);

    const unsubscribe = onSnapshot(sessionRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCart(data.items || []);
      } else {
        setDoc(sessionRef, {
          restaurantId: restaurant.id,
          tableCode,
          items: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setCart([]);
      }
    });
    return () => unsubscribe();
  }, [restaurant, tableCode]);

  // 4. Listen for Active Orders
  useEffect(() => {
    if (!restaurant?.id || !tableCode) return;

    const q = query(
      collection(db, 'orders'),
      where('restaurantId', '==', restaurant.id),
      where('tableCode', '==', tableCode)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const active = list.filter(o => 
        ['pending', 'preparing', 'ready', 'delivered'].includes(o.status)
      ).sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });
      setActiveOrders(active);
    });
    
    return () => unsubscribe();
  }, [restaurant, tableCode]);

  // 4b. Listen for Table Payment to clear session
  useEffect(() => {
    if (!restaurant?.id || !tableCode) return;

    const tableQuery = query(
      collection(db, 'tables'),
      where('restaurantId', '==', restaurant.id),
      where('tableCode', '==', tableCode)
    );

    const unsubscribe = onSnapshot(tableQuery, (snap) => {
      if (!snap.empty) {
        const tableData = snap.docs[0].data();
        if (tableData.status === 'occupied') {
          setWasOccupied(true);
        } else if (tableData.status === 'empty' && wasOccupied) {
          // Table was occupied during this session, and now is empty -> Paid
          setIsPaid(true);
          const sessionId = `${restaurant.id}_${tableCode}`;
          deleteDoc(doc(db, 'active_sessions', sessionId)).catch(console.error);
        }
      }
    });
    
    return () => unsubscribe();
  }, [restaurant, tableCode, wasOccupied]);

  // Cart Operations
  const addToCart = async (product) => {
    if (!restaurant?.id) return;
    const sessionId = `${restaurant.id}_${tableCode}`;
    const sessionRef = doc(db, 'active_sessions', sessionId);

    let newItems = [...cart];
    const existingIndex = newItems.findIndex(item => item.productId === product.id);

    if (existingIndex > -1) {
      newItems[existingIndex].quantity += 1;
    } else {
      newItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        guestId: localGuestId
      });
    }

    await updateDoc(sessionRef, { items: newItems, updatedAt: serverTimestamp() });
  };

  const updateQuantity = async (productId, delta) => {
    const sessionId = `${restaurant.id}_${tableCode}`;
    const sessionRef = doc(db, 'active_sessions', sessionId);
    
    let newItems = cart.map(item => {
      if (item.productId === productId) {
        return { ...item, quantity: item.quantity + delta };
      }
      return item;
    }).filter(item => item.quantity > 0);

    await updateDoc(sessionRef, { items: newItems, updatedAt: serverTimestamp() });
  };

  const placeOrder = async () => {
    if (cart.length === 0 || isSubmitting) return;
    setOrderStatus('sending');
    setIsSubmitting(true);

    try {
      const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      await addDoc(collection(db, 'orders'), {
        restaurantId: restaurant.id,
        tableCode,
        items: cart.map(item => ({ ...item, status: 'pending' })),
        totalPrice: total,
        status: 'pending',
        createdAt: serverTimestamp(),
        preparingAt: null,
        readyAt: null,
        deliveredAt: null,
        completedAt: null
      });

      const tableQuery = query(
        collection(db, 'tables'), 
        where('restaurantId', '==', restaurant.id),
        where('tableCode', '==', tableCode)
      );
      const tableSnap = await getDocs(tableQuery);
      if (!tableSnap.empty) {
        const tableDoc = tableSnap.docs[0];
        await updateDoc(doc(db, 'tables', tableDoc.id), {
          status: 'occupied',
          lastActivity: serverTimestamp()
        });
      }

      const sessionId = `${restaurant.id}_${tableCode}`;
      await deleteDoc(doc(db, 'active_sessions', sessionId));
      
      setOrderStatus('success');
      setTimeout(() => {
        setOrderStatus(null);
        setDrawerTab('orders'); // Switch to orders tab
      }, 2000);
    } catch (err) {
      console.error("Order failed:", err);
      setOrderStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Call Waiter
  const callWaiter = async () => {
    try {
      const q = query(
        collection(db, 'notifications'), 
        where('tableCode', '==', tableCode), 
        where('restaurantId', '==', restaurant.id),
        where('type', '==', 'waiter_call'), 
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const docId = snap.docs[0].id;
        await updateDoc(doc(db, 'notifications', docId), { updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'notifications'), {
          restaurantId: restaurant.id,
          tableCode,
          type: 'waiter_call',
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      setWaiterCallSuccess(true);
      setTimeout(() => setWaiterCallSuccess(false), 3000);
    } catch (err) {
      console.error("Error calling waiter:", err);
      alert(t('error'));
    }
  };

  // Send Feedback
  const sendFeedback = async () => {
    if (!feedbackText.trim()) return;
    
    try {
      await addDoc(collection(db, 'feedback'), {
        restaurantId: restaurant.id,
        tableCode,
        message: feedbackText,
        createdAt: serverTimestamp()
      });
      setFeedbackText('');
      setShowFeedback(false);
      alert(t('feedbackSuccess'));
    } catch (err) {
      console.error("Error sending feedback:", err);
    }
  };

  // Update item quantity (+/-). If quantity drops to 0, mark as cancelled.
  const handleUpdateItemQty = async (orderId, itemIndex, delta) => {
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

      // Flash 'Güncellendi' toast on this item
      const key = `${orderId}_${itemIndex}`;
      setUpdatedItemKey(key);
      setTimeout(() => setUpdatedItemKey(null), 1500);
    } catch (err) {
      console.error('Error updating item quantity:', err);
    }
  };

  // Derived state
  const productsByCategory = useMemo(() => {
    if (!activeCategory) return [];
    return products.filter(p => p.categoryId === activeCategory);
  }, [products, activeCategory]);

  const cartTotalInfo = useMemo(() => {
    const count = cart.reduce((acc, item) => acc + item.quantity, 0);
    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    return { count, total };
  }, [cart]);

  // Always compute order total live from items to avoid showing stale totalPrice
  const calcOrderTotal = (order) =>
    (order.items || [])
      .filter(i => i.status !== 'cancelled')
      .reduce((acc, i) => acc + (Number(i.price) * (i.quantity || 0)), 0);

  const themeColor = 'var(--menu-primary)'; // Menu primary gold

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-menu-bg"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-menu-primary"></div></div>;
  if (!restaurant) return <div className="min-h-screen flex items-center justify-center text-menu-text-muted">{t('noData')}</div>;

  if (isPaid) {
    return (
      <div className="min-h-screen bg-menu-bg flex flex-col items-center justify-center p-6 text-center text-menu-text">
        <CheckCircle size={64} className="text-menu-primary mb-6 animate-bounce" />
        <h2 className="text-2xl font-bold mb-4">Teşekkürler, ödemeniz alındı</h2>
        <p className="text-menu-text-muted mb-8 text-sm">Umarız yemeklerinizden memnun kalmışsınızdır. Yine bekleriz!</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-menu-primary text-menu-bg px-8 py-3 rounded-full font-bold hover:bg-menu-accent transition-colors shadow-lg"
        >
          Yeni Sipariş Ver
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-menu-bg pb-24 font-sans text-menu-text">
      {/* Header */}
      <header className="bg-menu-surface sticky top-0 z-30 border-b border-menu-border">
        <div className="px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3 overflow-hidden">
            {restaurant.logoUrl ? (
              <img src={optimizeImage(restaurant.logoUrl, 100)} alt="Logo" loading="lazy" className="w-10 h-10 rounded-full object-cover shadow-sm bg-white" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-menu-primary/10 flex items-center justify-center text-menu-primary shadow-sm border border-menu-primary/20">
                <span className="font-serif font-black italic text-lg">{restaurant.name.substring(0, 1).toUpperCase()}</span>
              </div>
            )}
            <div>
              <h1 className="font-bold text-lg leading-tight truncate text-menu-text">{restaurant.name}</h1>
              <div className="text-xs text-menu-text-muted font-medium">{t('menu')} • {tableCode}</div>
            </div>
          </div>
          
          <div className="flex gap-2">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="p-2 hover:bg-menu-bg rounded-full transition-colors"
              title="Change Language"
            >
              <Globe size={20} className="text-menu-text-muted" />
              <span className="text-xs font-bold text-menu-text-muted ml-1">{language.toUpperCase()}</span>
            </button>

            {/* Call Waiter Button */}
            <button
              onClick={callWaiter}
              className="flex items-center gap-2 bg-menu-bg hover:bg-[#2A2A2A] border border-menu-border text-menu-primary px-3 py-2 rounded-full text-sm font-bold transition-all"
            >
              <Bell size={16} />
              {t('callWaiter')}
            </button>
          </div>
        </div>
        
        {/* Category Nav */}
        <div className="overflow-x-auto whitespace-nowrap px-4 pb-0 hide-scrollbar flex gap-6 pt-4">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`pb-3 text-sm font-bold transition-all duration-300 ${
                activeCategory === cat.id 
                  ? 'border-b-2 border-menu-primary text-menu-primary' 
                  : 'text-menu-text-muted border-b-2 border-transparent hover:text-menu-text'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* Waiter Call Success Toast */}
      <AnimatePresence>
        {waiterCallSuccess && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-20 left-4 right-4 z-50 bg-menu-surface border border-menu-border text-menu-text p-4 rounded-xl shadow-lg flex items-center gap-3"
          >
            <CheckCircle size={24} className="text-menu-primary" />
            <div>
              <p className="font-bold">{t('waiterCalled')}</p>
              <p className="text-sm">{t('waiterCallSuccess')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Grid */}
      <main className="p-4 grid grid-cols-1 gap-4">
        <AnimatePresence mode='wait'>
          <motion.div 
            key={activeCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 gap-4"
          >
            {productsByCategory.map(product => (
              <motion.div 
                key={product.id}
                initial={{ scale: 0.95 }}
                whileInView={{ scale: 1 }}
                className="bg-menu-surface p-3 flex gap-4 border-b border-menu-border hover:bg-[#2A2A2A] transition-colors cursor-pointer"
                onClick={() => setSelectedProduct(product)}
              >
                <div className="w-28 h-28 bg-[#2A2A2A] flex-shrink-0 relative overflow-hidden rounded-lg">
                  {product.imageUrl ? (
                    <>
                      <img src={optimizeImage(product.imageUrl, 200)} alt={product.name} loading="lazy" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-menu-text-muted">
                      <UtensilsCrossed size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <h3 className="text-menu-text font-semibold text-lg tracking-wide">{product.name}</h3>
                    <p className="text-menu-text-muted text-sm font-light leading-relaxed line-clamp-2 mt-1">{product.description}</p>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-menu-primary font-bold text-xl">₺{product.price}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                      className="px-3 py-1 rounded bg-transparent border border-menu-primary text-menu-primary hover:bg-menu-primary hover:text-white active:scale-95 transition-all font-medium text-sm flex items-center gap-1"
                    >
                      <Plus size={14} /> {t('add')}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
            {productsByCategory.length === 0 && (
              <div className="text-center py-16 text-menu-text-muted flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-[#2A2A2A] rounded-full flex items-center justify-center">
                  <UtensilsCrossed size={32} className="text-menu-text-muted opacity-50" />
                </div>
                <p className="font-medium">{t('noData')}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Bottom Bar */}
      {(cartTotalInfo.count > 0 || activeOrders.length > 0) && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-6 left-4 right-4 z-40 bg-menu-surface/80 backdrop-blur-md border border-menu-border p-2 rounded-2xl shadow-2xl"
        >
          <div className="flex gap-2">
            <button
              onClick={() => setShowFeedback(true)}
              className="bg-menu-bg border border-menu-border text-menu-primary p-4 rounded-xl hover:bg-[#2A2A2A] transition-colors"
              title={t('feedback')}
            >
              <MessageSquare size={20} />
            </button>
            
            {cartTotalInfo.count > 0 ? (
                <button 
                onClick={() => {
                    setDrawerTab('cart');
                    setIsDrawerOpen(true);
                }}
                className="flex-1 bg-menu-primary text-menu-bg p-4 rounded-xl shadow-lg flex justify-between items-center font-bold text-lg hover:bg-menu-accent transition-colors"
                >
                <div className="flex items-center gap-3">
                    <div className="bg-menu-bg/20 px-3 py-1 rounded-full text-sm">{cartTotalInfo.count}</div>
                    <ShoppingBag size={20} />
                    <span>{t('cart')}</span>
                </div>
                <span>₺{cartTotalInfo.total.toFixed(2)}</span>
                </button>
            ) : (
                <button 
                onClick={() => {
                    setDrawerTab('orders');
                    setIsDrawerOpen(true);
                }}
                className="flex-1 bg-menu-bg border border-menu-border text-menu-text p-4 rounded-xl shadow-lg flex justify-center items-center font-bold text-lg hover:bg-[#2A2A2A] transition-colors"
                >
                <div className="flex items-center gap-2">
                    <Clock size={20} />
                    <span>{t('orderStatus') || 'Sipariş Durumu'}</span>
                </div>
                </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Feedback Modal */}
      <AnimatePresence>
        {showFeedback && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFeedback(false)}
              className="fixed inset-0 bg-black z-50"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-menu-surface border border-menu-border z-50 rounded-2xl shadow-2xl p-6 w-[90%] max-w-md text-menu-text"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-menu-primary">{t('feedback')}</h3>
                <button onClick={() => setShowFeedback(false)} className="p-2 hover:bg-[#2A2A2A] rounded-full text-menu-text-muted">
                  <X size={20} />
                </button>
              </div>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder={t('feedbackPlaceholder')}
                className="w-full bg-menu-bg border border-menu-border rounded-lg p-3 min-h-[120px] text-menu-text focus:border-menu-primary focus:outline-none"
              />
              <button
                onClick={sendFeedback}
                disabled={!feedbackText.trim()}
                className="w-full bg-menu-primary hover:bg-menu-accent disabled:bg-[#2A2A2A] disabled:text-menu-text-muted text-menu-bg py-3 rounded-lg font-bold mt-4 transition-colors"
              >
                {t('sendFeedback')}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Drawer - Cart & Orders Tabs */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black z-50"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-menu-surface border-t border-menu-border z-50 rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col"
            >
              {/* Tabs Header */}
              <div className="p-4 border-b border-menu-border">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-menu-text">Masa {tableCode}</h2>
                  <button onClick={() => setIsDrawerOpen(false)} className="p-2 bg-[#2A2A2A] border border-menu-border text-menu-text rounded-full hover:bg-menu-bg">
                    <X size={20} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDrawerTab('cart')}
                    className={`flex-1 py-2 px-4 rounded-lg font-bold transition-colors border border-menu-border ${
                      drawerTab === 'cart' ? 'bg-[#2A2A2A] text-menu-primary' : 'bg-menu-bg text-menu-text-muted hover:text-menu-text'
                    }`}
                  >
                    {t('cart')} ({cart.length})
                  </button>
                  <button
                    onClick={() => setDrawerTab('orders')}
                    className={`flex-1 py-2 px-4 rounded-lg font-bold transition-colors border border-menu-border ${
                      drawerTab === 'orders' ? 'bg-[#2A2A2A] text-menu-primary' : 'bg-menu-bg text-menu-text-muted hover:text-menu-text'
                    }`}
                  >
                    {t('myOrders')} ({activeOrders.length})
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {drawerTab === 'cart' ? (
                  <div className="space-y-6">
                    {cart.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">{t('emptyCart')}</p>
                    ) : (
                      <>
                        {cart.filter(i => i.guestId === localGuestId).length > 0 && (
                          <div>
                            <h3 className="text-xs font-bold text-menu-text-muted uppercase tracking-wider mb-3">Senin Eklediklerin</h3>
                            <div className="space-y-3">
                              {cart.filter(i => i.guestId === localGuestId).map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-menu-bg border border-menu-border p-3 rounded-lg border-l-2 border-l-menu-primary">
                                  <div>
                                    <p className="font-semibold text-menu-text">{item.name}</p>
                                    <p className="text-sm text-menu-text-muted">₺{item.price}</p>
                                  </div>
                                  <div className="flex items-center gap-3 bg-menu-surface border border-menu-border rounded-lg p-1">
                                    <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 hover:bg-[#2A2A2A] text-menu-text rounded">
                                      <Minus size={16} />
                                    </button>
                                    <span className="font-medium w-4 text-center text-menu-text">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 hover:bg-[#2A2A2A] text-menu-text rounded">
                                      <Plus size={16} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {cart.filter(i => i.guestId !== localGuestId).length > 0 && (
                          <div>
                            <h3 className="text-xs font-bold text-menu-text-muted uppercase tracking-wider mb-3">Masadaki Diğerleri</h3>
                            <div className="space-y-3">
                              {cart.filter(i => i.guestId !== localGuestId).map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-menu-bg border border-menu-border p-3 rounded-lg opacity-70">
                                  <div>
                                    <p className="font-semibold text-menu-text">{item.name}</p>
                                    <p className="text-sm text-menu-text-muted">₺{item.price}</p>
                                  </div>
                                  <div className="text-sm text-menu-text font-bold px-4 py-2 bg-menu-surface rounded-lg">
                                    {item.quantity} Adet
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeOrders.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">{t('noOrders')}</p>
                    ) : (
                      activeOrders.map(order => (
                        <div key={order.id} className="border border-menu-border rounded-xl p-4 bg-menu-bg">
                          {/* Status Stepper */}
                          <div className="flex items-center justify-between mb-4 relative">
                            <div className="absolute top-1/2 left-0 w-full h-1 bg-menu-border -z-10 transform -translate-y-1/2"></div>
                            {[
                              { status: 'pending', icon: <Clock size={14} />, label: t('pending') },
                              { status: 'preparing', icon: <ChefHat size={14} />, label: t('preparing') },
                              { status: 'ready', icon: <BellRing size={14} />, label: t('ready') },
                              { status: 'delivered', icon: <CheckCircle size={14} />, label: t('delivered') }
                            ].map((step) => {
                              const stepOrder = ['pending', 'preparing', 'ready', 'delivered'];
                              const currentIdx = stepOrder.indexOf(order.status);
                              const stepIdx = stepOrder.indexOf(step.status);
                              const isCompleted = stepIdx <= currentIdx;

                              return (
                                <div key={step.status} className="flex flex-col items-center gap-1 bg-menu-bg px-1">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                    isCompleted ? 'bg-menu-primary text-menu-bg' : 'bg-menu-surface text-menu-text-muted border border-menu-border'
                                  }`}>
                                    {step.icon}
                                  </div>
                                  <span className={`text-[10px] font-medium ${isCompleted ? 'text-menu-primary' : 'text-menu-text-muted'}`}>
                                    {step.label}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                          
                          {/* Items */}
                          <div className="bg-menu-surface border border-menu-border rounded p-3 text-sm">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs text-menu-text-muted">
                                {t('orderNumber')} #{order.id.slice(-4)}
                              </span>
                              <span className="font-bold text-menu-text">₺{calcOrderTotal(order).toFixed(2)}</span>
                            </div>
                            <div className="space-y-2 mt-2">
                                {order.items.map((i, idx) => {
                                  const itemKey = `${order.id}_${idx}`;
                                  const isUpdated = updatedItemKey === itemKey;
                                  const isCancelled = i.status === 'cancelled';
                                  const isPending = order.status === 'pending';
                                  return (
                                    <div key={idx} className={`flex justify-between items-center p-2 rounded transition-all ${isCancelled ? 'bg-red-900/20 opacity-60' : isUpdated ? 'bg-green-900/20' : 'bg-menu-bg'}`}>
                                      {/* Left: name + qty + line total */}
                                      <div className={`flex-1 min-w-0 ${isCancelled ? 'line-through text-menu-text-muted' : 'text-menu-text'}`}>
                                        <div className="flex items-baseline gap-1">
                                          <span className="font-bold text-menu-primary">{i.quantity}x</span>
                                          <span className="text-sm">{i.name}</span>
                                        </div>
                                        {!isCancelled && (
                                          <span className="text-xs text-menu-text-muted">
                                            ₺{Number(i.price).toFixed(2)} × {i.quantity} = <strong>₺{(Number(i.price) * i.quantity).toFixed(2)}</strong>
                                          </span>
                                        )}
                                      </div>

                                      {/* Right: controls or badge */}
                                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                        {isUpdated && (
                                          <span className="text-[10px] font-bold text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full animate-pulse">
                                            Güncellendi ✓
                                          </span>
                                        )}

                                        {isCancelled ? (
                                          <span className="text-[10px] font-bold bg-red-900/30 text-red-400 px-2 py-1 rounded-full border border-red-900/50">
                                            {t('cancelled')}
                                          </span>
                                        ) : (
                                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                                            order.status === 'pending'   ? 'bg-orange-900/30 text-orange-400 border-orange-900/50' :
                                            order.status === 'preparing' ? 'bg-blue-900/30 text-blue-400 border-blue-900/50' :
                                            order.status === 'ready'     ? 'bg-green-900/30 text-green-400 border-green-900/50' :
                                            'bg-menu-surface text-menu-text-muted border-menu-border'
                                          }`}>
                                            {t(order.status)}
                                          </span>
                                        )}

                                        {/* Qty stepper — only for pending orders & non-cancelled items */}
                                        {isPending && !isCancelled && (
                                          <div className="flex items-center gap-1 bg-menu-surface border border-menu-border rounded-lg px-1">
                                            <button
                                              onClick={() => handleUpdateItemQty(order.id, idx, -1)}
                                              className="w-6 h-6 flex items-center justify-center text-red-400 hover:bg-menu-bg rounded font-bold text-lg leading-none transition-colors"
                                              title="Azalt / İptal Et"
                                            >
                                              −
                                            </button>
                                            <span className="text-xs font-bold w-4 text-center text-menu-text">{i.quantity}</span>
                                            <button
                                              onClick={() => handleUpdateItemQty(order.id, idx, +1)}
                                              className="w-6 h-6 flex items-center justify-center text-green-400 hover:bg-menu-bg rounded font-bold text-lg leading-none transition-colors"
                                              title="Artır"
                                            >
                                              +
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Footer - Place Order Button (only on cart tab) */}
              {drawerTab === 'cart' && cart.length > 0 && (
                <div className="p-4 border-t border-menu-border bg-menu-bg pb-8">
                  <div className="flex justify-between items-center mb-4 text-lg font-bold text-menu-text">
                    <span>{t('total')}</span>
                    <span className="text-menu-primary">₺{cartTotalInfo.total.toFixed(2)}</span>
                  </div>
                  
                  {orderStatus === 'success' ? (
                    <div className="bg-menu-surface border border-menu-border text-menu-primary p-4 rounded-xl text-center font-bold">
                      {t('orderPlaced')} 🎉
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowOrderConfirmation(true)}
                      disabled={cart.length === 0 || orderStatus === 'sending' || isSubmitting}
                      className="w-full bg-menu-primary text-menu-bg py-4 rounded-xl font-bold text-lg shadow-lg disabled:opacity-50 flex justify-center items-center gap-2 hover:bg-menu-accent transition-colors"
                    >
                      {orderStatus === 'sending' || isSubmitting ? (
                        <>{t('loading')}...</>
                      ) : (
                        <>{t('placeOrder')} <ChevronRight /></>
                      )}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 bg-black z-50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-menu-surface border-t border-menu-border z-50 rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col"
            >
               <div className="relative w-full h-64 bg-[#2A2A2A] rounded-t-3xl overflow-hidden shadow-inner">
                  {selectedProduct.imageUrl ? (
                     <img src={optimizeImage(selectedProduct.imageUrl, 800)} alt={selectedProduct.name} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                     <div className="w-full h-full flex items-center justify-center text-menu-text-muted">
                        <UtensilsCrossed size={48} />
                     </div>
                  )}
                  <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70">
                    <X size={24} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-menu-surface to-transparent"></div>
               </div>

               <div className="p-6 flex-1 overflow-y-auto">
                 <div className="flex justify-between items-start mb-4">
                   <h2 className="text-3xl font-black text-menu-text leading-tight">{selectedProduct.name}</h2>
                   <span className="text-2xl font-bold text-menu-primary mt-1">₺{selectedProduct.price}</span>
                 </div>
                 
                 <p className="text-menu-text-muted text-base leading-relaxed tracking-wide font-light mb-8">
                   {selectedProduct.description || "Açıklama bulunmuyor."}
                 </p>
               </div>
               
               <div className="p-6 border-t border-menu-border bg-menu-surface">
                 <button 
                    onClick={() => {
                      addToCart(selectedProduct);
                      setSelectedProduct(null);
                    }}
                    className="w-full bg-menu-primary text-menu-bg py-4 rounded-xl font-bold text-xl shadow-lg hover:bg-menu-accent transition-colors flex justify-center items-center gap-2"
                 >
                    <Plus size={24} /> {t('add')}
                 </button>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Order Confirmation Modal */}
      <AnimatePresence>
        {showOrderConfirmation && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOrderConfirmation(false)}
              className="fixed inset-0 bg-black z-50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-11/12 max-w-md bg-menu-surface border border-menu-border z-50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
               <div className="p-5 border-b border-menu-border flex justify-between items-center bg-[#2A2A2A]">
                 <h2 className="text-xl font-bold text-menu-text flex items-center gap-2">
                   <CheckCircle className="text-menu-primary" size={24} /> Siparişi Onayla
                 </h2>
                 <button onClick={() => setShowOrderConfirmation(false)} className="text-menu-text-muted hover:text-menu-text">
                    <X size={24} />
                 </button>
               </div>
               
               <div className="p-5 overflow-y-auto flex-1 bg-menu-bg space-y-3">
                 <h3 className="text-sm font-bold text-menu-text-muted uppercase tracking-wider mb-2">Sepet Özeti</h3>
                 {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b border-menu-border pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-menu-primary bg-menu-primary/10 px-2 py-0.5 rounded text-sm">{item.quantity}x</span>
                        <span className="font-medium text-menu-text">{item.name}</span>
                      </div>
                      <span className="text-menu-text-muted text-sm font-semibold">₺{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                 ))}
               </div>

               <div className="p-5 border-t border-menu-border bg-menu-surface">
                 <div className="flex justify-between items-center mb-5 text-xl font-black text-menu-text">
                   <span>Genel Toplam</span>
                   <span className="text-menu-primary">₺{cartTotalInfo.total.toFixed(2)}</span>
                 </div>
                 
                 <button 
                    onClick={() => {
                      setShowOrderConfirmation(false);
                      placeOrder();
                    }}
                    disabled={isSubmitting || orderStatus === 'sending'}
                    className="w-full bg-menu-primary text-menu-bg py-4 rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(var(--menu-primary-rgb),0.3)] hover:shadow-[0_0_30px_rgba(var(--menu-primary-rgb),0.5)] transition-all flex items-center justify-center gap-2"
                 >
                    {isSubmitting || orderStatus === 'sending' ? (
                       <><Loader2 className="animate-spin" size={20} /> Onaylanıyor...</>
                    ) : (
                       <><CheckCircle size={20} /> Siparişi Onayla ve Gönder</>
                    )}
                 </button>
                 <button 
                    onClick={() => setShowOrderConfirmation(false)}
                    className="w-full mt-3 py-3 rounded-xl font-bold text-menu-text-muted hover:text-menu-text hover:bg-menu-bg transition-colors"
                 >
                    Geri Dön
                 </button>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
