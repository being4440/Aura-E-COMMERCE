# E-COMMERCE
[![Ask DeepWiki](https://devin.ai/assets/askdeepwiki.png)](https://deepwiki.com/being4440/E-COMMERCE)

A full-stack MERN e-commerce platform named "Aura," designed for a luxury market. It features a complete customer-facing storefront and a comprehensive administrative dashboard for managing the application. The project is built with a modern technology stack, including React with Redux for the frontend and a Node.js/Express backend with MongoDB.

## ✨ Key Features

### Customer Experience
- **Elegant UI**: A sophisticated and responsive design built with Tailwind CSS and Framer Motion.
- **Product Discovery**: Browse collections, search, and filter products by category, brand, price, and more.
- **User Authentication**: Secure JWT-based registration and login for customers.
- **Shopping Cart**: Add, update, and remove items from the cart with optimistic UI updates.
- **Wishlist**: Save favorite products for later.
- **Secure Checkout**: Integrated with Stripe for credit card payments and a Cash on Delivery (COD) option.
- **Order Management**: Users can view their order history and download invoices.
- **Product Reviews**: Customers can add, update, and delete their own product reviews.

### Administrative Panel
- **Comprehensive Dashboard**: At-a-glance statistics for total revenue, orders, users, and product stock levels.
- **Product Management**: Full CRUD functionality for products, including image uploads via Cloudinary.
- **Order Management**: View, search, filter, and update order statuses (e.g., packed, shipped, delivered).
- **User Management**: View and manage all users, with the ability to block or unblock accounts.
- **Category Management**: Create, edit, and manage product categories.
- **Review Moderation**: Hide or permanently delete spam/inappropriate reviews.
- **Advanced Analytics**: Visual charts for sales trends, product performance, user registrations, and payment methods.
- **Audit Logging**: Tracks critical changes made by admins to products, orders, and users for accountability.
- **Invoice Generation**: Manually generate and download PDF invoices for any order.

## 🛠️ Tech Stack

**Backend:**
- **Framework**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Tokens (JWT)
- **Payments**: Stripe
- **Image Handling**: Cloudinary for cloud storage, Multer for uploads
- **Security**: `bcryptjs` for password hashing, `express-rate-limit` for brute-force protection

**Frontend:**
- **Framework/Library**: React, Vite
- **State Management**: Redux Toolkit
- **Routing**: React Router
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **API Communication**: Axios
- **UI Feedback**: React Hot Toast

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js (v16.20.1 or later)
- npm (or yarn)
- A MongoDB instance (local or a cloud service like MongoDB Atlas)

### Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create a `.env` file** in the `backend` directory and add the following environment variables. Replace the placeholder values with your own keys and URIs.
    ```env
    # Server Configuration
    PORT=5000
    FRONTEND_URL=http://localhost:5173

    # Database
    MONGODB_URI=your_mongodb_connection_string

    # Authentication
    JWT_SECRET=your_super_secret_jwt_key
    REFRESH_TOKEN_SECRET=your_super_secret_refresh_key

    # Payment Gateway
    STRIPE_SECRET_KEY=sk_test_...
    STRIPE_WEBHOOK_SECRET=whsec_...

    # Image Cloud Storage
    CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
    CLOUDINARY_API_KEY=your_cloudinary_api_key
    CLOUDINARY_API_SECRET=your_cloudinary_api_secret
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The server will start on `http://localhost:5000`.

### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create a `.env` file** in the `frontend` directory and specify the URL of your backend API:
    ```env
    VITE_API_URL=http://localhost:5000
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

## 📂 Project Structure

The repository is organized into two main folders: `backend` and `frontend`.

```
.
├── backend/
│   ├── config/         # Database connection setup
│   ├── controllers/    # Express route handlers and business logic
│   ├── middleware/     # Custom middleware (auth, file uploads)
│   ├── models/         # Mongoose data schemas
│   ├── routes/         # API route definitions
│   ├── services/       # Business logic services (e.g., AuditLog)
│   ├── utils/          # Utility functions (e.g., Cloudinary helper)
│   └── server.js       # Main Express server entry point
│
└── frontend/
    ├── public/         # Static assets
    └── src/
        ├── api/        # Centralized Axios API configuration
        ├── components/ # Reusable React components
        ├── hooks/      # Custom hooks (e.g., useAuth)
        ├── layouts/    # Layout components (e.g., AdminLayout)
        ├── pages/      # Page components for different routes
        │   └── admin/  # Pages specific to the admin panel
        ├── store/      # Redux Toolkit state management
        ├── utils/      # Client-side utility functions
        └── App.jsx     # Main application component with routing setup
