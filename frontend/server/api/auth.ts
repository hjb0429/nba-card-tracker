import { Router } from 'express';
import { Database } from 'sql.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth';

export function createAuthRoutes(db: Database, saveFn: () => void): Router {
  function save() { saveFn(); }
  const router = Router();

  // POST /api/auth/register
  router.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: '用户名和密码不能为空' });
      return;
    }
    if (password.length < 4) {
      res.status(400).json({ error: '密码至少4位' });
      return;
    }

    const existing = db.exec('SELECT id FROM users WHERE username = ?', [username]);
    if (existing[0] && existing[0].values.length > 0) {
      res.status(409).json({ error: '用户名已存在' });
      return;
    }

    const hashed = bcrypt.hashSync(password, 10);
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashed]);

    const result = db.exec('SELECT last_insert_rowid() as id');
    const userId = result[0].values[0][0] as number;

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
    save();
    res.status(201).json({ token, userId, username });
  });

  // POST /api/auth/login
  router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: '用户名和密码不能为空' });
      return;
    }

    const result = db.exec('SELECT id, username, password FROM users WHERE username = ?', [username]);
    if (!result[0] || result[0].values.length === 0) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    const [id, name, hashed] = result[0].values[0];

    if (!bcrypt.compareSync(password, hashed as string)) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    const token = jwt.sign({ userId: id as number }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, userId: id, username: name });
  });

  return router;
}
