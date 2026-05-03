const { Queue } = require('bullmq');
const { getClient } = require('../config/redis');

// defaultJobOptions must be on the Queue, not the Worker.
// BullMQ ignores job options (attempts, backoff, removeOnComplete) set on the Worker instance.
let queue = null;

function getMediaQueue() {
  if (!queue && getClient()) {
    queue = new Queue('media-processing', {
      connection: getClient(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 50,
      },
    });
  }
  return queue;
}

module.exports = { getMediaQueue };
