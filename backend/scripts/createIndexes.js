require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

async function createIndexes() {
  await connectDB();
  const db = mongoose.connection.db;

  // Note: background:true was deprecated in MongoDB 4.2 and removed in 4.4.
  // MongoDB 4.4+ builds indexes in the background by default — no option needed.

  await db.collection('commentlikes').createIndex(
    { commentId: 1, userId: 1 },
    { unique: true }
  );
  console.log('✓ commentlikes: { commentId, userId } unique index');

  // DESC createdAt to match buildCommentPipeline's default sort of { createdAt: -1 }
  // for top-level comments. Without matching sort direction, MongoDB cannot use this
  // index to satisfy the sort and falls back to an in-memory sort on every request.
  await db.collection('comments').createIndex(
    { postId: 1, parentId: 1, createdAt: -1 }
  );
  console.log('✓ comments: { postId, parentId, createdAt: -1 } compound index (top-level query order)');

  // ASC sort index for replies (buildCommentPipeline uses { createdAt: 1 } for replies)
  await db.collection('comments').createIndex(
    { postId: 1, parentId: 1, createdAt: 1 }
  );
  console.log('✓ comments: { postId, parentId, createdAt: 1 } compound index (replies order)');

  console.log('All indexes created successfully.');
  process.exit(0);
}

createIndexes().catch((err) => {
  console.error('Index creation failed:', err.message);
  process.exit(1);
});
