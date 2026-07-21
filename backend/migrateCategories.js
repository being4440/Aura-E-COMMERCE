const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const Category = require('./models/Category');

dotenv.config();

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB Connected...');

    const db = mongoose.connection.db;
    const products = await db.collection('products').find({}).toArray();
    console.log(`Found ${products.length} products to check...`);

    let updatedCount = 0;

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      if (typeof product.category === 'string') {
        const categoryString = product.category;
        
        let categoryDoc = await db.collection('categories').findOne({ name: categoryString });
        
        if (!categoryDoc) {
          console.log(`Warning: Category "${categoryString}" not found. Creating it...`);
          const newCat = { name: categoryString, isActive: true, createdAt: new Date() };
          const result = await db.collection('categories').insertOne(newCat);
          categoryDoc = { _id: result.insertedId, name: categoryString };
        }

        await db.collection('products').updateOne(
          { _id: product._id },
          { $set: { category: categoryDoc._id } }
        );
        updatedCount++;
        console.log(`Updated product ${product.title} with category ${categoryDoc.name}`);
      }
    }

    console.log(`Migration completed successfully. Updated ${updatedCount} products.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
