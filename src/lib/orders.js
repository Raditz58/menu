import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Updates the status of an order and sets the corresponding timestamp.
 * @param {string} orderId 
 * @param {'preparing' | 'ready' | 'delivered' | 'completed' | 'cancelled'} status 
 */
export async function updateOrderStatus(orderId, status) {
  const updateData = {
    status: status
  };

  // Analytics Timestamps
  if (status === 'preparing') {
    updateData.preparingAt = serverTimestamp();
  } else if (status === 'ready') {
    updateData.readyAt = serverTimestamp();
  } else if (status === 'delivered') {
    updateData.deliveredAt = serverTimestamp();
  } else if (status === 'completed') {
    updateData.completedAt = serverTimestamp();
  } else if (status === 'cancelled') {
    updateData.cancelledAt = serverTimestamp();
  }

  const orderRef = doc(db, 'orders', orderId);
  await updateDoc(orderRef, updateData);
}
