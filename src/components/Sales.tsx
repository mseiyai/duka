import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, query, orderBy, limit, increment } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Product, Sale } from '../types';
import { ShoppingCart, Plus, History, Search, Package, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SalesProps {
  shopId: string;
}

export default function Sales({ shopId }: SalesProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [successMessage, setSuccessMessage] = useState(false);

  useEffect(() => {
    const productsQ = query(
      collection(db, 'shops', shopId, 'products'),
      orderBy('name', 'asc')
    );

    const salesQ = query(
      collection(db, 'shops', shopId, 'sales'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubProducts = onSnapshot(productsQ, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setLoading(false);
    });

    const unsubSales = onSnapshot(salesQ, (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
    });

    return () => {
      unsubProducts();
      unsubSales();
    };
  }, [shopId]);

  const handleRecordSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || quantity <= 0 || quantity > selectedProduct.quantity) return;

    const totalPrice = selectedProduct.price * quantity;
    const saleData = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: quantity,
      totalPrice: totalPrice,
      timestamp: serverTimestamp(),
      sellerId: auth.currentUser?.uid || 'unknown'
    };

    try {
      // 1. Record the sale
      await addDoc(collection(db, 'shops', shopId, 'sales'), saleData);
      
      // 2. Update product stock
      await updateDoc(doc(db, 'shops', shopId, 'products', selectedProduct.id), {
        quantity: increment(-quantity),
        updatedAt: serverTimestamp()
      });

      setSelectedProduct(null);
      setQuantity(1);
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error recording sale:', error);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* New Sale Section */}
      <div className="lg:col-span-2 space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900">Record Sale</h2>
          <p className="text-gray-500">Select a product and quantity to record a transaction.</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="col-span-full py-12 flex justify-center">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full py-12 text-center text-gray-500">
                No products found.
              </div>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  disabled={product.quantity <= 0}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    selectedProduct?.id === product.id
                      ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-100'
                      : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
                  } ${product.quantity <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-900 truncate pr-2">{product.name}</h4>
                    <span className="text-indigo-600 font-bold">${product.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Stock: {product.quantity}</span>
                    {product.quantity <= product.reorderLevel && (
                      <span className="text-red-500 font-medium flex items-center gap-1">
                        Low Stock
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          <AnimatePresence>
            {selectedProduct && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleRecordSale}
                className="pt-6 border-t border-gray-100 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Selected Product</p>
                    <p className="font-bold text-gray-900">{selectedProduct.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total Price</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      ${(selectedProduct.price * quantity).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium text-gray-700">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      max={selectedProduct.quantity}
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex-[2] bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={20} />
                    Complete Sale
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-xl font-medium"
              >
                <CheckCircle2 size={20} />
                Sale recorded successfully! Stock updated.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Recent History Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <History size={20} className="text-gray-400" />
          <h3 className="text-xl font-bold text-gray-900">Recent Sales</h3>
        </div>

        <div className="space-y-4">
          {sales.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-gray-100 text-center text-gray-500">
              No sales recorded yet.
            </div>
          ) : (
            sales.map((sale) => (
              <motion.div
                key={sale.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between"
              >
                <div className="space-y-1">
                  <p className="font-bold text-gray-900">{sale.productName}</p>
                  <p className="text-xs text-gray-500">
                    {sale.quantity} unit{sale.quantity > 1 ? 's' : ''} • {sale.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <p className="font-bold text-indigo-600">${sale.totalPrice.toFixed(2)}</p>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
