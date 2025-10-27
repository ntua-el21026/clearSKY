const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = 8080;
const JWT_SECRET = process.env.JWT_SECRET ;
const cors = require("cors");

app.use(cors({
  origin: "http://localhost:5173", // frontend address
  credentials: true,
  allowedHeaders: ["Content-Type", "X-OBSERVATORY-AUTH"]
}));


// Middleware: verify token
function verifyToken(req, res, next) {
  const token = req.header('X-OBSERVATORY-AUTH');
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Middleware: allow only specific roles
function allowRoles(...roles) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: `Forbidden: Only [${roles.join(', ')}] allowed` });
    }
    next();
  };
}

app.use('/auth/login', createProxyMiddleware({
  target: 'http://users-service:3000',
  changeOrigin: true,
  pathRewrite: { '^/auth': '/api' }
}));

app.use('/auth/register', verifyToken, allowRoles('institution'), createProxyMiddleware({
  target: 'http://users-service:3000',
  changeOrigin: true,
  pathRewrite: { '^/auth': '/api' }
}));

app.use('/auth/changePassword', verifyToken, allowRoles('institution'), createProxyMiddleware({
  target: 'http://users-service:3000',
  changeOrigin: true,
  pathRewrite: { '^/auth': '/api' }
}));


app.use('/auth/logout', verifyToken, createProxyMiddleware({
  target: 'http://users-service:3000',
  changeOrigin: true,
  pathRewrite: { '^/auth': '/api' }
}));

app.use('/grades/upload/initial', verifyToken, allowRoles('instructor'), createProxyMiddleware({
  target: 'http://grades-service:4000',
  changeOrigin: true,
  pathRewrite: { '^/grades': '/grades' },
  onProxyReq: (proxyReq, req) => {
     console.log('API Gateway decoded user:', req.user);
    proxyReq.setHeader('x-user-id', req.user?.id);
    proxyReq.setHeader('x-user-username', req.user?.username);
    proxyReq.setHeader('x-user-role', req.user?.role);
    proxyReq.setHeader('x-user-institution', req.user?.institution);
  }
}));


app.use('/grades/upload/final', verifyToken, allowRoles('instructor'), createProxyMiddleware({
  target: 'http://grades-service:4000',
  changeOrigin: true,
  pathRewrite: { '^/grades': '/grades' },
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader('x-user-id', req.user?.id);
    proxyReq.setHeader('x-user-username', req.user?.username);
    proxyReq.setHeader('x-user-role', req.user?.role);
    proxyReq.setHeader('x-user-institution', req.user?.institution);
  }
}));

app.use('/grades/validateExcel', verifyToken, allowRoles('instructor'), createProxyMiddleware({
  target: 'http://grades-service:4000',
  changeOrigin: true,
  pathRewrite: { '^/grades': '/grades' },
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader('x-user-role', req.user?.role);
  }

}));

// Route: Request review (by students)
app.use('/reviews/request', verifyToken, allowRoles('student'), createProxyMiddleware({
  target: 'http://review-service:5000', // replace 5000 with your actual review-service port
  changeOrigin: true,
  pathRewrite: { '^/reviews': '/reviews' }, // assumes the review microservice expects /api/reviews
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader('x-student-id', req.user?.student_id);
    proxyReq.setHeader('x-institution-id', req.user?.institution);
  }
}));

app.use('/reviews/reply', verifyToken, allowRoles('instructor'), createProxyMiddleware({
  target: 'http://review-service:5000', // adjust if needed
  changeOrigin: true,
  pathRewrite: { '^/reviews': '/reviews' },
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader('x-user-id', req.user?.id);
  }
}));

app.use('/reviews/ack', verifyToken, allowRoles('student'), createProxyMiddleware({
  target: 'http://review-service:5000',
  changeOrigin: true,
  pathRewrite: { '^/reviews': '/reviews' },
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader('x-student-id', req.user?.student_id);
  }
}));

app.use('/reviews/instructor', verifyToken, allowRoles('instructor'), createProxyMiddleware({
  target: 'http://review-service:5000',
  changeOrigin: true,
  pathRewrite: { '^/reviews': '/reviews' },
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader('x-user-id', req.user?.id);
  }
}));

// GET a review by ID (student or instructor can access)
app.use('/reviews/view', verifyToken, allowRoles('student', 'instructor'), createProxyMiddleware({
  target: 'http://review-service:5000',
  changeOrigin: true,
  pathRewrite: { '^/reviews': '/reviews' },
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader('x-user-role', req.user.role);
      proxyReq.setHeader('x-user-id', req.user.id);
      if (req.user.role === 'student') {
        proxyReq.setHeader('x-student-id', req.user.student_id ); 
      }
  }
}));

// GET a reply to a review by review ID (student or instructor can access)
app.use('/replies/view', verifyToken, allowRoles('student', 'instructor'), createProxyMiddleware({
  target: 'http://review-service:5000',
  changeOrigin: true,
  pathRewrite: { '^/replies': '/replies' },
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader('x-user-role', req.user.role);
      proxyReq.setHeader('x-user-id', req.user.id);
      if (req.user.role === 'student') {
        proxyReq.setHeader('x-student-id', req.user.student_id ); 
      }
  }
}));




app.use(
  '/grades/view',
  verifyToken,
  createProxyMiddleware({
    target: 'http://grades-service:4000',
    changeOrigin: true,
    pathRewrite: { '^/grades': '/grades' },
    onProxyReq: (proxyReq, req) => {
      proxyReq.setHeader('x-user-institution', req.user.institution);
      proxyReq.setHeader('x-user-role', req.user.role);
      proxyReq.setHeader('x-user-id', req.user.id);
      if (req.user.role === 'student') {
        proxyReq.setHeader('x-student-id', req.user.student_id ); 
      }
    }
  }),
);

app.use(
  '/grades/available',
  verifyToken,
  createProxyMiddleware({
    target: 'http://grades-service:4000',
    changeOrigin: true,
    pathRewrite: { '^/grades': '/grades' },
    onProxyReq: (proxyReq, req) => {
      if (req.user) {
        proxyReq.setHeader('x-user-institution', req.user.institution);
        proxyReq.setHeader('x-user-role', req.user.role);
        proxyReq.setHeader('x-user-id', req.user.id);
        if (req.user.role === 'student') {
          proxyReq.setHeader('x-student-id', req.user.student_id ); 
        }
      }
    }
  })
);

app.use(
  '/grades/statistics',
  verifyToken,
  createProxyMiddleware({
    target: 'http://grades-service:4000',
    changeOrigin: true,
    pathRewrite: { '^/grades': '/grades' },
    onProxyReq: (proxyReq, req) => {
      if (req.user) {
        proxyReq.setHeader('x-user-institution', req.user.institution);
        proxyReq.setHeader('x-user-role', req.user.role);
        proxyReq.setHeader('x-user-id', req.user.id);
        if (req.user.role === 'student') {
          proxyReq.setHeader('x-student-id', req.user.student_id ); 
        }
      }
    }
  })
);

app.listen(PORT, () => {
  console.log(`API Gateway running at http://localhost:${PORT}`);
});
