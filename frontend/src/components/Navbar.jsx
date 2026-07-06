import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiHeart, FiUser, FiMenu, FiX } from 'react-icons/fi';
import CartIcon from './CartIcon';

const Navbar = ({ user, handleLogout }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/collections?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Collections', path: '/collections' },
    { name: 'About', path: '/about' },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`fixed w-full z-50 transition-all duration-500 border-b ${scrolled || !isHome
          ? 'bg-luxury-dark/90 backdrop-blur-md border-luxury-gray/20 py-4'
          : 'bg-transparent border-transparent py-6'
          }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-3 items-center">

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden text-luxury-white hover:text-luxury-gold transition-colors"
            onClick={() => setMobileMenuOpen(true)}
          >
            <FiMenu className="w-6 h-6" />
          </button>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-6 justify-start">
            {navLinks.slice(0, 1).map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="text-sm uppercase tracking-[0.15em] font-medium text-luxury-white hover:text-luxury-gold transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Logo */}
          <div className="flex justify-center">
            <Link to="/" className="text-4xl font-playfair tracking-[0.3em] text-luxury-white hover:text-luxury-gold transition-colors">
              AURA
            </Link>
          </div>

          {/* Desktop Right Links & Icons */}
          <div className="flex items-center space-x-2">
            <div className="hidden lg:flex items-center space-x-4 mr-4">
              {navLinks.slice(1).map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className="text-sm uppercase tracking-[0.15em] font-medium text-luxury-white hover:text-luxury-gold transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <div className="flex items-center space-x-5 text-luxury-white">
              <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="hover:text-luxury-gold transition-colors">
                <FiSearch className="w-5 h-5" />
              </button>
              {user?.role !== 'admin' && (
                <>
                  <Link to="/wishlist" className="hover:text-luxury-gold transition-colors">
                    <FiHeart className="w-5 h-5" />
                  </Link>
                  <CartIcon />
                </>
              )}
              {user ? (
                <div className="relative group cursor-pointer">
                  <FiUser className="w-5 h-5 hover:text-luxury-gold transition-colors" />
                  <div className="absolute right-0 mt-2 w-48 bg-luxury-secondary border border-luxury-gray/20 rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                    <div className="p-4 border-b border-luxury-gray/20">
                      <p className="text-sm font-playfair">{user.name || user.username}</p>
                    </div>
                    {user.role === 'admin' ? (
                      <Link to="/admin" className="block px-4 py-2 text-sm hover:bg-luxury-dark hover:text-luxury-gold">Admin Dashboard</Link>
                    ) : (
                      <>
                        <Link to="/orders" className="block px-4 py-2 text-sm hover:bg-luxury-dark hover:text-luxury-gold">
                          Orders
                        </Link>
                        <Link to="/profile" className="block px-4 py-2 text-sm hover:bg-luxury-dark hover:text-luxury-gold">
                          Profile
                        </Link>
                      </>
                    )}
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm hover:bg-luxury-dark hover:text-luxury-gold">
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <Link to="/login" className="hover:text-luxury-gold transition-colors">
                  <FiUser className="w-5 h-5" />
                </Link>
              )}
            </div>
          </div>

        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-luxury-dark"
          >
            <div className="flex flex-col h-full p-6">
              <div className="flex justify-between items-center mb-12">
                <Link to="/" className="text-3xl font-playfair tracking-[0.3em] text-luxury-white" onClick={() => setMobileMenuOpen(false)}>
                  AURA
                </Link>
                <button
                  className="text-luxury-white hover:text-luxury-gold"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FiX className="w-8 h-8" />
                </button>
              </div>
              <div className="flex flex-col space-y-6 flex-grow">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className="text-2xl font-playfair tracking-widest text-luxury-white hover:text-luxury-gold transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                ))}
                {user && user.role !== 'admin' && (
                  <Link
                    to="/orders"
                    className="text-2xl font-playfair tracking-widest text-luxury-white hover:text-luxury-gold transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Orders
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-[88px] left-0 w-full bg-luxury-dark/95 backdrop-blur-md border-b border-luxury-gray/20 z-40"
          >
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <FiSearch className="absolute left-4 text-luxury-gray w-5 h-5" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search for products, brands, categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border border-luxury-gray/30 text-luxury-white px-12 py-4 focus:outline-none focus:border-luxury-gold font-inter"
                />
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="absolute right-4 text-luxury-gray hover:text-luxury-white"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
