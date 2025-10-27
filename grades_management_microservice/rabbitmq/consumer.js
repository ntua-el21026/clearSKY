const amqp = require('amqplib');
const pool = require('../db.js'); // DB connection
const RABBITMQ_URL = 'amqp://guest:guest@rabbitmq';

async function startInstructorLookupConsumer(retries = 10, delay = 3000) {
  let connection = await pool.getConnection();
  for (let attempt = 1; attempt <= retries; attempt++) {
    
    try {
      const conn = await amqp.connect(RABBITMQ_URL);
      const channel = await conn.createChannel();

      await channel.assertQueue('lookup.instructor');
      console.log('✅ Listening on lookup.instructor queue');

      channel.consume('lookup.instructor', async (msg) => {
        const { institution, course, period } = JSON.parse(msg.content.toString());

        const result = await connection.query(
          `SELECT instructor_id FROM courses WHERE institution = ? AND course_name = ? AND exam_period = ?`,
          [institution, course, period]
        );
        
        const response = result[0] ? { instructor_id: result[0].instructor_id } : {};

        channel.sendToQueue(
          msg.properties.replyTo,
          Buffer.from(JSON.stringify(response)),
          { correlationId: msg.properties.correlationId }
        );

        channel.ack(msg);
      });

      break; // ✅ Success
    } catch (err) {
      console.error(`❌ RabbitMQ connection failed (attempt ${attempt}): ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise(res => setTimeout(res, delay));
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
}

module.exports = { startInstructorLookupConsumer };
