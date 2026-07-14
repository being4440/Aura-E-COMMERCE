/**
 * Normalizes a product object into a single canonical shape matching the Mongoose schema.
 * Supports both the optimistic Redux shape (name, image) and the raw backend shape (title, images).
 */
export const normalizeProduct = (productData) => {
  if (!productData) return null;

  // Handle nested product if entire item was passed (e.g., from cart API)
  const product = productData.product || productData;

  return {
    _id: product._id || product.id || product.productId || '',
    productId: product.productId || product._id || product.id || '',
    
    // Canonicalize string fields
    title: product.title || product.name || 'Unknown Product',
    brand: product.brand || 'Generic',
    category: product.category || 'Generic',
    
    // Canonicalize images to Array
    images: Array.isArray(product.images) && product.images.length > 0
      ? product.images 
      : product.image 
        ? [product.image] 
        : [],
        
    // Standardize metrics
    price: typeof product.price === 'number' ? product.price : 0,
    stock: typeof product.stock === 'number' ? product.stock : (typeof product.maxStock === 'number' ? product.maxStock : 0),
    
    // Preserve Cart/Order specifics if present
    size: product.size || null,
    color: product.color || null,
    sizes: Array.isArray(product.sizes) ? product.sizes : [],
    colors: Array.isArray(product.colors) ? product.colors : [],
    description: product.description || '',
  };
};
