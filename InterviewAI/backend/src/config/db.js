import mongoose from 'mongoose';

const connectionOptions = {
  // Atlas connections can take longer than 5 seconds while DNS and TLS are negotiated.
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

mongoose.set('bufferCommands', false);

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected successfully');
});

mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection failed:', getSafeMongoErrorMessage(error));
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
    if (!parsed.pathname || parsed.pathname === '/') return 'MONGODB_URI must include the database name (for example, /InterviewAI).';
  } catch {
    return 'MONGODB_URI is malformed. Copy a current connection string from MongoDB Atlas and URL-encode credential special characters.';
  }
  return '';
}

function getSafeMongoErrorMessage(error) {
  if (error?.code === 18) return 'Authentication failed. Verify the Atlas database user and password.';
  if (['ENOTFOUND', 'ESERVFAIL'].includes(error?.code)) {
    return 'Atlas DNS lookup failed. Verify the cluster hostname and DNS resolver.';
  }
  if (['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET'].includes(error?.code)) {
    return 'Atlas is unreachable. Verify that the cluster is running and its Network Access IP allowlist permits this environment.';
  }
  if (error?.name === 'MongooseServerSelectionError' || error?.name === 'MongoServerSelectionError') {
    return 'Atlas could not be reached. Verify the cluster is active, the hostname is current, and the Network Access IP allowlist permits this environment.';
  }
  return 'Unable to establish a database connection. Check the Atlas cluster, credentials, and network access settings.';
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
    console.error('MongoDB connection failed:', getSafeMongoErrorMessage(error));
    return false;
  }
}
