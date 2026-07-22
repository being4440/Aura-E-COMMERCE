const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');

// Load environment variables from .env file
dotenv.config();

const app = express();
// Configure trust proxy for Render (and other reverse proxies) so express-rate-limit uses the real client IP
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'https://aura-e-commerce-vt3c.onrender.com'], // Allow frontend Vite dev server origins
  credentials: true
}));
// Webhook must be parsed as raw body before express.json() is applied
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }), require('./routes/paymentWebhookRoute'));

app.use(express.json());

// Database Connection Setup
const connectDB = require('./config/db');
connectDB();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/products/:productId/reviews', require('./routes/reviewRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/wishlist', require('./routes/wishlistRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/admin/orders', require('./routes/adminOrderRoutes'));
app.use('/api/admin/products', require('./routes/adminProductRoutes'));
app.use('/api/admin/categories', require('./routes/adminCategoryRoutes'));
app.use('/api/admin/users', require('./routes/adminUserRoutes'));
app.use('/api/admin/reviews', require('./routes/adminReviewRoutes'));
app.use('/api/admin/dashboard', require('./routes/adminDashboardRoutes'));
app.use('/api/admin/analytics', require('./routes/adminAnalyticsRoutes'));
app.use('/api/cart', require('./routes/cart.routes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/audit-logs', require('./routes/auditRoutes'));

// Base route for API check
app.get('/', (req, res) => {
  res.send('E-commerce  API is running.');
});

// Custom 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Requested resource not found.' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', err.stack);
  const statusCode = err.status || (res.statusCode === 200 ? 500 : res.statusCode);
  res.status(statusCode).json({ success: false, message: err.message || 'Internal Server Error' });
});

// Listen on Port (default 5000)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
