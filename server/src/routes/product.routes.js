import { Router } from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  getProductByQR,
  updateProduct,
  deleteProduct,
} from '../controllers/product.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireBusiness } from '../middlewares/business.middleware.js';

const router = Router();

router.use(authenticate, requireBusiness);

router.get('/', getProducts);
router.post('/', createProduct);
router.post('/qr-lookup', getProductByQR);
router.get('/:id', getProductById);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;
