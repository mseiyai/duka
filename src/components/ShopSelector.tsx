import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Shop, UserProfile } from '../types';
import { User } from 'firebase/auth';
import { Plus, Store, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ShopSelectorProps {
  user: User;
  userProfile: UserProfile | null;
  onSelectShop: (shop: Shop) => void;
}

export default function ShopSelector({ user, userProfile, onSelectShop }: ShopSelectorProps) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newShopName, setNewShopName] = useState('');

  useEffect(() => {
    const path = 'shops';
    // Query shops where user is owner or member
    const q = query(
      collection(db, path),
      where('members', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const shopList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shop));
      setShops(shopList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) return;

    try {
      const shopData = {
        name: newShopName,
        ownerId: user.uid,
        members: [user.uid],
        createdAt: serverTimestamp()
      };
      
      const shopRef = await addDoc(collection(db, 'shops'), shopData);
      
      // Update user profile with new shop ID
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        shops: arrayUnion(shopRef.id)
      });

      setNewShopName('');
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating shop:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Welcome back!</h1>
          <p className="text-gray-500">Select a shop to manage or create a new one.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {loading ? (
              <div className="col-span-full flex justify-center py-12">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
              </div>
            ) : (
              <>
                {shops.map((shop) => (
                  <motion.button
                    key={shop.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectShop(shop)}
                    className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-indigo-200 hover:shadow-md transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Store size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{shop.name}</h3>
                        <p className="text-xs text-gray-500">
                          {shop.ownerId === user.uid ? 'Owner' : 'Member'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="text-gray-300 group-hover:text-indigo-600 transition-colors" />
                  </motion.button>
                ))}

                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsCreating(true)}
                  className="bg-indigo-50 p-6 rounded-3xl border-2 border-dashed border-indigo-200 flex items-center justify-center gap-3 text-indigo-600 font-bold hover:bg-indigo-100 transition-all"
                >
                  <Plus size={24} />
                  New Shop
                </motion.button>
              </>
            )}
          </AnimatePresence>
        </div>

        {isCreating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Create New Shop</h2>
              <form onSubmit={handleCreateShop} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Shop Name</label>
                  <input
                    autoFocus
                    type="text"
                    value={newShopName}
                    onChange={(e) => setNewShopName(e.target.value)}
                    placeholder="e.g. Downtown Boutique"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newShopName.trim()}
                    className="flex-1 px-4 py-3 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all"
                  >
                    Create Shop
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
