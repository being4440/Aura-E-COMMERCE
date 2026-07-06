import React from 'react';
import { motion } from 'framer-motion';

export default function About() {
  return (
    <div className="min-h-screen bg-luxury-dark pt-32 pb-20 px-6 lg:px-12 text-center flex flex-col items-center justify-center">
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-5xl lg:text-7xl font-playfair text-luxury-white mb-6 tracking-wide"
      >
        About AURA
      </motion.h1>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-luxury-gray font-inter max-w-2xl text-lg"
      >
        Established with a vision to redefine modern luxury, AURA is a sanctuary for those who appreciate the finer things in life. Our heritage is built on uncompromising quality and timeless elegance.
      </motion.p>
    </div>
  );
}
