import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Download, Printer, Tag } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const QRViewerModal = ({ isOpen, onClose, product, currency = 'USD' }) => {
  if (!product) return null;

  const handleDownload = () => {
    if (!product.qrCodeImage) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Create high-resolution canvas for crisp printable label
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const width = 600;
      const height = 750;
      canvas.width = width;
      canvas.height = height;

      // Background - clean white card
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Card border
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#e4e4e7';
      ctx.beginPath();
      ctx.roundRect(16, 16, width - 32, height - 32, 24);
      ctx.stroke();

      // Product Name (truncated if too long)
      ctx.fillStyle = '#09090b';
      ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      let title = product.name || 'Product';
      if (ctx.measureText(title).width > 520) {
        while (ctx.measureText(title + '...').width > 520 && title.length > 0) {
          title = title.slice(0, -1);
        }
        title += '...';
      }
      ctx.fillText(title, width / 2, 75);

      // QR Code Image
      const qrSize = 400;
      const qrX = (width - qrSize) / 2;
      const qrY = 105;
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      // SKU / Code Below QR
      ctx.fillStyle = '#71717a';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`CODE: ${product.sku || product.qrCodeData || ''}`, width / 2, 545);

      // Price Below Code
      ctx.fillStyle = '#059669';
      ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const formattedPrice = formatCurrency(product.sellingPrice, currency);
      ctx.fillText(formattedPrice, width / 2, 605);

      // Small Branding / Footer
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Scan with StockPulse QR Scanner', width / 2, 655);

      // Download triggered
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `QR-${product.sku || 'label'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    img.src = product.qrCodeImage;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Label - ${product.sku}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 24px;
              color: #09090b;
            }
            .label {
              border: 1px dashed #71717a;
              border-radius: 12px;
              padding: 18px 24px;
              text-align: center;
              width: 260px;
            }
            h2 { margin: 0 0 6px 0; font-size: 16px; font-weight: 700; }
            .sku { font-family: monospace; font-size: 14px; color: #52525b; letter-spacing: 1px; margin-bottom: 8px; }
            img { width: 180px; height: 180px; margin: 6px 0; }
            .price { font-size: 16px; font-weight: 700; margin: 4px 0; color: #059669; }
            .footer { font-size: 10px; color: #a1a1aa; margin-top: 8px; }
          </style>
        </head>
        <body>
          <div class="label">
            <h2>${product.name}</h2>
            <div class="sku">SKU: ${product.sku}</div>
            <img src="${product.qrCodeImage}" alt="QR" />
            <div class="price">${formatCurrency(product.sellingPrice, currency)}</div>
            <div class="footer">Scan with StockPulse QR Scanner</div>
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
        {/* Crisp high-contrast QR display frame */}
        <div className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:border-white/[0.1]">
          {product.qrCodeImage ? (
            <img
              src={product.qrCodeImage}
              alt={`QR code for ${product.name}`}
              className="h-48 w-48 object-contain rounded-xl"
            />
          ) : (
            <div className="h-48 w-48 flex items-center justify-center text-zinc-400 text-xs font-medium">
              No QR code available
            </div>
          )}
        </div>

        <div>
          <h4 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {product.name}
          </h4>
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <span className="inline-flex items-center gap-1 font-mono text-xs font-medium px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-300 border border-black/[0.06] dark:border-white/[0.08]">
              <Tag className="h-3 w-3" /> {product.sku}
            </span>
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
              {formatCurrency(product.sellingPrice, currency)}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 font-mono break-all px-4">
            {product.qrCodeData}
          </p>
        </div>

        <div className="flex w-full gap-2.5 pt-2">
          <Button variant="secondary" className="flex-1 rounded-xl" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5 mr-1" /> Download
          </Button>
          <Button variant="primary" className="flex-1 rounded-xl" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5 mr-1" /> Print Label
          </Button>
        </div>
      </div>
    </Modal>
  );
};
export default QRViewerModal;
