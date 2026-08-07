import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export default async function protect(req, res, next) {
  try {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) return res.status(401).json({ status: 'error', message: 'Authentication token is required' });
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ status: 'error', message: 'User no longer exists' });

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ status: 'error', message: 'Invalid or expired authentication token' });
    }
    return next(error);
  }
}
