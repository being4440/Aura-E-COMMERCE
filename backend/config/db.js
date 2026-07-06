const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected Successfully!");
    console.log("Database:", mongoose.connection.name);
    console.log("Host:", mongoose.connection.host);

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("Collections:", collections);

  } catch (err) {
    console.error("MongoDB Error:", err);
  }
};

module.exports = connectDB;