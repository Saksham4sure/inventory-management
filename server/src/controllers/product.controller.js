import { Product } from '../models/product.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateProductQR, parseQRPayload } from '../services/qr.service.js';

export const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    sku,
    category,
    description,
    costPrice,
    sellingPrice,
    currentStock,
    minStockLevel,
    unit,
    barcode,
    productType = 'NON_BIODEGRADABLE',
    manufacturedDate,
    expiryDate,
  } = req.body;

  if (!name || !sku) {
    throw new ApiError(400, 'Product name and SKU are required');
  }

  const normalizedSku = sku.toUpperCase().trim();

  // Check unique SKU for this business
  const existingProduct = await Product.findOne({
    businessId: req.user.businessId,
    sku: normalizedSku,
  });

  if (existingProduct) {
    throw new ApiError(409, `Product with SKU "${normalizedSku}" already exists in your inventory`);
  }

  // Validate dates if product is biodegradable
  const isBio = productType === 'BIODEGRADABLE';
  let mfgDateObj = null;
  let expDateObj = null;

  if (isBio) {
    if (!manufacturedDate || !expiryDate) {
      throw new ApiError(
        400,
        'Manufactured date and Expiry date are required for biodegradable products'
      );
    }
    mfgDateObj = new Date(manufacturedDate);
    expDateObj = new Date(expiryDate);
    if (isNaN(mfgDateObj.getTime()) || isNaN(expDateObj.getTime())) {
      throw new ApiError(400, 'Invalid manufactured or expiry date format');
    }
    if (expDateObj <= mfgDateObj) {
      throw new ApiError(400, 'Expiry date must be after manufactured date');
    }
  }

  // Generate QR Code payload and image
  const { qrCodeData, qrCodeImage } = await generateProductQR(
    req.user.businessId.toString(),
    normalizedSku
  );

  const product = await Product.create({
    businessId: req.user.businessId,
    name: name.trim(),
    sku: normalizedSku,
    qrCodeData,
    qrCodeImage,
    barcode: barcode ? barcode.trim() : '',
    category: category ? category.trim() : 'General',
    description: description ? description.trim() : '',
    costPrice: Number(costPrice) || 0,
    sellingPrice: Number(sellingPrice) || 0,
    currentStock: Number(currentStock) || 0,
    minStockLevel: minStockLevel !== undefined ? Number(minStockLevel) : 5,
    unit: unit ? unit.trim() : 'pcs',
    productType: isBio ? 'BIODEGRADABLE' : 'NON_BIODEGRADABLE',
    manufacturedDate: mfgDateObj,
    expiryDate: expDateObj,
    createdBy: req.user._id,
  });

  res.status(201).json(new ApiResponse(201, { product }, 'Product created with QR code'));
});

export const getProducts = asyncHandler(async (req, res) => {
  const { search, category, lowStock, excludeQR, page = 1, limit = 50 } = req.query;

  const filter = { businessId: req.user.businessId };

  if (category && category !== 'All') {
    filter.category = category;
  }

  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: searchRegex }, { sku: searchRegex }, { barcode: searchRegex }];
  }

  if (lowStock === 'true') {
    filter.$expr = { $lte: ['$currentStock', '$minStockLevel'] };
  }

  const skip = (Number(page) - 1) * Number(limit);

  let query = Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean();
  if (excludeQR === 'true') {
    query = query.select('-qrCodeImage');
  }

  const [products, total] = await Promise.all([
    query,
    Product.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        products,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)) || 1,
        },
      },
      'Products retrieved successfully'
    )
  );
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    businessId: req.user.businessId,
  });

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  res.status(200).json(new ApiResponse(200, { product }, 'Product details retrieved'));
});

export const getProductByQR = asyncHandler(async (req, res) => {
  const { qrPayload } = req.body;

  if (!qrPayload) {
    throw new ApiError(400, 'QR payload or SKU code is required');
  }

  const parsed = parseQRPayload(qrPayload);
  const sku = parsed ? parsed.sku.toUpperCase() : qrPayload.toUpperCase().trim();

  // Search by exact QR payload or SKU inside this business
  const product = await Product.findOne({
    businessId: req.user.businessId,
    $or: [{ qrCodeData: qrPayload.trim() }, { sku: sku }, { barcode: qrPayload.trim() }],
  });

  if (!product) {
    throw new ApiError(404, `No product found matching code "${qrPayload}"`);
  }

  res.status(200).json(new ApiResponse(200, { product }, 'Product found via QR scan'));
});

export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    sku,
    category,
    description,
    costPrice,
    sellingPrice,
    currentStock,
    minStockLevel,
    unit,
    barcode,
    productType,
    manufacturedDate,
    expiryDate,
  } = req.body;

  const product = await Product.findOne({
    _id: id,
    businessId: req.user.businessId,
  });

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  if (name) product.name = name.trim();
  if (category) product.category = category.trim();
  if (description !== undefined) product.description = description.trim();
  if (costPrice !== undefined) product.costPrice = Number(costPrice);
  if (sellingPrice !== undefined) product.sellingPrice = Number(sellingPrice);
  if (currentStock !== undefined) product.currentStock = Number(currentStock);
  if (minStockLevel !== undefined) product.minStockLevel = Number(minStockLevel);
  if (unit) product.unit = unit.trim();
  if (barcode !== undefined) product.barcode = barcode.trim();
  if (productType) {
    product.productType = productType === 'BIODEGRADABLE' ? 'BIODEGRADABLE' : 'NON_BIODEGRADABLE';
  }
  if (manufacturedDate !== undefined) {
    product.manufacturedDate = manufacturedDate ? new Date(manufacturedDate) : null;
  }
  if (expiryDate !== undefined) {
    product.expiryDate = expiryDate ? new Date(expiryDate) : null;
  }

  // If SKU is changed, check uniqueness and regenerate QR code
  if (sku && sku.toUpperCase().trim() !== product.sku) {
    const newSku = sku.toUpperCase().trim();
    const existing = await Product.findOne({
      businessId: req.user.businessId,
      sku: newSku,
      _id: { $ne: id },
    });
    if (existing) {
      throw new ApiError(409, `Product with SKU "${newSku}" already exists`);
    }
    product.sku = newSku;
    const { qrCodeData, qrCodeImage } = await generateProductQR(
      req.user.businessId.toString(),
      newSku
    );
    product.qrCodeData = qrCodeData;
    product.qrCodeImage = qrCodeImage;
  }

  await product.save();

  res.status(200).json(new ApiResponse(200, { product }, 'Product updated successfully'));
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findOneAndDelete({
    _id: id,
    businessId: req.user.businessId,
  });

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  res.status(200).json(new ApiResponse(200, null, 'Product deleted successfully'));
});
