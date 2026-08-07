import bcrypt from 'bcrypt';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

const SALT_ROUNDS = 12;

export async function registerUser({ name, email, password, profilePicture }) {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.exists({ email: normalizedEmail });
  if (existingUser) {
    const error = new Error('An account with this email already exists');
    error.status = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name: name.trim(), email: normalizedEmail, password: hashedPassword, profilePicture });
  return { user, token: generateToken(user.id) };
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  user.password = undefined;
  return { user, token: generateToken(user.id) };
}
