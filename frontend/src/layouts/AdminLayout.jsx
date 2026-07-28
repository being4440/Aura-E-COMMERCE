import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { FiHome, FiBox, FiLogOut, FiList, FiMenu, FiX,FiUploadCloud } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';

export default function AdminLayout({ handleLogout }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : false));

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleResize = () => setIsDesktop(mediaQuery.matches);

    handleResize();
    mediaQuery.addEventListener('change', handleResize);

    return () => mediaQuery.removeEventListener('change', handleResize);
  }, []);

  useEffect(() => {
    if (!sidebarOpen || isDesktop) {
      document.body.style.overflow = '';
      return undefined;
    }

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen, isDesktop]);

  useEffect(() => {
    if (!sidebarOpen || isDesktop) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen, isDesktop]);

  const closeSidebar = () => setSidebarOpen(false);

  const handleNavClick = () => {
    closeSidebar();
  };

  const handleLogoutClick = () => {
    closeSidebar();

    if (handleLogout) {
      handleLogout();
    }
  };

  const links = [
    { path: '/admin', label: 'Dashboard', icon: FiHome, end: true },
    { path: '/admin/orders', label: 'Orders', icon: FiBox },
    { path: '/admin/users', label: 'Customers', icon: FiBox },
    { path: '/admin/products', label: 'Products', icon: FiBox },
    { path: '/admin/products/new', label: 'Add Product', icon: FiUploadCloud },
    { path: '/admin/categories', label: 'Categories', icon: FiList },
    { path: '/admin/audit-logs', label: 'Audit Logs', icon: FiList }
  ];

  return (
    <div className="relative flex min-h-screen overflow-x-hidden bg-luxury-dark pt-16 lg:pt-20">
      <button
        type="button"
        aria-label="Open sidebar"
        aria-expanded={sidebarOpen}
        aria-controls="admin-sidebar"
        onClick={() => setSidebarOpen(true)}
        className="fixed left-4 top-4 z-50 inline-flex items-center justify-center rounded-md border border-luxury-gray/20 bg-luxury-secondary p-2 text-luxury-gold shadow-lg lg:hidden"
      >
        <FiMenu size={20} />
      </button>

      <AnimatePresence>
        {!isDesktop && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={closeSidebar}
          />
        )}
      </AnimatePresence>

      <motion.aside
        id="admin-sidebar"
        initial={false}
        animate={isDesktop ? { x: 0 } : sidebarOpen ? { x: 0 } : { x: '-100%' }}
        transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
        className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-luxury-gray/10 bg-luxury-secondary shadow-2xl lg:static lg:z-auto lg:flex lg:w-64 lg:shadow-none"
      >
        <div className="flex items-center justify-between p-6">
          <h2 className="text-xl font-playfair uppercase tracking-widest text-luxury-gold">Admin Panel</h2>
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={closeSidebar}
            className="rounded-md p-2 text-luxury-gray hover:bg-luxury-gray/10 hover:text-luxury-white lg:hidden"
          >
            <FiX size={18} />
          </button>
        </div>
        <nav className="flex-1 space-y-2 px-4">
          {links.map((link) => {
            const isActive = link.end ? location.pathname === link.path : location.pathname.startsWith(link.path);

            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={handleNavClick}
                className={`flex items-center gap-3 rounded-md px-4 py-3 transition-colors ${
                  isActive
                    ? 'bg-luxury-gold font-semibold text-luxury-dark'
                    : 'text-luxury-gray hover:bg-luxury-gray/10 hover:text-luxury-white'
                }`}
              >
                <link.icon size={18} />
                <span className="font-poppins text-xs uppercase tracking-widest">{link.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-luxury-gray/10 p-4">
          <button
            type="button"
            onClick={handleLogoutClick}
            className="flex w-full items-center gap-3 px-4 py-3 text-luxury-gray transition-colors hover:text-red-400"
          >
            <FiLogOut size={18} />
            <span className="font-poppins text-xs uppercase tracking-widest">Logout</span>
          </button>
        </div>
      </motion.aside>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
