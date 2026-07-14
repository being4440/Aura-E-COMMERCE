import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFeaturedProductsAPI, getNewArrivalsAPI } from '../api/api';
import { FiArrowRight, FiPlay, FiHeart } from 'react-icons/fi';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import SkeletonCard from '../components/SkeletonCard';
import toast from 'react-hot-toast';

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
            className="w-full h-full object-cover scale-105"
          />
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto mt-20">
          <div>
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-playfair text-luxury-white mb-6 tracking-wide">
              AURA
            </h1>
          </div>
          
          <div>
            <h2 className="text-xl md:text-3xl font-cormorant text-luxury-gold tracking-[0.2em] uppercase mb-8">
              Crafted For Timeless Elegance
            </h2>
            <p className="text-luxury-gray font-inter max-w-2xl mx-auto mb-12 text-lg">
              Where luxury meets modern living. Discover our exclusive collections of premium fashion and accessories.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link to="/collections" className="btn-primary w-full sm:w-auto text-center">
              Explore Collection
            </Link>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-10">
          <div className="w-[1px] h-16 bg-gradient-to-b from-luxury-gold to-transparent"></div>
        </div>
      </section>

      {/* 2. Brand Story Section */}
      <section className="py-32 px-6 lg:px-12 bg-luxury-secondary">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative aspect-[4/5] overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1000&auto=format&fit=crop" 
              alt="Craftsmanship" 
              className="w-full h-full object-cover filter grayscale hover:grayscale-0 transition-all duration-1000"
            />
          </div>
          
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
        </div>
      </section>

      {/* 3.5 New Arrivals Database Integration */}
      <section className="py-24 px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-12 border-b border-luxury-gray/20 pb-6">
          <div>
            <h3 className="text-luxury-gold font-poppins uppercase tracking-widest text-sm mb-2">Just Landed</h3>
            <h2 className="text-3xl md:text-4xl font-playfair text-luxury-white">New In Stock</h2>
          </div>
          <Link to="/collections" className="text-sm font-poppins uppercase tracking-widest text-luxury-gray hover:text-luxury-gold transition-colors hidden sm:block">
            View All
          </Link>
        </div>
        
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
