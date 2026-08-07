import mongoose from 'mongoose';

const connectionOptions = {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

mongoose.set('bufferCommands', false);

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected.');
});

mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', {
    name: error.name,
    code: error.code,
    message: error.message,
  });
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Database-backed features are unavailable.');
});

function validateMongoUri(uri) {
  if (!uri) return 'MONGODB_URI is not configured.';
  if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) return 'MONGODB_URI must start with mongodb:// or mongodb+srv://.';
  try {
    const parsed = new URL(uri);
    if (!parsed.hostname) return 'MONGODB_URI does not contain a database host.';
    if (parsed.protocol === 'mongodb+srv:' && parsed.port) return 'mongodb+srv:// URIs must not include a port.';
  } catch {
    return 'MONGODB_URI is malformed. Copy a current connection string from MongoDB Atlas and URL-encode credential special characters.';
  }
  return '';
}

export function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

export default async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  const validationError = validateMongoUri(uri);
  if (validationError) {
    console.error('MongoDB configuration error:', validationError);
    return false;
  }

  try {
    await mongoose.connect(uri, connectionOptions);
    return true;
  } catch (error) {
    console.error('MongoDB initial connection failed; starting API in degraded mode:', {
      name: error.name,
      code: error.code,
      message: error.message,
      hint: error.code === 'ESERVFAIL' || error.code === 'ENOTFOUND'
        ? 'Atlas SRV DNS lookup failed. Verify the Atlas hostname and local DNS resolver.'
        : undefined,
    });
    return false;
  }
}
