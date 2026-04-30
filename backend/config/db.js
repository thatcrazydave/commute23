const mongoose = require('mongoose');
const Logger = require('../utils/logger');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    Logger.error('MONGODB_URI not set');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    Logger.info('MongoDB connected', { uri: uri.replace(/\/\/.*@/, '//***@') });
  } catch (err) {
    Logger.error('MongoDB connection error', { error: err.message });
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    Logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    Logger.error('MongoDB error', { error: err.message });
  });
};

module.exports = connectDB;
