const mongoose = require('mongoose');

const connect = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
};

const clearCollections = async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
};

const disconnect = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
};

module.exports = { connect, clearCollections, disconnect };
