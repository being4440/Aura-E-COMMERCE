import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFeaturedProductsAPI, getNewArrivalsAPI } from '../api/api';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { FiArrowRight, FiPlay, FiHeart } from 'react-icons/fi';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import SkeletonCard from '../components/SkeletonCard';
import toast from 'react-hot-toast';

const FadeInWhenVisible = ({ children, delay = 0 }) => {
  const controls = useAnimation();
  const [ref, inView] = useInView({ threshold: 0.2, triggerOnce: true });

  useEffect(() => {
    if (inView) {
      controls.start('visible');
    }
  }, [controls, inView]);

  return (
    <motion.div
      ref={ref}
      animate={controls}
      initial="hidden"
      transition={{ duration: 0.8, delay, ease: 'easeOut' }}
      variants={{
        visible: { opacity: 1, y: 0 },
        hidden: { opacity: 0, y: 50 }
      }}
    >
      {children}
    </motion.div>
  );
};

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setLoading(true);
        const [featuredRes, newArrivalsRes] = await Promise.all([
          getFeaturedProductsAPI(),
          getNewArrivalsAPI()
        ]);
        setFeaturedProducts(featuredRes.data.data);
        setNewArrivals(newArrivalsRes.data.data);
      } catch (err) {
        console.error('Error fetching home data:', err);
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    fetchHomeData();
  }, []);

  return (
    <div className="bg-luxury-dark min-h-screen">
      
      {/* 1. Cinematic Landing Page */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Placeholder for Luxury fashion video */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-luxury-dark/40 z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?q=80&w=2000&auto=format&fit=crop" 
            alt="Luxury Watch" 
            className="w-full h-full object-cover scale-105 animate-[pulse_20s_ease-in-out_infinite_alternate]"
          />
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto mt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-playfair text-luxury-white mb-6 tracking-wide">
              AURA
            </h1>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
          >
            <h2 className="text-xl md:text-3xl font-cormorant text-luxury-gold tracking-[0.2em] uppercase mb-8">
              Crafted For Timeless Elegance
            </h2>
            <p className="text-luxury-gray font-inter max-w-2xl mx-auto mb-12 text-lg">
              Where luxury meets modern living. Discover our exclusive collections of premium fashion and accessories.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1 }}
            className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6"
          >
            <Link to="/collections" className="btn-primary w-full sm:w-auto text-center">
              Explore Collection
            </Link>
          </motion.div>
        </div>
        
        {/* Scroll Indicator */}
        <motion.div 
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-10"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="w-[1px] h-16 bg-gradient-to-b from-luxury-gold to-transparent"></div>
        </motion.div>
      </section>

      {/* 2. Brand Story Section */}
      <section className="py-32 px-6 lg:px-12 bg-luxury-secondary">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <FadeInWhenVisible>
            <div className="relative aspect-[4/5] overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1000&auto=format&fit=crop" 
                alt="Craftsmanship" 
                className="w-full h-full object-cover filter grayscale hover:grayscale-0 transition-all duration-1000"
              />
            </div>
          </FadeInWhenVisible>
          
          <FadeInWhenVisible delay={0.2}>
            <div className="pl-0 lg:pl-12">
              <h3 className="text-luxury-gold font-poppins uppercase tracking-widest text-sm mb-4">The Heritage</h3>
              <h2 className="text-4xl md:text-5xl font-playfair text-luxury-white leading-tight mb-8">
                Mastery In Every Detail
              </h2>
              <p className="text-luxury-gray font-inter text-lg leading-relaxed mb-10">
                At AURA, every collection embodies elegance, craftsmanship, and modern sophistication. We believe that true luxury is not just seen, but felt.
              </p>
              <Link to="/about" className="inline-flex items-center text-luxury-gold hover:text-luxury-white font-poppins uppercase tracking-widest transition-colors border-b border-luxury-gold hover:border-luxury-white pb-1">
                Discover Our Story <FiArrowRight className="ml-2" />
              </Link>
            </div>
          </FadeInWhenVisible>
        </div>
      </section>

      {/* 3. Luxury Collections Section */}
      <section className="py-32 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <FadeInWhenVisible>
            <div className="text-center mb-20">
              <h3 className="text-luxury-gold font-poppins uppercase tracking-widest text-sm mb-4">Curated Selections</h3>
              <h2 className="text-4xl md:text-5xl font-playfair text-luxury-white">Explore Collections</h2>
            </div>
          </FadeInWhenVisible>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: 'Women', img: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80&w=800&auto=format&fit=crop' },
              { title: 'Men', img: 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?q=80&w=800&auto=format&fit=crop' },
              { title: 'Accessories', img: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?q=80&w=800&auto=format&fit=crop' },
            ].map((collection, index) => (
              <FadeInWhenVisible key={index} delay={index * 0.2}>
                <Link to="/collections" className="group relative block aspect-[3/4] overflow-hidden">
                  <img 
                    src={collection.img} 
                    alt={collection.title} 
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-luxury-dark/90 via-luxury-dark/20 to-transparent"></div>
                  <div className="absolute bottom-10 left-0 w-full text-center">
                    <h3 className="text-3xl font-playfair text-luxury-white tracking-wider uppercase">{collection.title}</h3>
                    <div className="w-0 h-[1px] bg-luxury-gold mx-auto mt-4 transition-all duration-500 group-hover:w-16"></div>
                  </div>
                </Link>
              </FadeInWhenVisible>
            ))}
          </div>
        </div>
      </section>

      {/* 3.5 New Arrivals Database Integration */}
      <section className="py-24 px-6 lg:px-12 max-w-7xl mx-auto">
        <FadeInWhenVisible>
          <div className="flex justify-between items-end mb-12 border-b border-luxury-gray/20 pb-6">
            <div>
              <h3 className="text-luxury-gold font-poppins uppercase tracking-widest text-sm mb-2">Just Landed</h3>
              <h2 className="text-3xl md:text-4xl font-playfair text-luxury-white">New In Stock</h2>
            </div>
            <Link to="/collections" className="text-sm font-poppins uppercase tracking-widest text-luxury-gray hover:text-luxury-gold transition-colors hidden sm:block">
              View All
            </Link>
          </div>
        </FadeInWhenVisible>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            newArrivals.slice(0, 8).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))
          )}
        </div>
      </section>





      <Footer />
    </div>
  );
}
