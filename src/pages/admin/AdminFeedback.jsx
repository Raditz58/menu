import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../../lib/firebase';
import {
  collection, query, where, orderBy, onSnapshot,
  deleteDoc, doc, updateDoc
} from 'firebase/firestore';
import {
  Trash2, MessageSquare, CheckCircle2, Loader2,
  Mail, MailOpen, Clock, LayoutList, Star
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { AnimatePresence, motion } from 'framer-motion';

export default function AdminFeedback() {
  const { restaurantId } = useOutletContext();
  const { t } = useLanguage();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all'); // 'all' | 'unread' | 'read'

  useEffect(() => {
    if (!restaurantId) return;
    const q = query(
      collection(db, 'feedback'),
      where('restaurantId', '==', restaurantId),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setFeedbacks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => {
      console.error('Feedback listener error:', err);
      setLoading(false);
    });
    return () => unsub();
  }, [restaurantId]);

  const handleDelete  = async id => {
    if (!window.confirm(t('confirmDelete'))) return;
    await deleteDoc(doc(db, 'feedback', id));
  };

  const handleMarkRead = async id => {
    await updateDoc(doc(db, 'feedback', id), { status: 'read' });
  };

  const unreadCount = feedbacks.filter(f => f.status !== 'read').length;

  const visible = feedbacks.filter(f => {
    if (filter === 'unread') return f.status !== 'read';
    if (filter === 'read')   return f.status === 'read';
    return true;
  });

  if (loading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Loader2 className="animate-spin text-blue-500" size={36} />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MessageSquare className="text-blue-500" size={24} />
            {t('adminFeedback')}
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">{t('feedbackSubtitle')}</p>
        </div>

        {/* Summary pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: 'all',    label: t('all'),    count: feedbacks.length },
            { key: 'unread', label: t('unread'), count: unreadCount },
            { key: 'read',   label: t('read'),   count: feedbacks.length - unreadCount },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                filter === tab.key
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-white border text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-1.5 py-px text-[10px] font-black ${
                filter === tab.key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Unread alert banner */}
      {unreadCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <Mail className="text-blue-500 flex-shrink-0" size={20} />
          <p className="text-blue-700 text-sm font-medium">
            {unreadCount} {t('unreadFeedbackMessage')}
          </p>
        </div>
      )}

      {/* Empty state */}
      {visible.length === 0 && (
        <div className="bg-white rounded-xl border shadow-sm p-16 flex flex-col items-center gap-4 text-center">
          <LayoutList size={48} className="text-gray-200" />
          <p className="text-gray-400 font-medium">{t('noFeedback') || t('noData')}</p>
        </div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <AnimatePresence>
          {visible.map(item => {
            const isRead     = item.status === 'read';
            const timeStr    = item.createdAt?.seconds
              ? new Date(item.createdAt.seconds * 1000).toLocaleString()
              : '';
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`relative bg-white rounded-xl shadow-sm border flex flex-col transition-all ${
                  isRead
                    ? 'border-gray-200 opacity-70'
                    : 'border-blue-200 shadow-blue-50 shadow-md'
                }`}
              >
                {/* Unread dot */}
                {!isRead && (
                  <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white" />
                )}

                {/* Card body */}
                <div className="p-5 flex-1 space-y-3">
                  {/* Table + time */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      isRead ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {t('table')} {item.tableCode || '–'}
                    </span>
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Clock size={11} /> {timeStr}
                    </span>
                  </div>

                  {/* Message */}
                  <p className="text-gray-700 italic leading-relaxed text-sm min-h-[3rem]">
                    "{item.message}"
                  </p>

                  {/* Star rating (if present) */}
                  {item.rating && (
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={i < item.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Card footer */}
                <div className="px-5 py-3 border-t flex justify-end gap-2">
                  {!isRead && (
                    <button
                      onClick={() => handleMarkRead(item.id)}
                      title={t('markAsRead')}
                      className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <MailOpen size={14} />
                      {t('markAsRead')}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    title={t('delete')}
                    className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                    {t('delete')}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
