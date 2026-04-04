import { useState, useEffect, useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, getDocs, limit } from 'firebase/firestore';
import {
  DollarSign, ShoppingBag, Clock, Users, RefreshCcw,
  BarChart2, Grid, UtensilsCrossed, TrendingUp, Eye, X,
  AlertTriangle, CheckCircle2, Package
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { AnimatePresence, motion } from 'framer-motion';

// Helper: compute live revenue from items array (excludes cancelled items)
const calcLiveTotal = (order) =>
  (order.items || [])
    .filter(i => i.status !== 'cancelled')
    .reduce((acc, i) => acc + (Number(i.price) * (Number(i.quantity) || 0)), 0);

// Helper: is a Firestore timestamp from today?
const isToday = (ts) => {
  if (!ts) return false;
  let d;
  if (typeof ts.toDate === 'function') d = ts.toDate();
  else if (ts.seconds) d = new Date(ts.seconds * 1000);
  else d = new Date(ts);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
};

const statusColor = (status) => {
  if (['completed', 'paid'].includes(status)) return 'bg-green-100 text-green-700';
  if (status === 'cancelled') return 'bg-red-100 text-red-700';
  if (status === 'preparing') return 'bg-blue-100 text-blue-700';
  if (status === 'ready') return 'bg-purple-100 text-purple-700';
  return 'bg-yellow-100 text-yellow-700';
};

export default function DashboardHome() {
  const { restaurantId } = useOutletContext();
  const { t } = useLanguage();

  const [allOrders, setAllOrders]       = useState([]);
  const [activeTables, setActiveTables]  = useState(0);
  const [totalTables, setTotalTables]    = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab]        = useState('overview');
  const [loadingOrders, setLoadingOrders] = useState(false);

  // ── One-shot orders fetch (getDocs) — avoids unbounded watch stream ───────
  const fetchOrders = async () => {
    if (!restaurantId) return;
    setLoadingOrders(true);
    try {
      const q = query(
        collection(db, 'orders'),
        where('restaurantId', '==', restaurantId),
        orderBy('createdAt', 'desc'),
        limit(300)
      );
      const snap = await getDocs(q);
      setAllOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch on mount + auto-refresh every 60 s
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 60_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  // ── Real-time tables snapshot (limited — only need count) ────────────────
  useEffect(() => {
    if (!restaurantId) return;
    const q = query(
      collection(db, 'tables'),
      where('restaurantId', '==', restaurantId),
      limit(100)
    );
    const unsub = onSnapshot(q, snap => {
      setTotalTables(snap.size);
      setActiveTables(snap.docs.filter(d => d.data().status === 'occupied').length);
    });
    return () => unsub();
  }, [restaurantId]);

  // ── Derived stats (memoised so they recompute on every snapshot update) ───
  const todaysOrders = useMemo(() =>
    allOrders.filter(o => isToday(o.createdAt)),
    [allOrders]);

  const kpi = useMemo(() => {
    // Daily Revenue: sum of live totals for PAID/COMPLETED orders today
    const finishedToday = todaysOrders.filter(o =>
      ['paid', 'completed'].includes(o.status?.toLowerCase())
    );
    const dailyRevenue = finishedToday.reduce((acc, o) => acc + calcLiveTotal(o), 0);

    // Order Count: all orders placed today
    const orderCount = todaysOrders.length;

    // Cancelled Items: total individual item cancellations across today's orders
    const cancelledItems = todaysOrders.reduce((acc, o) =>
      acc + (o.items || []).filter(i => i.status === 'cancelled').length, 0);

    // Top Selling (all time paid/completed)
    const allFinished = allOrders.filter(o => ['paid', 'completed'].includes(o.status));
    const itemCounts = {};
    allFinished.forEach(order => {
      (order.items || []).forEach(item => {
        if (item.name && item.status !== 'cancelled') {
          itemCounts[item.name] = (itemCounts[item.name] || 0) + (Number(item.quantity) || 1);
        }
      });
    });
    const topSelling = Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { dailyRevenue, orderCount, cancelledItems, topSelling };
  }, [todaysOrders, allOrders]);

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t('dashboard')}</h2>
          <p className="text-gray-500 text-sm">{t('overview')}</p>
        </div>
        <div className="bg-white rounded-lg p-1 shadow-sm border inline-flex">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'overview' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('overview')}
          </button>
          <button
            onClick={() => setActiveTab('management')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'management' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('management')}
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* ── KPI Cards Row ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatsCard
              title={t('dailyRevenue')}
              value={`₺ ${kpi.dailyRevenue.toFixed(2)}`}
              sub={t('paidOrdersOnly')}
              icon={<DollarSign className="text-emerald-600" size={22} />}
              color="emerald"
            />
            <StatsCard
              title={t('orderCountToday')}
              value={kpi.orderCount}
              sub={t('allStatusesToday')}
              icon={<Package className="text-blue-600" size={22} />}
              color="blue"
            />
            <StatsCard
              title={t('cancelledItemsToday')}
              value={kpi.cancelledItems}
              sub={t('itemLevelCancellations')}
              icon={<AlertTriangle className="text-red-500" size={22} />}
              color="red"
            />
            <StatsCard
              title={t('activeTables')}
              value={`${activeTables} / ${totalTables}`}
              sub={t('liveTables')}
              icon={<Grid className="text-purple-600" size={22} />}
              color="purple"
            />
          </div>

          {/* ── Top Selling + Live Tables ring ────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border lg:col-span-2">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-6">
                <TrendingUp size={20} className="text-gray-400" />
                {t('topSelling')}
              </h3>
              <div className="space-y-3">
                {kpi.topSelling.length > 0 ? kpi.topSelling.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </div>
                      <span className="font-medium text-gray-700">{item.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900 text-sm">{item.count} {t('sold')}</span>
                  </div>
                )) : (
                  <p className="text-gray-400 text-center py-8 text-sm">{t('noData')}</p>
                )}
              </div>
            </div>

            {/* Live table ring */}
            <div className="bg-white p-6 rounded-xl shadow-sm border flex flex-col items-center justify-center">
              <h3 className="font-bold text-gray-800 mb-6 self-start">{t('liveTables')}</h3>
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="#E5E7EB" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="#3B82F6" strokeWidth="3"
                    strokeDasharray={`${(activeTables / (totalTables || 1)) * 100}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-bold text-gray-800">{activeTables}</span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wide">{t('occupied')}</span>
                </div>
              </div>
              <p className="mt-4 text-gray-500 text-sm font-medium text-center">
                {activeTables} / {totalTables} {t('activeTables')}
              </p>
            </div>
          </div>

          {/* ── Today's Orders Table ──────────────────────────────────── */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <BarChart2 size={18} className="text-blue-500" />
                {t('todaysOrders')}
              </h3>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                {todaysOrders.length} {t('orders')}
              </span>
            </div>
            <div className="md:hidden flex flex-col gap-3 p-4">
              {todaysOrders.length === 0 && (
                <div className="text-center py-8 text-gray-400">{t('noData')}</div>
              )}
              {todaysOrders.map(order => {
                const liveTotal = calcLiveTotal(order);
                const cancelCount = (order.items || []).filter(i => i.status === 'cancelled').length;
                const time = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '–';
                return (
                  <div key={order.id} onClick={() => setSelectedOrder(order)} className="bg-white border text-left p-4 rounded-xl shadow-sm space-y-3 cursor-pointer hover:bg-gray-50 flex flex-col">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-gray-500 text-xs">{time}</span>
                        <h4 className="font-bold text-gray-800 text-lg mt-0.5">{order.tableCode}</h4>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${statusColor(order.status)}`}>
                        {t(order.status) || order.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                      <span className="text-xs text-gray-500 font-medium">{t('total')}</span>
                      <span className="font-bold text-gray-900">
                        ₺ {liveTotal.toFixed(2)}
                        {cancelCount > 0 && <span className="ml-1 text-[10px] text-red-500 font-bold">({cancelCount} iptal)</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-6 py-3">{t('time')}</th>
                    <th className="px-6 py-3">{t('table')}</th>
                    <th className="px-6 py-3">{t('total')}</th>
                    <th className="px-6 py-3">{t('status')}</th>
                    <th className="px-6 py-3">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {todaysOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-400">{t('noData')}</td>
                    </tr>
                  )}
                  {todaysOrders.map(order => {
                    const liveTotal = calcLiveTotal(order);
                    const cancelCount = (order.items || []).filter(i => i.status === 'cancelled').length;
                    const time = order.createdAt?.seconds
                      ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '–';
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <td className="px-6 py-3 font-mono text-gray-600">{time}</td>
                        <td className="px-6 py-3 font-bold text-gray-800">{order.tableCode}</td>
                        <td className="px-6 py-3 font-semibold text-gray-900">
                          ₺ {liveTotal.toFixed(2)}
                          {cancelCount > 0 && (
                            <span className="ml-1 text-[10px] text-red-500 font-bold">
                              ({cancelCount} {t('cancelledShort')})
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${statusColor(order.status)}`}>
                            {t(order.status) || order.status}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <button
                            onClick={e => { e.stopPropagation(); setSelectedOrder(order); }}
                            className="text-blue-600 hover:text-blue-800 font-medium text-xs flex items-center gap-1"
                          >
                            <Eye size={14} /> {t('detail')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ── Management Grid ──────────────────────────────────────────── */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <ManagementCard to="categories" title={t('categories')} description={t('manageCategoriesDesc')} icon={<Grid className="text-white" size={22} />} color="bg-purple-500" />
          <ManagementCard to="products"   title={t('products')}   description={t('manageProductsDesc')}   icon={<UtensilsCrossed className="text-white" size={22} />} color="bg-orange-500" />
          <ManagementCard to="tables"     title={t('tables')}     description={t('manageTablesDesc')}     icon={<ShoppingBag className="text-white" size={22} />} color="bg-blue-500" />
          <ManagementCard to="staff"      title={t('staff')}      description={t('manageStaffDesc')}      icon={<Users className="text-white" size={22} />} color="bg-green-500" />
        </div>
      )}

      {/* ── Order Detail Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {selectedOrder && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="fixed inset-0 bg-black z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Modal header */}
              <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {t('orderNumber')} <span className="text-blue-600">#{selectedOrder.id.slice(-6)}</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t('table')} {selectedOrder.tableCode} &mdash;&nbsp;
                    {selectedOrder.createdAt?.seconds
                      ? new Date(selectedOrder.createdAt.seconds * 1000).toLocaleString()
                      : '–'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${statusColor(selectedOrder.status)}`}>
                    {t(selectedOrder.status) || selectedOrder.status}
                  </span>
                  <button onClick={() => setSelectedOrder(null)} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Items list */}
              <div className="overflow-y-auto flex-1 p-6">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t('items')}</h4>
                <ul className="space-y-2">
                  {(selectedOrder.items || []).map((item, idx) => {
                    const isCancelled = item.status === 'cancelled';
                    return (
                      <li
                        key={idx}
                        className={`flex justify-between items-center p-3 rounded-lg ${isCancelled ? 'bg-red-50 opacity-60' : 'bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${isCancelled ? 'bg-red-100 text-red-500 line-through' : 'bg-white border text-gray-600'}`}>
                            {item.quantity}x
                          </span>
                          <div>
                            <span className={`font-medium text-sm ${isCancelled ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                              {item.name}
                            </span>
                            {isCancelled && (
                              <span className="block text-[10px] font-bold text-red-500 uppercase">{t('cancelledItem')}</span>
                            )}
                          </div>
                        </div>
                        <span className={`font-semibold text-sm ${isCancelled ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                          ₺ {(Number(item.price) * (Number(item.quantity) || 0)).toFixed(2)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Modal footer with live total */}
              <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
                <span className="font-semibold text-gray-600">{t('total')} ({t('excludesCancelled')})</span>
                <span className="text-xl font-bold text-emerald-600">
                  ₺ {calcLiveTotal(selectedOrder).toFixed(2)}
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function StatsCard({ title, value, sub, icon, color }) {
  const colorClass = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue:    'bg-blue-50    text-blue-600',
    red:     'bg-red-50     text-red-500',
    purple:  'bg-purple-50  text-purple-600',
    orange:  'bg-orange-50  text-orange-600',
  }[color] || 'bg-gray-50 text-gray-600';

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function ManagementCard({ to, title, description, icon, color }) {
  return (
    <Link to={to} className="group bg-white p-6 rounded-xl shadow-sm border hover:shadow-lg transition-all hover:-translate-y-1">
      <div className={`${color} w-11 h-11 rounded-lg flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="font-bold text-gray-800 text-base mb-1">{title}</h3>
      <p className="text-gray-500 text-xs">{description}</p>
    </Link>
  );
}
