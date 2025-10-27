const express = require('express');
const cors = require('cors');
const { requestReview, replyToReview, acknowledgeReply,   getReviewById, getReplyByReviewId, getInstructorReviewRequests } = require('./reviewController');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { sendAndReceive } = require('./rabbitmq/rpc');

// Optional: Warm up the RPC connection to RabbitMQ
sendAndReceive('__ping__', {}).catch(() => {
  console.warn('RabbitMQ will initialize on first use');
});


app.get('/', (req, res) => {
  res.send('Review microservice is running');
});

// Student submits a review request
app.post('/reviews/request', (req, res) => {
  requestReview(req, res);
});

// Instructor replies to a review request
app.post('/reviews/reply', (req, res) => {
  replyToReview(req, res);
});

// Student acknowledges the reply
app.post('/reviews/ack', (req, res) => {
  acknowledgeReply(req, res);
});

// Instructor: Get all review requests for them
app.get('/reviews/instructor', (req, res) => {
  getInstructorReviewRequests(req, res);
});

app.post('/reviews/view', (req, res) => {
  getReviewById(req, res);
});

app.post('/replies/view', (req, res) => {
  getReplyByReviewId(req, res);
});




app.listen(port, () => {
  console.log(`Review service running at http://localhost:${port}`);
});
