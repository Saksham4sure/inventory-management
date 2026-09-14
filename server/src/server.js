import app from './app.js';
import { connectDB } from './config/db.js';
import { ENV } from './config/env.js';

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  // Start HTTP listener
  app.listen(ENV.PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 Inventory API Server running on port ${ENV.PORT}`);
    console.log(`🌐 Health check: http://localhost:${ENV.PORT}/api/health`);
    console.log(`⚡ Environment: ${ENV.NODE_ENV}`);
    console.log(`=========================================`);
  });
};

startServer();
