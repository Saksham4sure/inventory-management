import { Router } from 'express';
import authRoutes from './auth.routes.js';
import businessRoutes from './business.routes.js';
import productRoutes from './product.routes.js';
import transactionRoutes from './transaction.routes.js';
import partyRoutes from './party.routes.js';
import teamRoutes from './team.routes.js';
import notificationRoutes from './notification.routes.js';
import adminRoutes from './admin.routes.js';
import expenseRoutes from './expense.routes.js';
import { getPublicPlans } from '../controllers/admin.controller.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/business', businessRoutes);
apiRouter.use('/team', teamRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/transactions', transactionRoutes);
apiRouter.use('/parties', partyRoutes);
apiRouter.use('/expenses', expenseRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.get('/plans', getPublicPlans);

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Inventory QR Management API',
  });
});

export default apiRouter;
