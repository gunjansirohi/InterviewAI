import { loginUser, registerUser } from '../services/authService.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCredentials(body, includeName = false) {
  const errors = [];
  if (includeName && (typeof body.name !== 'string' || body.name.trim().length < 2)) errors.push('Name must contain at least 2 characters');
  if (typeof body.email !== 'string' || !emailPattern.test(body.email.trim())) errors.push('A valid email is required');
  if (typeof body.password !== 'string' || body.password.length < 8) errors.push('Password must contain at least 8 characters');
  return errors;
}

export async function register(req, res, next) {
  try {
    const errors = validateCredentials(req.body, true);
    if (errors.length) return res.status(400).json({ status: 'error', message: 'Validation failed', errors });
    const result = await registerUser(req.body);
    return res.status(201).json({ status: 'success', ...result });
  } catch (error) {
    if (error.code === 11000) {
      error.status = 409;
      error.message = 'An account with this email already exists';
    }
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const errors = validateCredentials(req.body);
    if (errors.length) return res.status(400).json({ status: 'error', message: 'Validation failed', errors });
    const result = await loginUser(req.body);
    return res.status(200).json({ status: 'success', ...result });
  } catch (error) {
    return next(error);
  }
}

export function profile(req, res) {
  return res.status(200).json({ status: 'success', user: req.user });
}
