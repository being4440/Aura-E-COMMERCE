import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { getProductsAPI } from '../api/api';
import ProductCard from '../components/ProductCard';
import SkeletonCard from '../components/SkeletonCard';
import { FiSearch, FiFilter } from 'react-icons/fi';

export default function Collections() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchParams] = useSearchParams();
  
  // Filter States
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchProducts = async (pageNum = 1, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = {
        search,
        brand,
        category,
        sort,
        minPrice: priceRange.min,
        maxPrice: priceRange.max,
        page: pageNum,
        limit: 12
      };

      const res = await getProductsAPI(params);
      const incoming = res.data.data.products;
      const { pages } = res.data.data.pagination;

      setProducts(prev => append ? [...prev, ...incoming] : incoming);
      setTotalPages(pages);
      setPage(pageNum);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      fetchProducts(1, false);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [search, category, sort, brand]); // Fetch on dropdown change or typing

  // Sync search state with URL parameters if user navigates via Navbar search
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch !== null && urlSearch !== search) {
      setSearch(urlSearch);
    }
  }, [searchParams]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchProducts(1, false);
  };

  const handleLoadMore = () => {
    fetchProducts(page + 1, true);
  };

  return (
    <div className="min-h-screen bg-luxury-dark pt-32 pb-20 px-6 lg:px-12">
      {/* Header */}
      <div className="text-center mb-16">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl lg:text-6xl font-playfair text-luxury-white mb-6 tracking-wide"
        >
          {category ? `${category} Collection` : 'All Collections'}
        </motion.h1>
      </div>

      {/* Filters & Search Bar */}
      <div className="max-w-7xl mx-auto mb-12 flex flex-col gap-6 border-b border-luxury-gray/20 pb-8">
        
        {/* Top Row: Search & Sort */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-1/2 flex gap-4">
            <div className="relative flex-grow">
              <input 
                type="text" 
                placeholder="Search by Product Name..." 
                className="w-full bg-transparent border border-luxury-gray/30 px-4 py-3 pl-12 text-luxury-white focus:outline-none focus:border-luxury-gold font-inter"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="absolute left-4 top-3.5 text-luxury-gray hover:text-luxury-gold transition-colors">
                <FiSearch size={20} />
              </button>
            </div>
            <button type="submit" className="bg-luxury-gold text-luxury-dark px-6 py-3 font-poppins uppercase tracking-widest text-xs hover:opacity-90 transition-opacity whitespace-nowrap">
              Search
            </button>
          </form>

          <select 
            className="w-full md:w-auto bg-transparent border border-luxury-gray/30 px-4 py-3 text-luxury-white focus:outline-none focus:border-luxury-gold font-inter cursor-pointer"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest" className="bg-luxury-dark">Latest Products</option>
            <option value="price_asc" className="bg-luxury-dark">Price: Low to High</option>
            <option value="price_desc" className="bg-luxury-dark">Price: High to Low</option>
            <option value="rating_desc" className="bg-luxury-dark">Highest Rated</option>
          </select>
        </div>

        {/* Bottom Row: Filters */}
        <div className="flex flex-col md:flex-row items-center gap-6 w-full">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <FiFilter className="text-luxury-gray" />
            <span className="text-luxury-gray font-poppins uppercase tracking-widest text-xs">Filter By:</span>
          </div>

          <select 
            className="w-full md:w-auto bg-transparent border border-luxury-gray/30 px-4 py-2 text-luxury-white focus:outline-none focus:border-luxury-gold font-inter cursor-pointer text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="" className="bg-luxury-dark">All Categories</option>
            <option value="Men" className="bg-luxury-dark">Men</option>
            <option value="Women" className="bg-luxury-dark">Women</option>
            <option value="Accessories" className="bg-luxury-dark">Accessories</option>
            <option value="Beauty" className="bg-luxury-dark">Beauty</option>
          </select>

          <input 
            type="text" 
            placeholder="Brand (e.g. Rolex)" 
            className="w-full md:w-auto bg-transparent border border-luxury-gray/30 px-4 py-2 text-luxury-white focus:outline-none focus:border-luxury-gold font-inter text-sm"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />

          <div className="flex items-center gap-2 w-full md:w-auto">
            <input 
              type="number" 
              placeholder="Min Price (₹)" 
              className="w-full md:w-32 bg-transparent border border-luxury-gray/30 px-4 py-2 text-luxury-white focus:outline-none focus:border-luxury-gold font-inter text-sm"
              value={priceRange.min}
              onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
            />
            <span className="text-luxury-gray">-</span>
            <input 
              type="number" 
              placeholder="Max Price (₹)" 
              className="w-full md:w-32 bg-transparent border border-luxury-gray/30 px-4 py-2 text-luxury-white focus:outline-none focus:border-luxury-gold font-inter text-sm"
              value={priceRange.max}
              onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
            />
            <button 
              onClick={(e) => handleSearchSubmit(e)}
              className="ml-2 border border-luxury-gold text-luxury-gold px-4 py-2 font-poppins uppercase tracking-widest text-xs hover:bg-luxury-gold hover:text-luxury-dark transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {Array(12).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {products.map((product, i) => (
              <ProductCard key={product._id} product={product} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <h3 className="text-2xl font-playfair text-luxury-white mb-4">No matching pieces found</h3>
            <p className="text-luxury-gray font-inter">Try adjusting your filters or search terms.</p>
          </div>
        )}

        {/* Load More */}
        {!loading && products.length > 0 && page < totalPages && (
          <div className="text-center mt-14">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="border border-luxury-gold/60 text-luxury-gold hover:bg-luxury-gold hover:text-luxury-dark font-poppins uppercase tracking-widest text-sm px-10 py-4 transition-all duration-300 disabled:opacity-50"
            >
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
