require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const categories = ["Men", "Women", "Accessories", "Beauty"];

  for (const name of categories) {
    try {
      const exists = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
      if (!exists) {
        await Category.create({ name });
        console.log(`Created category: ${name}`);
      } else {
        console.log(`Category already exists: ${name}`);
      }
    } catch (err) {
      console.error(`Error creating ${name}:`, err.message);
    }
  }

  await mongoose.disconnect();
  console.log("Done");
};

seed();
