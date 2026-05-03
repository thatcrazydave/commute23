require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

async function createIndexes() {
  await connectDB();
  const db = mongoose.connection.db;

  await db.collection('commentlikes').createIndex(
    { commentId: 1, userId: 1 },
    { unique: true, background: true }
  );
  console.log('✓ commentlikes: { commentId, userId } unique index');

  await db.collection('comments').createIndex(
    { postId: 1, parentId: 1, createdAt: 1 },
    { background: true }
  );
  console.log('✓ comments: { postId, parentId, createdAt } compound index');

  console.log('All indexes created successfully.');
  process.exit(0);
}

createIndexes().catch((err) => {
  console.error('Index creation failed:', err.message);
  process.exit(1);
});
