import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { Shop, UserProfile } from './types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Sales from './components/Sales';
import ShopSelector from './components/ShopSelector';
import { Store, LogIn, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const path = `users/${user.uid}`;
        try {
          // Sync user profile
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || 'Anonymous',
              email: user.email || '',
              photoURL: user.photoURL || '',
              shops: []
            };
            await setDoc(userRef, newProfile);
            setUserProfile(newProfile);
          } else {
            setUserProfile(userSnap.data() as UserProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, path);
        }
      } else {
        setUserProfile(null);
        setSelectedShop(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoginError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Login failed:', error);
      if (error.code === 'auth/unauthorized-domain') {
        setLoginError(`The domain "${window.location.hostname}" is not authorized in your Firebase Console.`);
      } else {
        setLoginError(error.message || 'An unexpected error occurred during login.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="text-indigo-600"
        >
          <Loader2 size={48} />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6"
        >
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-200">
            <Store size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">Shop Manager</h1>
            <p className="text-gray-500">Multi-tenant inventory & sales tracking for your business.</p>
          </div>
          
          {loginError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100"
            >
              {loginError}
            </motion.div>
          )}

          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white px-6 py-4 rounded-2xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
          >
            <LogIn size={20} />
            Sign in with Google
          </button>
          
          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">Authorized Domain Required</p>
            <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
              <div className="flex-1 text-[10px] font-mono text-gray-600 truncate px-1">
                {window.location.hostname}
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.hostname);
                  alert('Domain copied to clipboard!');
                }}
                className="bg-white text-indigo-600 px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all"
              >
                Copy
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
              1. Copy the domain above
              <br />
              2. Go to 
              <a 
                href={`https://console.firebase.google.com/project/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/authentication/settings`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-500 hover:underline mx-1"
              >
                Firebase Console &rarr; Auth &rarr; Settings
              </a>
              <br />
              3. Click <strong>"Authorized domains"</strong> and add it.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!selectedShop) {
    return (
      <ShopSelector 
        user={user} 
        userProfile={userProfile} 
        onSelectShop={setSelectedShop} 
      />
    );
  }

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      shopName={selectedShop.name}
      onExitShop={() => setSelectedShop(null)}
    >
      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <Dashboard shopId={selectedShop.id} />
        )}
        {activeTab === 'inventory' && (
          <Inventory shopId={selectedShop.id} />
        )}
        {activeTab === 'sales' && (
          <Sales shopId={selectedShop.id} />
        )}
      </AnimatePresence>
    </Layout>
  );
}
