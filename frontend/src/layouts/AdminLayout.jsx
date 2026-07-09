import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { FiHome, FiBox, FiUploadCloud, FiLogOut, FiList } from 'react-icons/fi';
import { motion } from 'framer-motion';

export default function AdminLayout({ handleLogout }) {
  const location = useLocation();

  const links = [
    { path: '/admin', label: 'Dashboard', icon: FiHome, end: true },
    { path: '/admin/orders', label: 'Orders', icon: FiBox },
    { path: '/admin/users', label: 'Customers', icon: FiBox },
    { path: '/admin/products', label: 'Products', icon: FiBox },
    { path: '/admin/products/new', label: 'Add Product', icon: FiBox },
    { path: '/admin/categories', label: 'Categories', icon: FiList }
  ];

  return (
    <div className="flex h-screen bg-luxury-dark pt-20">
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        className="w-64 bg-luxury-secondary border-r border-luxury-gray/10 flex flex-col"
      >
        <div className="p-6">
          <h2 className="text-xl font-playfair text-luxury-gold tracking-widest uppercase">Admin Panel</h2>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {links.map((link) => {
            const isActive = link.end ? location.pathname === link.path : location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-luxury-gold text-luxury-dark font-semibold' 
                    : 'text-luxury-gray hover:text-luxury-white hover:bg-luxury-gray/10'
                }`}
              >
                <link.icon size={18} />
                <span className="font-poppins text-xs uppercase tracking-widest">{link.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-luxury-gray/10">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-luxury-gray hover:text-red-400 transition-colors"
          >
            <FiLogOut size={18} />
            <span className="font-poppins text-xs uppercase tracking-widest">Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
