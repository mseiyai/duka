import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Product, Sale } from '../types';
import { TrendingUp, Package, AlertTriangle, DollarSign, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  shopId: string;
}

export default function Dashboard({ shopId }: DashboardProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const productsPath = `shops/${shopId}/products`;
    const salesPath = `shops/${shopId}/sales`;
    
    const productsQ = query(collection(db, 'shops', shopId, 'products'));
    const salesQ = query(
      collection(db, 'shops', shopId, 'sales'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubProducts = onSnapshot(productsQ, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, productsPath);
    });

    const unsubSales = onSnapshot(salesQ, (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, salesPath);
    });

    return () => {
      unsubProducts();
      unsubSales();
    };
  }, [shopId]);

  const lowStockProducts = products.filter(p => p.quantity <= p.reorderLevel);
  const totalStockValue = products.reduce((acc, p) => acc + (p.price * p.quantity), 0);
  const totalSalesToday = sales
    .filter(s => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return s.timestamp?.toDate() >= today;
    })
    .reduce((acc, s) => acc + s.totalPrice, 0);

  const salesByProduct = sales.reduce((acc: any, sale) => {
    acc[sale.productName] = (acc[sale.productName] || 0) + sale.totalPrice;
    return acc;
  }, {});

  const chartData = Object.entries(salesByProduct)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const stats = [
    { label: 'Today\'s Sales', value: `$${totalSalesToday.toFixed(2)}`, icon: DollarSign, color: 'bg-green-50 text-green-600', trend: '+12%', trendUp: true },
    { label: 'Inventory Value', value: `$${totalStockValue.toFixed(2)}`, icon: Package, color: 'bg-indigo-50 text-indigo-600', trend: 'Stable', trendUp: true },
    { label: 'Low Stock Items', value: lowStockProducts.length.toString(), icon: AlertTriangle, color: lowStockProducts.length > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600', trend: '-2', trendUp: false },
    { label: 'Total Products', value: products.length.toString(), icon: TrendingUp, color: 'bg-blue-50 text-blue-600', trend: '+5', trendUp: true },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4"
          >
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-2xl ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${stat.trendUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {stat.trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {stat.trend}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Chart */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <h3 className="text-xl font-bold text-gray-900">Top Selling Products</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#818cf8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Reorder Alerts */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Reorder Alerts</h3>
            <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold">
              {lowStockProducts.length} Critical
            </span>
          </div>
          
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {lowStockProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 space-y-2">
                <Package size={48} className="opacity-20" />
                <p>All stock levels are healthy.</p>
              </div>
            ) : (
              lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-4 rounded-2xl bg-red-50/50 border border-red-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{product.name}</p>
                      <p className="text-xs text-red-600 font-medium">
                        Only {product.quantity} left (Min: {product.reorderLevel})
                      </p>
                    </div>
                  </div>
                  <button className="text-xs font-bold text-indigo-600 hover:underline">
                    Order Now
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
