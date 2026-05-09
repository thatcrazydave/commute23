const { Queue } = require('bullmq');
const { getClient } = require('../config/redis');

// defaultJobOptions must be on the Queue, not the Worker.
// BullMQ ignores job options (attempts, backoff, removeOnComplete) set on the Worker instance.
let queue = null;

function getArchiveQueue() {
  if (!queue && getClient()) {
    queue = new Queue('archive', {
      connection: getClient(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: 50,
      },
    });
  }
  return queue;
}

module.exports = { getArchiveQueue };
