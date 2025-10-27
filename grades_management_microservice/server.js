const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { postGrades, viewStatistics } = require('./gradesController');
const { viewPersonalGrades } = require('./gradesController');
const {viewAvailableCourses} = require('./gradesController');
const { validateExcel } = require('./gradesController');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { startInstructorLookupConsumer } = require('./rabbitmq/consumer');
startInstructorLookupConsumer().catch(err => {
  console.error("Failed to start RabbitMQ consumer:", err);
  process.exit(1);
});


const upload = multer({ dest: 'uploads/' });

app.get('/', (req, res) => {
  res.send('Grades microservice is running');
});

app.post('/grades/upload/initial', upload.single('file'), (req, res) => {
  req.body.status = 'initial';
  if (!req.headers['x-user-id']) {
    return res.status(401).json({ error: 'Unauthorized: Missing x-user-id' });
  }
  postGrades(req, res);
});

app.post('/grades/upload/final', upload.single('file'), (req, res) => {
  req.body.status = 'final';
  if (!req.headers['x-user-id']) {
    return res.status(401).json({ error: 'Unauthorized: Missing x-user-id' });
  }
  postGrades(req, res);
});

app.post('/grades/validateExcel', upload.single('file'), (req, res) => {
  req.body.status = 'final';
  validateExcel(req, res);
});

app.get('/grades/view', viewPersonalGrades);

app.get('/grades/available', viewAvailableCourses);

app.get('/grades/statistics', viewStatistics);

app.listen(port, () => {
  console.log(` Grades service running at http://localhost:${port}`);
});
