const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');
const Product = require('./models/Product');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ecommerce_auth';

const seedDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('Creating Admin and Test User accounts...');
      const salt = await bcrypt.genSalt(10);
      const adminPassword = await bcrypt.hash('Admin@123', salt);
      const userPassword = await bcrypt.hash('User@123', salt);

      await User.create({
        username: 'admin',
        email: 'admin@shop.com',
        password: adminPassword,
        mobile: '1234567890',
        role: 'admin'
      });

      await User.create({
        username: 'testuser',
        email: 'testuser@shop.com',
        password: userPassword,
        mobile: '0987654321',
        role: 'user'
      });
    }

    console.log('Clearing existing products...');
    await Product.deleteMany({});
    
    console.log('Creating Sample Products from seed.json...');
    
    // Read data from seed.json
    const fs = require('fs');
    const path = require('path');
    const seedDataPath = path.join(__dirname, 'seed.json');
    const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));

    await Product.insertMany(seedData);
    console.log('Database seeded with new products!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
