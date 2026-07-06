const mongoose = require('mongoose');
const Product = require('./backend/models/Product');
const Order = require('./backend/models/Order');
const User = require('./backend/models/User');
const dbURL = 'mongodb+srv://deepakumari0059:12gauri34@cluster0.n1w1q.mongodb.net/ecommerce?retryWrites=true&w=majority&appName=Cluster0'; // using standard connection

async function test() {
  try {
    await mongoose.connect(dbURL);
    console.log('Connected to DB');
    
    // Test check stock
    const products = await Product.find().limit(1);
    if(products.length) {
      const p = products[0];
      console.log('Product ID:', p._id);
      console.log('Available Stock:', p.availableStock);
      console.log('Is In Stock:', p.isInStock());
    }

    // Test admin products lean
    const adminProducts = await Product.find().sort({ createdAt: -1 }).skip(0).limit(20).lean();
    console.log('Admin products fetch success, got', adminProducts.length);

    console.log('Done');
    process.exit(0);
  } catch(e) {
    console.error('Error:', e);
    process.exit(1);
  }
}
test();
