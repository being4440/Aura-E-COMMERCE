import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { fetchCart, resetCartState } from './store/cartSlice';
import { fetchWishlist, resetWishlistState } from './store/wishlistSlice';
import { setUser, clearUser } from './store/authSlice';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import Collections from './pages/Collections.jsx';
import About from './pages/About.jsx';
import ProductDetails from './pages/ProductDetails.jsx';
import Navbar from './components/Navbar.jsx';
import CartPage from './pages/CartPage.jsx';
import Wishlist from './pages/Wishlist.jsx';
import Profile from './pages/Profile.jsx';
import Checkout from './pages/Checkout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import ProductsManagement from './pages/admin/ProductsManagement.jsx';
import ProductForm from './pages/admin/ProductForm.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import OrderConfirmation from './pages/OrderConfirmation.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminProtectedRoute from './components/AdminProtectedRoute.jsx';
import InfoPage from './components/InfoPage.jsx';
import AdminOrdersList from './pages/admin/AdminOrdersList.jsx';
import AdminOrderDetail from './pages/admin/AdminOrderDetail.jsx';
import AdminCategoriesList from './pages/admin/AdminCategoriesList.jsx';
import AdminUsersList from './pages/admin/AdminUsersList.jsx';
import AdminUserDetail from './pages/admin/AdminUserDetail.jsx';
import AdminReviewsList from './pages/admin/AdminReviewsList.jsx';
import AdminAnalytics from './pages/admin/AdminAnalytics.jsx';
import AdminAuditLogs from './pages/admin/AdminAuditLogs.jsx';

const AppInit = () => {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth?.user);
  const isLoggedIn = !!user;

  useEffect(() => {
    if (isLoggedIn) {
      dispatch(fetchCart());
      dispatch(fetchWishlist());
    }
  }, [isLoggedIn, dispatch]);

  return null;
};

function App() {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth?.user);

  const handleLoginSuccess = (newUser, authToken) => {
    dispatch(setUser({ user: newUser, token: authToken }));
  };

  const handleLogout = () => {
    dispatch(resetCartState());
    dispatch(resetWishlistState());
    dispatch(clearUser());
    window.location.href = '/';
  };

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <AppInit />
      <div className="app-container bg-luxury-dark min-h-screen font-inter text-luxury-white selection:bg-luxury-gold selection:text-luxury-dark">
        <Navbar user={user} handleLogout={handleLogout} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home user={user} handleLogout={handleLogout} />} />
            <Route path="/login" element={<Login handleLoginSuccess={handleLoginSuccess} />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin/login" element={<AdminLogin handleLoginSuccess={handleLoginSuccess} />} />
            <Route path="/admin" element={<AdminProtectedRoute><AdminLayout handleLogout={handleLogout} /></AdminProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="orders" element={<AdminOrdersList />} />
              <Route path="orders/:id" element={<AdminOrderDetail />} />
              <Route path="users" element={<AdminUsersList />} />
              <Route path="users/:id" element={<AdminUserDetail />} />
              <Route path="reviews" element={<AdminReviewsList />} />
              <Route path="categories" element={<AdminCategoriesList />} />
              <Route path="products" element={<ProductsManagement />} />
              <Route path="products/new" element={<ProductForm />} />
              <Route path="products/edit/:id" element={<ProductForm />} />
              <Route path="audit-logs" element={<AdminAuditLogs />} />
            </Route>
            <Route path="/collections" element={<Collections />} />
            <Route path="/about" element={<About />} />
            <Route path="/products/:id" element={<ProductDetails />} />
            <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
            <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
            <Route path="/order-confirmation/:id" element={<ProtectedRoute><OrderConfirmation /></ProtectedRoute>} />
            <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
            <Route path="/profile" element={<Profile />} />
            
            {/* Footer Info Pages */}
            <Route path="/privacy" element={
              <InfoPage 
                title="Privacy Policy" 
                content={<p>Your privacy is of the utmost importance to us. This policy outlines how we collect, use, and protect your personal information when you interact with our platform.</p>} 
              />
            } />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
