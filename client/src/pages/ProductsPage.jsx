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
    if (!window.confirm(`Delete "${name}" from inventory?`)) return;
    try {
      await productService.deleteProduct(id);
      fetchProducts();
    } catch (err) {
      alert(err.message || 'Failed to delete product');
    }
  };

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
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Products & Inventory
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Manage catalog items, stock quantities, and QR identification tags
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Product
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50/80 border border-rose-200/80 p-3.5 text-xs text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/40 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card compact className="p-3 sm:p-4">
        <div className="flex flex-col md:flex-row items-center gap-2.5 sm:gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by product name, SKU, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-zinc-200/90 bg-white dark:bg-zinc-900 dark:border-zinc-800 pl-9 pr-4 py-1.5 sm:py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg border border-zinc-200/90 bg-white dark:bg-zinc-900 dark:border-zinc-800 px-2.5 py-1.5 sm:py-2 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300 cursor-pointer select-none bg-zinc-100/60 dark:bg-zinc-850 px-2.5 py-1.5 sm:py-2 rounded-lg border border-zinc-200/80 dark:border-zinc-800">
              <input
                type="checkbox"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
              />
              <span className="text-[11px] font-medium">Low Stock</span>
            </label>

            <Button
              variant="secondary"
              size="sm"
              onClick={fetchProducts}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Products Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-zinc-50/80 dark:bg-zinc-850/80 border-b border-zinc-200/80 dark:border-zinc-800 text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              <tr>
                <th className="px-4 sm:px-6 py-3">Product & SKU</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3">Selling Price</th>
                <th className="px-4 py-3">Current Stock</th>
                <th className="px-4 py-3 text-center">QR Tag</th>
                <th className="px-4 sm:px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {products.length > 0 ? (
                products.map((prod) => {
                  const badge = formatStockBadge(prod.currentStock, prod.minStockLevel);
                  return (
                    <tr
                      key={prod._id}
                      className="hover:bg-zinc-50/60 dark:hover:bg-zinc-850/60 transition-colors"
                    >
                      <td className="px-4 sm:px-6 py-3.5">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {prod.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-400">
                          <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300">
                            {prod.sku}
                          </span>
                          {prod.barcode && <span>• Barcode: {prod.barcode}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {prod.category}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono text-zinc-500 dark:text-zinc-400">
                        {formatCurrency(prod.costPrice, currency)}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold font-mono text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(prod.sellingPrice, currency)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold font-mono text-zinc-900 dark:text-zinc-100">
                            {prod.currentStock} {prod.unit}
                          </span>
                          <span
                            className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded border ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 block mt-0.5">
                          Alert at: {prod.minStockLevel} {prod.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedProductForQR(prod)}
                          title="View QR Label"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/15 px-2.5 py-1 rounded-md border border-emerald-500/20 transition-all active:scale-95"
                        >
                          <QrCode className="h-3.5 w-3.5" /> View QR
                        </button>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-right">
                        <button
                          onClick={() => handleDeleteProduct(prod._id, prod.name)}
                          className="rounded-lg p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-zinc-400 dark:text-zinc-500">
                    {loading ? (
                      <p className="text-xs">Loading items...</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          No products found
                        </p>
                        <p className="text-xs text-zinc-400">
                          Add a product to generate verifiable QR codes
                        </p>
                        <Button
                          variant="primary"
                          size="sm"
                          className="mt-1"
                          onClick={() => setIsAddModalOpen(true)}
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" /> Add Product
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
        title="Add Inventory Product"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateProduct} className="space-y-3.5">
          <Input
            label="Product Name"
            id="pname"
            placeholder="e.g. Wireless Barcode Scanner"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-medium tracking-wide uppercase text-zinc-500 dark:text-zinc-400">
                  SKU <span className="text-emerald-600 dark:text-emerald-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoSKU}
                  className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Generate
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="e.g. SCAN-101"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                className="w-full uppercase font-mono rounded-lg border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium tracking-wide uppercase text-zinc-500 dark:text-zinc-400 mb-1">
                Category
              </label>
              <input
                type="text"
                placeholder="e.g. Electronics"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-lg border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/15"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <Input
              label={`Cost (${currency})`}
              id="costPrice"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.costPrice}
              onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
            />
            <Input
              label={`Price (${currency})`}
              id="sellingPrice"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
            />
            <Input
              label="Unit"
              id="unit"
              type="text"
              placeholder="pcs, kg"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Initial Stock"
              id="currentStock"
              type="number"
              placeholder="0"
              value={formData.currentStock}
              onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
            />
            <Input
              label="Low Alert Level"
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

          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 p-2.5 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>A scannable QR Code and physical print label are generated upon creation.</span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            <Button variant="secondary" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting}>
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
