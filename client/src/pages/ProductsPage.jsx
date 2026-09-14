import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../hooks/useBusiness';
import { productService } from '../services/productService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { QRViewerModal } from '../components/common/QRViewerModal';
import { formatCurrency, formatStockBadge } from '../utils/formatters';
import {
  Plus,
  Search,
  QrCode,
  Trash2,
  Filter,
  RefreshCw,
  AlertCircle,
  Tag,
} from 'lucide-react';

export const ProductsPage = () => {
  const { business } = useBusiness();
  const currency = business?.currency || 'USD';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProductForQR, setSelectedProductForQR] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // New product form
  const initialFormState = {
    name: '',
    sku: '',
    category: 'General',
    unit: 'pcs',
    costPrice: '',
    sellingPrice: '',
    currentStock: '',
    minStockLevel: '5',
    barcode: '',
    description: '',
  };
  const [formData, setFormData] = useState(initialFormState);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (search) params.search = search;
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (showLowStockOnly) params.lowStock = 'true';

      const data = await productService.getProducts(params);
      setProducts(data.products || []);
    } catch (err) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, showLowStockOnly]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await productService.createProduct(formData);
      setIsAddModalOpen(false);
      setFormData(initialFormState);
      fetchProducts();
    } catch (err) {
      setError(err.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await productService.deleteProduct(id);
      fetchProducts();
    } catch (err) {
      alert(err.message || 'Failed to delete product');
    }
  };

  // Generate suggested SKU
  const handleAutoSKU = () => {
    const prefix = formData.name
      ? formData.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'PRD')
      : 'PRD';
    const rand = Math.floor(100 + Math.random() * 900);
    setFormData((prev) => ({ ...prev, sku: `${prefix}-${rand}` }));
  };

  const categories = [
    'All',
    'General',
    'Electronics',
    'Apparel',
    'Groceries',
    'Hardware',
    'Stationery',
    'Cosmetics',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Products & Inventory
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage your items, current stock levels, and QR code tracking identifiers
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Add New Product
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by product name, SKU, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
              <input
                type="checkbox"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span>Low Stock Only</span>
            </label>

            <Button
              variant="secondary"
              size="sm"
              onClick={fetchProducts}
              disabled={loading}
              title="Refresh product list"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Products Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Product & SKU</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Cost Price</th>
                <th className="px-6 py-3.5">Selling Price</th>
                <th className="px-6 py-3.5">Stock Level</th>
                <th className="px-6 py-3.5 text-center">QR Code</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.length > 0 ? (
                products.map((prod) => {
                  const badge = formatStockBadge(prod.currentStock, prod.minStockLevel);
                  return (
                    <tr key={prod._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{prod.name}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {prod.sku}
                          </span>
                          {prod.barcode && <span>• Barcode: {prod.barcode}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {prod.category}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {formatCurrency(prod.costPrice, currency)}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-900">
                        {formatCurrency(prod.sellingPrice, currency)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">
                            {prod.currentStock} {prod.unit}
                          </span>
                          <span
                            className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full border ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Min alert: {prod.minStockLevel} {prod.unit}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedProductForQR(prod)}
                          title="View and print QR label"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors"
                        >
                          <QrCode className="h-4 w-4" /> View QR
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteProduct(prod._id, prod.name)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    {loading ? (
                      <p className="text-sm">Loading catalog...</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-base font-semibold text-slate-700">No products found</p>
                        <p className="text-xs text-slate-500">
                          Add your first product to generate unique tracking QR codes
                        </p>
                        <Button
                          variant="primary"
                          size="sm"
                          className="mt-2"
                          onClick={() => setIsAddModalOpen(true)}
                        >
                          <Plus className="mr-1.5 h-4 w-4" /> Add Product Now
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Inventory Product"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <Input
            label="Product Name"
            id="pname"
            placeholder="e.g. Wireless Barcode Scanner"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  SKU (Stock Keeping Unit) <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoSKU}
                  className="text-[11px] font-semibold text-indigo-600 hover:underline"
                >
                  Generate SKU
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="e.g. SCAN-001"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                className="w-full uppercase font-mono rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Category
              </label>
              <input
                type="text"
                placeholder="e.g. Electronics"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label={`Cost Price (${currency})`}
              id="costPrice"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.costPrice}
              onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
            />
            <Input
              label={`Selling Price (${currency})`}
              id="sellingPrice"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
            />
            <Input
              label="Unit of Measure"
              id="unit"
              type="text"
              placeholder="pcs, kg, box"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Opening Stock Quantity"
              id="currentStock"
              type="number"
              placeholder="0"
              value={formData.currentStock}
              onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
            />
            <Input
              label="Low Stock Alert Threshold"
              id="minStockLevel"
              type="number"
              placeholder="5"
              value={formData.minStockLevel}
              onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
            />
          </div>

          <Input
            label="Barcode (Optional)"
            id="barcode"
            placeholder="e.g. 890123456789"
            value={formData.barcode}
            onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
          />

          <div className="rounded-lg bg-indigo-50/70 border border-indigo-100 p-3 text-xs text-indigo-800 flex items-center gap-2">
            <Tag className="h-4 w-4 shrink-0 text-indigo-600" />
            <span>
              A unique, verifiable QR Code will be created automatically upon saving this item.
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Save Product & Generate QR
            </Button>
          </div>
        </form>
      </Modal>

      {/* QR Code Viewer Modal */}
      <QRViewerModal
        isOpen={Boolean(selectedProductForQR)}
        onClose={() => setSelectedProductForQR(null)}
        product={selectedProductForQR}
        currency={currency}
      />
    </div>
  );
};
export default ProductsPage;
