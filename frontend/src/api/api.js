import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://127.0.0.1:5000/api"
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

// Wishlist APIs
export const getWishlistAPI = () => api.get('/wishlist');
export const addToWishlistAPI = (productId) => api.post('/wishlist', { productId });
export const removeFromWishlistAPI = (productId) => api.delete(`/wishlist/${productId}`);

// Review APIs
export const getProductReviewsAPI = (productId) => api.get(`/products/${productId}/reviews`);
export const addReviewAPI = (productId, reviewData) => api.post(`/products/${productId}/reviews`, reviewData);
export const updateReviewAPI = (productId, reviewId, reviewData) => api.put(`/products/${productId}/reviews/${reviewId}`, reviewData);
export const deleteReviewAPI = (productId, reviewId) => api.delete(`/products/${productId}/reviews/${reviewId}`);

// -----------------------------------------------------
// ADMIN APIS
// -----------------------------------------------------

// Admin - Products
export const adminGetProductsAPI = (params) => api.get('/admin/products', { params });
export const adminAddProductAPI = (data) => api.post('/admin/products', data);
export const adminUpdateProductAPI = (id, data) => api.put(`/admin/products/${id}`, data);
export const adminUpdateStockAPI = (id, data) => api.patch(`/admin/products/${id}/stock`, data);
export const adminDeleteProductAPI = (id) => api.delete(`/admin/products/${id}`);

// Admin - Dashboard
export const adminGetDashboardStatsAPI = () => api.get('/admin/dashboard/stats');
export const adminGetRecentOrdersAPI = () => api.get('/admin/dashboard/recent-orders');
export const adminGetTopProductsAPI = () => api.get('/admin/dashboard/top-products');

// Admin - Users
export const adminGetUsersAPI = (params) => api.get('/admin/users', { params });
export const adminGetAuditLogsAPI = (params) => api.get('/audit-logs', { params });
export const adminGetUserByIdAPI = (id) => api.get(`/admin/users/${id}`);
export const adminUpdateUserRoleAPI = (id, role) => api.patch(`/admin/users/${id}/role`, { role });
export const adminUpdateUserBlockAPI = (id, data) => api.patch(`/admin/users/${id}/block`, data);

// Admin - Categories
export const adminGetCategoriesAPI = () => api.get('/admin/categories');
export const adminAddCategoryAPI = (data) => api.post('/admin/categories', data);
export const adminUpdateCategoryAPI = (id, data) => api.put(`/admin/categories/${id}`, data);
export const adminToggleCategoryAPI = (id, data) => api.put(`/admin/categories/${id}/toggle`, data);
export const adminDeleteCategoryAPI = (id) => api.delete(`/admin/categories/${id}`);

// Admin - Reviews
export const adminGetReviewsAPI = (params) => api.get('/admin/reviews', { params });
export const adminUpdateReviewHideAPI = (id, data) => api.patch(`/admin/reviews/${id}/hide`, data);
export const adminDeleteReviewAPI = (id) => api.delete(`/admin/reviews/${id}`);

// Admin - Orders
export const adminGetOrdersAPI = (params) => api.get('/admin/orders', { params });
export const adminGetOrderByIdAPI = (id) => api.get(`/admin/orders/${id}`);
export const adminUpdateOrderStatusAPI = (id, status) => api.patch(`/admin/orders/${id}/status`, { status });
export const adminCancelOrderAPI = (id, reason) => api.patch(`/admin/orders/${id}/cancel`, { reason });
export const adminReturnOrderAPI = (id, data) => api.patch(`/admin/orders/${id}/return`, data);
export const adminGenerateInvoiceAPI = (id) => api.patch(`/admin/orders/${id}/generate-invoice`);

// Admin - Analytics
export const adminGetSalesAnalyticsAPI = (params) => api.get('/admin/analytics/sales', { params });
export const adminGetProductsAnalyticsAPI = () => api.get('/admin/analytics/products');
export const adminGetUsersAnalyticsAPI = (params) => api.get('/admin/analytics/users', { params });
export const adminGetPaymentsAnalyticsAPI = () => api.get('/admin/analytics/payments');

export default api;