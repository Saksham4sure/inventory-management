import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Download, Printer, Tag } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const QRViewerModal = ({ isOpen, onClose, product, currency = 'USD' }) => {
  if (!product) return null;

  const handleDownload = () => {
    if (!product.qrCodeImage) return;
    const link = document.createElement('a');
    link.href = product.qrCodeImage;
    link.download = `QR-${product.sku}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Label - ${product.sku}</title>
          <style>
            body {
              font-family: sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 24px;
              text-align: center;
            }
            .label-box {
              border: 2px dashed #000;
              padding: 20px;
              border-radius: 8px;
              display: inline-block;
            }
            h2 { margin: 0 0 8px 0; font-size: 20px; }
            p { margin: 4px 0; font-size: 14px; }
            img { width: 220px; height: 220px; margin: 12px 0; }
            .sku { font-weight: bold; font-family: monospace; font-size: 18px; letter-spacing: 2px; }
          </style>
        </head>
        <body>
          <div class="label-box">
            <h2>${product.name}</h2>
            <div class="sku">SKU: ${product.sku}</div>
            <img src="${product.qrCodeImage}" alt="QR Code" />
            <p><strong>Price:</strong> ${formatCurrency(product.sellingPrice, currency)}</p>
            <p style="font-size: 11px; color: #666;">Scan for Instant Purchase & Stock Verification</p>
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Product QR Code Label" maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 shadow-inner">
          {product.qrCodeImage ? (
            <img
              src={product.qrCodeImage}
              alt={`QR code for ${product.name}`}
              className="h-56 w-56 object-contain rounded-lg shadow-sm"
            />
          ) : (
            <div className="h-56 w-56 flex items-center justify-center text-slate-400">
              No QR Generated
            </div>
          )}
        </div>

        <div>
          <h4 className="text-lg font-bold text-slate-900">{product.name}</h4>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              <Tag className="h-3 w-3" /> {product.sku}
            </span>
            <span className="text-sm font-semibold text-indigo-600">
              {formatCurrency(product.sellingPrice, currency)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2 font-mono break-all px-2">
            Payload: {product.qrCodeData}
          </p>
        </div>

        <div className="flex w-full gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" /> Download PNG
          </Button>
          <Button variant="primary" className="flex-1" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print Label
          </Button>
        </div>
      </div>
    </Modal>
  );
};
