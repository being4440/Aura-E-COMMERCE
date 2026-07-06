const mongoose = require('mongoose');
const Product = require('./models/Product');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ecommerce_auth')
  .then(async () => {
    const products = await Product.find({});
    let updated = 0;
    for (let p of products) {
      let changed = false;
      const newImages = p.images.map(img => {
        if (img.includes('picsum.photos') && img.includes('?random=')) {
          changed = true;
          const match = img.match(/random=(\d+)/);
          const seed = match ? match[1] : Math.floor(Math.random() * 1000);
          return `https://picsum.photos/seed/${seed}/600/800`;
        }
        return img;
      });
      if (changed) {
        p.images = newImages;
        await p.save();
        updated++;
      }
    }
    console.log(`Updated ${updated} products.`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
