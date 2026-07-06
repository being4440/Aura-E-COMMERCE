import React from 'react';
import { Link } from 'react-router-dom';
import { FiInstagram, FiFacebook, FiLinkedin, FiTwitter } from 'react-icons/fi';

const Footer = () => {
  return (
    <footer className="bg-luxury-dark border-t border-luxury-gray/20 pt-20 pb-10 text-luxury-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          
          {/* Brand */}
          <div className="col-span-1 lg:col-span-1">
            <h2 className="text-3xl font-playfair tracking-[0.3em] text-luxury-white mb-6">AURA</h2>
            <p className="text-luxury-gray font-inter text-sm leading-relaxed mb-6">
              Crafted for timeless elegance. Where luxury meets modern living.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-luxury-gray hover:text-luxury-gold transition-colors"><FiInstagram className="w-5 h-5" /></a>
              <a href="#" className="text-luxury-gray hover:text-luxury-gold transition-colors"><FiFacebook className="w-5 h-5" /></a>
              <a href="#" className="text-luxury-gray hover:text-luxury-gold transition-colors"><FiLinkedin className="w-5 h-5" /></a>
              <a href="#" className="text-luxury-gray hover:text-luxury-gold transition-colors"><FiTwitter className="w-5 h-5" /></a>
            </div>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-poppins font-medium tracking-widest uppercase mb-6 text-luxury-gold">Company</h3>
            <ul className="space-y-4">
              <li><Link to="/about" className="text-luxury-gray hover:text-luxury-white transition-colors text-sm">About Us</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-poppins font-medium tracking-widest uppercase mb-6 text-luxury-gold">Legal</h3>
            <ul className="space-y-4">
              <li><Link to="/privacy" className="text-luxury-gray hover:text-luxury-white transition-colors text-sm">Privacy Policy</Link></li>
            </ul>
          </div>

        </div>

        <div className="border-t border-luxury-gray/20 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-luxury-gray text-xs tracking-wider">
            &copy; {new Date().getFullYear()} AURA. ALL RIGHTS RESERVED.
          </p>
          <div className="mt-4 md:mt-0 flex space-x-6">
            <span className="text-luxury-gray text-xs tracking-wider">SECURE CHECKOUT</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
