const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');

let channel, connection, replyQueue;
const RABBITMQ_URL = 'amqp://guest:guest@rabbitmq';

async function init() {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    const q = await channel.assertQueue('', { exclusive: true });
    replyQueue = q.queue;
    console.log('RabbitMQ RPC channel ready');
  } catch (err) {
    console.error('Failed to connect to RabbitMQ:', err.message);
    throw err;
  }
}

async function sendAndReceive(queue, message) {
  if (!channel || !replyQueue) await init();

  const correlationId = uuidv4();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      channel.cancel(correlationId); // ❗ cancel the consumer if it times out
      reject(new Error('RPC request timed out'));
    }, 5000);

    channel.consume(replyQueue, (msg) => {
      if (msg.properties.correlationId === correlationId) {
        clearTimeout(timeout);

        try {
          const result = JSON.parse(msg.content.toString());
          resolve(result);
        } catch (err) {
          reject(new Error('Invalid JSON in response: ' + err.message));
        }

        // ✅ THIS is where you cancel the consumer after success
        channel.cancel(correlationId);
      }
    }, {
      noAck: true,
      consumerTag: correlationId // <- consumerTag used to cancel later
    });

    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      correlationId,
      replyTo: replyQueue
    });
  });
}

module.exports = { sendAndReceive };
