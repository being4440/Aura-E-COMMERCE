const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Mongodb Connected Successfully!");

  } catch (err) {
    console.error("MongoDB Error:", err);
  }
};

module.exports = connectDB;