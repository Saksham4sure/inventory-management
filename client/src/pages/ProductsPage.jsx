import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../hooks/useBusiness';
import { useConfirm } from '../hooks/useConfirm';
import { useSnackbar } from '../hooks/useSnackbar';
import { productService } from '../services/productService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
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
  ChevronRight,
  Package,
} from 'lucide-react';

export const ProductsPage = () => {
  const { business } = useBusiness();
  const currency = business?.currency || 'USD';
  const { confirm, alert } = useConfirm();
  const { showSuccess, showError } = useSnackbar();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Detail popup state (for rich mobile tap experience!)
  const [activeDetailProduct, setActiveDetailProduct] = useState(null);

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
      showError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, showLowStockOnly, showError]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await productService.createProduct(formData);
      showSuccess(`Product "${formData.name}" added to inventory`);
      setIsAddModalOpen(false);
      setFormData(initialFormState);
      fetchProducts();
    } catch (err) {
      const msg = err.message || 'Failed to create product';
      setError(msg);
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id, name) => {
    const isConfirmed = await confirm({
      title: 'Delete Product',
      message: `Delete "${name}" from inventory? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!isConfirmed) return;

    try {
      await productService.deleteProduct(id);
      showSuccess(`Product "${name}" deleted`);
      setActiveDetailProduct(null);
      fetchProducts();
    } catch (err) {
      showError(err.message || 'Failed to delete product');
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Products & Inventory
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {products.length} catalog items with live stock counts and QR tags
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchProducts} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Product
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card compact className="p-3.5">
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name, SKU, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-black/[0.08] bg-black/[0.025] pl-10 pr-3 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:bg-white/[0.05] dark:border-white/[0.08] focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-700 dark:focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/25 dark:focus:ring-zinc-600/30 transition-all"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <Filter className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <div className="w-full sm:w-36">
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  options={categories}
                  compact
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300 cursor-pointer select-none bg-black/[0.03] dark:bg-white/[0.06] px-3 py-2 rounded-xl border border-black/[0.06] dark:border-white/[0.08] shrink-0 transition-colors">
              <input
                type="checkbox"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
                className="rounded-md text-zinc-900 focus:ring-zinc-400 h-3.5 w-3.5 accent-zinc-800 dark:accent-zinc-200"
              />
              <span className="text-[11px] font-semibold">Low Stock</span>
            </label>
          </div>
        </div>
      </Card>

      {/* RICH MOBILE CARD LIST (Optimized for phone screens: compact row with tap for full details!) */}
      <div className="block lg:hidden space-y-2.5">
        {products.length > 0 ? (
          products.map((prod) => {
            const badge = formatStockBadge(prod.currentStock, prod.minStockLevel);
            return (
              <div
                key={prod._id}
                onClick={() => setActiveDetailProduct(prod)}
                className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900 active:scale-[0.99] transition-all cursor-pointer shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* QR Thumbnail icon button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProductForQR(prod);
                    }}
                    title="View QR Label"
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white shrink-0"
                  >
                    <QrCode className="h-5 w-5" />
                  </button>

                  <div className="min-w-0">
                    <h3 className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {prod.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono mt-0.5">
                      <span>{prod.sku}</span>
                      <span>•</span>
                      <span className="text-zinc-500">{prod.category}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-2">
                  <div className="font-bold font-mono text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(prod.sellingPrice, currency)}
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span
                      className={`inline-flex px-1.5 py-0.2 text-[10px] font-medium rounded border ${badge.color}`}
                    >
                      {prod.currentStock} {prod.unit}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center text-zinc-400 dark:text-zinc-500">
            <Package className="h-8 w-8 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
            <p className="text-xs font-medium">No items found</p>
          </div>
        )}
      </div>

      {/* DESKTOP TABLE VIEW (Visible on larger screens >= lg) */}
      <Card className="hidden lg:block overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50/80 dark:bg-zinc-850/80 border-b border-zinc-200/80 dark:border-zinc-800 text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              <tr>
                <th className="px-6 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Cost Price</th>
                <th className="px-4 py-3">Selling Price</th>
                <th className="px-4 py-3">Stock Level</th>
                <th className="px-4 py-3 text-center">QR Label</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {products.length > 0 ? (
                products.map((prod) => {
                  const badge = formatStockBadge(prod.currentStock, prod.minStockLevel);
                  return (
                    <tr
                      key={prod._id}
                      onClick={() => setActiveDetailProduct(prod)}
                      className="hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer"
                    >
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {prod.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-400">
                          <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                            {prod.sku}
                          </span>
                          {prod.barcode && <span>• {prod.barcode}</span>}
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
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProductForQR(prod);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-700 bg-black/[0.04] hover:bg-black/[0.08] dark:text-zinc-300 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] px-2.5 py-1 rounded-md border border-black/[0.06] dark:border-white/[0.08] transition-all"
                        >
                          <QrCode className="h-3.5 w-3.5" /> View QR
                        </button>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProduct(prod._id, prod.name);
                          }}
                          className="rounded-lg p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-zinc-400">
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* RICH PRODUCT DETAIL MODAL / POPUP (For phones and desktop inspection!) */}
      <Modal
        isOpen={Boolean(activeDetailProduct)}
        onClose={() => setActiveDetailProduct(null)}
        title="Product Specifications"
        maxWidth="max-w-md"
      >
        {activeDetailProduct && (
          <div className="space-y-4">
            {/* Top header strip */}
            <div className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {activeDetailProduct.category}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {activeDetailProduct.name}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400 font-mono">
                  <span>SKU: {activeDetailProduct.sku}</span>
                  {activeDetailProduct.barcode && <span>• {activeDetailProduct.barcode}</span>}
                </div>
              </div>

              {activeDetailProduct.qrCodeImage && (
                <button
                  type="button"
                  onClick={() => setSelectedProductForQR(activeDetailProduct)}
                  className="shrink-0 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:opacity-80"
                  title="Enlarge QR"
                >
                  <img
                    src={activeDetailProduct.qrCodeImage}
                    alt="QR"
                    className="h-12 w-12 object-contain"
                  />
                </button>
              )}
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-850/70">
                <span className="text-[10px] uppercase font-medium text-zinc-400 block">
                  Current Stock
                </span>
                <div className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {activeDetailProduct.currentStock} {activeDetailProduct.unit}
                </div>
                <span className="text-[10px] text-zinc-400 mt-0.5 block">
                  Alert limit: {activeDetailProduct.minStockLevel} {activeDetailProduct.unit}
                </span>
              </div>

              <div className="p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-850/70">
                <span className="text-[10px] uppercase font-medium text-zinc-400 block">
                  Selling Price
                </span>
                <div className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {formatCurrency(activeDetailProduct.sellingPrice, currency)}
                </div>
                <span className="text-[10px] text-zinc-400 mt-0.5 block">
                  Cost: {formatCurrency(activeDetailProduct.costPrice, currency)}
                </span>
              </div>
            </div>

            {activeDetailProduct.description && (
              <div className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-850 p-2.5 rounded-lg">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Description: </span>
                {activeDetailProduct.description}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={() => setSelectedProductForQR(activeDetailProduct)}
              >
                <QrCode className="h-3.5 w-3.5 mr-1" /> View & Print QR Label
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={() =>
                  handleDeleteProduct(activeDetailProduct._id, activeDetailProduct.name)
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Inventory Item"
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
                  SKU <span className="text-zinc-400 dark:text-zinc-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoSKU}
                  className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline"
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
                className="w-full uppercase font-mono rounded-lg border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-700 dark:focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/25 dark:focus:ring-zinc-600/30"
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
                className="w-full rounded-lg border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-700 dark:focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/25 dark:focus:ring-zinc-600/30"
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

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            <Button variant="secondary" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting}>
              Save & Generate QR
            </Button>
          </div>
        </form>
      </Modal>

      {/* QR Viewer Modal */}
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
