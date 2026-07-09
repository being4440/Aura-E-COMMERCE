import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:5000/api"
});

// Request interceptor for adding the JWT token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    config.headers = config.headers || {};
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 Unauthorized errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/login');
    if (error.response && error.response.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getCartAPI = () => api.get('/cart');
export const addToCartAPI = (productData) => api.post('/cart/add', productData);
export const updateQtyAPI = (itemId, quantity) => api.patch(`/cart/${itemId}`, { quantity });
export const removeItemAPI = (itemId) => api.delete(`/cart/${itemId}`);
export const clearCartAPI = () => api.delete('/cart');

// Product APIs
export const getProductsAPI = (params) => api.get('/products', { params });
export const getProductByIdAPI = (id) => api.get(`/products/${id}`);
export const getFeaturedProductsAPI = () => api.get('/products/featured');
export const getNewArrivalsAPI = () => api.get('/products/new-arrivals');
export const checkProductStockAPI = (id) => api.get(`/products/${id}/stock`);

// Admin APIs
export const adminGetProductsAPI = (params) => api.get('/admin/products', { params });
export const adminAddProductAPI = (data) => api.post('/admin/products', data);
export const adminUpdateProductAPI = (id, data) => api.patch(`/admin/products/${id}`, data);
export const adminUpdateStockAPI = (id, data) => api.patch(`/admin/products/${id}/stock`, data);
export const adminDeleteProductAPI = (id, data) => api.delete(`/admin/products/${id}`, { data });

// Wishlist APIs
export const getWishlistAPI = () => api.get('/wishlist');
export const addToWishlistAPI = (productId) => api.post('/wishlist', { productId });
export const removeFromWishlistAPI = (productId) => api.delete(`/wishlist/${productId}`);

// Review APIs
export const getProductReviewsAPI = (productId) => api.get(`/products/${productId}/reviews`);
export const addReviewAPI = (productId, reviewData) => api.post(`/products/${productId}/reviews`, reviewData);
export const updateReviewAPI = (productId, reviewId, reviewData) => api.put(`/products/${productId}/reviews/${reviewId}`, reviewData);
export const deleteReviewAPI = (productId, reviewId) => api.delete(`/products/${productId}/reviews/${reviewId}`);

export default api;