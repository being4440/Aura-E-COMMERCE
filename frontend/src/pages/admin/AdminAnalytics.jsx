import React, { useState, useEffect } from 'react';
import { adminGetSalesAnalyticsAPI, adminGetProductsAnalyticsAPI, adminGetUsersAnalyticsAPI, adminGetPaymentsAnalyticsAPI } from '../../api/api';
import { toast } from 'react-hot-toast';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

export default function AdminAnalytics() {
  const [activeTab, setActiveTab] = useState('sales'); // sales, products, users, payments
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  
  const [salesData, setSalesData] = useState([]);
  const [productData, setProductData] = useState({ bestSelling: [], worstSelling: [] });
  const [userData, setUserData] = useState({ registrations: [], activeUsers: 0, totalUsers: 0 });
  const [paymentData, setPaymentData] = useState({ methods: {}, statuses: {} });

  const fetchData = async () => {
    try {
      setLoading(true);

      if (activeTab === 'sales') {
        const res = await adminGetSalesAnalyticsAPI({ period });
        setSalesData(res.data.data);
      } else if (activeTab === 'products') {
        const res = await adminGetProductsAnalyticsAPI();
        setProductData(res.data.data);
      } else if (activeTab === 'users') {
        const res = await adminGetUsersAnalyticsAPI({ period });
        setUserData(res.data.data);
      } else if (activeTab === 'payments') {
        const res = await adminGetPaymentsAnalyticsAPI();
        setPaymentData(res.data.data.summary);
      }
    } catch (err) {
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, period]);

  const COLORS = ['#d4af37', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  const formatCurrency = (value) => `₹${value.toLocaleString()}`;

  const renderSalesChart = () => (
    <div className="bg-luxury-secondary/30 border border-luxury-gray/10 p-6">
      <h2 className="text-xl font-medium text-luxury-white mb-6">Revenue Trend</h2>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={salesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d4af37" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey="_id" stroke="#888" tick={{fontSize: 12}} />
            <YAxis stroke="#888" tick={{fontSize: 12}} tickFormatter={(value) => `₹${value/1000}k`} />
            <RechartsTooltip 
              contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333' }}
              itemStyle={{ color: '#d4af37' }}
              formatter={(value) => [formatCurrency(value), 'Revenue']}
            />
            <Area type="monotone" dataKey="revenue" stroke="#d4af37" fillOpacity={1} fill="url(#colorRevenue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderProductsAnalytics = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-luxury-secondary/30 border border-luxury-gray/10 p-6">
        <h2 className="text-xl font-medium text-luxury-white mb-6 text-green-500">Top 10 Performers</h2>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={productData.bestSelling} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={true} vertical={false} />
              <XAxis type="number" stroke="#888" />
              <YAxis dataKey="title" type="category" stroke="#888" width={100} tick={{fontSize: 10}} />
              <RechartsTooltip contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333' }} />
              <Bar dataKey="unitsSold" fill="#10b981" name="Units Sold" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-luxury-secondary/30 border border-luxury-gray/10 p-6">
        <h2 className="text-xl font-medium text-luxury-white mb-6 text-red-500">Worst 10 Performers</h2>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={productData.worstSelling} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={true} vertical={false} />
              <XAxis type="number" stroke="#888" />
              <YAxis dataKey="title" type="category" stroke="#888" width={100} tick={{fontSize: 10}} />
              <RechartsTooltip contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333' }} />
              <Bar dataKey="unitsSold" fill="#ef4444" name="Units Sold" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderUserAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 border border-purple-500/20 bg-purple-500/10 rounded text-center">
          <p className="text-xs uppercase tracking-wider text-purple-400">Total Users</p>
          <h3 className="text-3xl font-medium text-luxury-white mt-2">{userData.totalUsers}</h3>
        </div>
        <div className="p-6 border border-emerald-500/20 bg-emerald-500/10 rounded text-center">
          <p className="text-xs uppercase tracking-wider text-emerald-400">Active Users (Last 30 Days)</p>
          <h3 className="text-3xl font-medium text-luxury-white mt-2">{userData.activeUsers}</h3>
        </div>
      </div>

      <div className="bg-luxury-secondary/30 border border-luxury-gray/10 p-6">
        <h2 className="text-xl font-medium text-luxury-white mb-6">User Registrations</h2>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={userData.registrations} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="_id" stroke="#888" />
              <YAxis stroke="#888" />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333' }}
                cursor={{fill: '#333', opacity: 0.4}}
              />
              <Bar dataKey="users" fill="#8b5cf6" name="New Users" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderPaymentAnalytics = () => {
    const methodData = Object.keys(paymentData.methods).map(key => ({ name: key, value: paymentData.methods[key].amount }));
    const statusData = Object.keys(paymentData.statuses).map(key => ({ name: key, value: paymentData.statuses[key].count }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-luxury-secondary/30 border border-luxury-gray/10 p-6 flex flex-col items-center">
          <h2 className="text-xl font-medium text-luxury-white mb-6">Revenue by Payment Method</h2>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={methodData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} fill="#8884d8" paddingAngle={5} dataKey="value">
                  {methodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-luxury-secondary/30 border border-luxury-gray/10 p-6 flex flex-col items-center">
          <h2 className="text-xl font-medium text-luxury-white mb-6">Transactions by Status</h2>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} fill="#8884d8" paddingAngle={5} dataKey="value">
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-playfair text-luxury-white">Analytics</h1>
        
        {(activeTab === 'sales' || activeTab === 'users') && (
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-luxury-dark border border-luxury-gray/20 text-luxury-white px-4 py-2 focus:outline-none focus:border-luxury-gold font-inter text-sm"
          >
            <option value="daily">Last 30 Days (Daily)</option>
            <option value="weekly">Last 12 Weeks (Weekly)</option>
            <option value="monthly">Last 12 Months (Monthly)</option>
          </select>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-luxury-gray/20">
        {['sales', 'products', 'users', 'payments'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium text-sm capitalize transition-colors border-b-2 ${
              activeTab === tab ? 'border-luxury-gold text-luxury-gold' : 'border-transparent text-luxury-gray hover:text-luxury-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-6">
        {loading ? (
          <div className="p-12 text-center text-luxury-gold">Loading {activeTab} data...</div>
        ) : (
          <>
            {activeTab === 'sales' && renderSalesChart()}
            {activeTab === 'products' && renderProductsAnalytics()}
            {activeTab === 'users' && renderUserAnalytics()}
            {activeTab === 'payments' && renderPaymentAnalytics()}
          </>
        )}
      </div>
    </div>
  );
}
