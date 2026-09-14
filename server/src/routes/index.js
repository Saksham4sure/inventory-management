import { Router } from 'express';
import authRoutes from './auth.routes.js';
import businessRoutes from './business.routes.js';
import productRoutes from './product.routes.js';
import transactionRoutes from './transaction.routes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/business', businessRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/transactions', transactionRoutes);

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Inventory QR Management API',
  });
});

export default apiRouter;
