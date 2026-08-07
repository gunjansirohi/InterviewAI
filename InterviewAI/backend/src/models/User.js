import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
  email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
  password: { type: String, required: [true, 'Password is required'], minlength: 8, select: false },
  profilePicture: { type: String, default: '', trim: true },
  createdAt: { type: Date, default: Date.now, immutable: true },
});

userSchema.set('toJSON', {
  transform: (_document, value) => {
    delete value.password;
    delete value.__v;
    return value;
  },
});

const User = mongoose.model('User', userSchema);

export default User;
