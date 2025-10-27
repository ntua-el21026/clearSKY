const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('./db');
const { connect } = require('http2');

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

async function login(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Missing username or password" });
    }

    try {
        const connection = await pool.getConnection();
        const results = await connection.execute("SELECT * FROM users WHERE username = ?", [username]);
        connection.release();

        if (results.length === 0) {
            return res.status(401).json({ error: "REGISTER" });
        }

        const user = results[0];

        const hash = crypto.createHash('sha256').update(password).digest('hex');

        if (hash !== user.password_hash) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        let payload = {
            id: user.id,
            username: user.username,
            role: user.user_role,
            institution: user.institution
        };

        if (user.user_role === 'student') {
            payload.student_id = user.student_id;
        }

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        res.json({ token, role: user.user_role });
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: "Database error" });
    }
}




async function register(req, res) {
  const token = req.header("X-OBSERVATORY-AUTH");
  if (!token) return res.status(401).json({ error: "Unauthorized: Missing token" });

  let requester;
  try {
    requester = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const { username, password, role, student_id } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: "Missing username, password, or role" });
  }

  if (requester.role === 'institution') {
    if (!['student', 'instructor'].includes(role)) {
      return res.status(403).json({ error: "Institutions can only register students or instructors" });
    }
    if (role === 'student' && !student_id) {
      return res.status(400).json({ error: "Student ID required for student registration" });
    }
  } else {
    return res.status(403).json({ error: "Only institutions or admins can register users" });
  }

  try {
    const connection = await pool.getConnection();

    const existing = await connection.query("SELECT * FROM users WHERE username = ?", [username]);
    connection.release();
    if (existing.length > 0) {
      connection.release();
      return res.status(409).json({ error: "Account already exists" });
    }



    const hash = crypto.createHash('sha256').update(password).digest('hex');

    let query, params;
    if (role === 'student') {
      query = `INSERT INTO users (username, password_hash, user_role, student_id, institution) VALUES (?, ?, ?, ?, ?)`;
      params = [username, hash, role, student_id, requester.institution];
    } else if (role === 'instructor') {
      query = `INSERT INTO users (username, password_hash, user_role, institution) VALUES (?, ?, ?, ?)`;
      params = [username, hash, role, requester.institution];
    } 
    await connection.execute(query, params);
    connection.release();

    res.json({ message: `User '${username}' registered successfully as ${role}` });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Database error" });
  }
}


async function updatePassword(req, res) {
  const token = req.header("X-OBSERVATORY-AUTH");
  if (!token) return res.status(401).json({ error: "Unauthorized: Missing token" });

  let requester;
  try {
    requester = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const { username, password, role, student_id } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: "Missing username, password, or role" });
  }

  if (requester.role !== 'institution') {
    return res.status(403).json({ error: "Only institutions or admins can update passwords" });
  }

  try {
    const connection = await pool.getConnection();
    if(role!= 'student'){
      const existing = await connection.query("SELECT * FROM users WHERE username = ? AND user_role = ?", [username, role]);
      connection.release();
      if (existing.length === 0) {
         return res.status(404).json({ error: "User does not exist. Please register first." });
      }
    } else {
      const existing = await connection.query("SELECT * FROM users WHERE username = ? AND user_role = ? AND student_id =?",
        [username, role, student_id]
      );
      connection.release();
      if (existing.length === 0) {
        return res.status(404).json({ error: "User does not exist. Please register first." });
      }
    }

    const hash = crypto.createHash('sha256').update(password).digest('hex');

    await connection.query(
      "UPDATE users SET password_hash = ? WHERE username = ? AND user_role = ?",
      [hash, username, role]
    );

    connection.release();
    res.json({ message: `Password for '${username}' updated successfully.` });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Database error" });
  }
}




async function logout(req, res) {
    const token = req.header("X-OBSERVATORY-AUTH"); 
    if (!token) {
        return res.status(401).json({ error: "Missing token" }); 
    }

    let connection;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        connection = await pool.getConnection();

        const results = await connection.execute(
            "SELECT * FROM blacklisted_tokens WHERE token = ? LIMIT 1",
            [token]
        );
        connection.release();
        if (results.length > 0) {
            return res.status(401).json({ error: "Token is blacklisted. Please log in again." });
        }
    

        await connection.execute(
            "INSERT INTO blacklisted_tokens (token) VALUES (?)",
            [token]
        );
        connection.release();
        res.sendStatus(200); 
    } catch (error) {
        console.error("JWT verification error:", error); // 👈 πρόσθεσε αυτό
        return res.status(401).json({ error: "Invalid or expired token" });
    } finally {
        if (connection) connection.release();
    }
}




module.exports = { login, register, logout, updatePassword };