import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function InfoPage({ title, content }) {
  // Scroll to top when the page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [title]);

  return (
    <div className="min-h-screen bg-luxury-dark pt-32 pb-20 px-6 lg:px-12 flex flex-col items-center">
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl lg:text-6xl font-playfair text-luxury-white mb-12 tracking-wider text-center"
      >
        {title}
      </motion.h1>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-luxury-gray font-inter max-w-3xl w-full text-base leading-relaxed space-y-6"
      >
        {content}
      </motion.div>
    </div>
  );
}
