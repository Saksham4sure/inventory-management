import QRCode from 'qrcode';

/**
 * Generates structured QR payload and base64 PNG data URL
 */
export const generateProductQR = async (businessId, sku) => {
  // Format payload with standard prefix for reliability when scanned
  const qrPayload = `INV:${businessId}:${sku.toUpperCase()}`;

  const qrImage = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 8,
    color: {
      dark: '#000000', // pure pitch black for maximum contrast and readability
      light: '#ffffff',
    },
  });

  return {
    qrCodeData: qrPayload,
    qrCodeImage: qrImage,
  };
};

/**
 * Parses scanned QR text into businessId and SKU
 */
export const parseQRPayload = (rawText) => {
  if (!rawText) return null;
  const trimmed = rawText.trim();

  // Pattern: INV:<businessId>:<sku>
  if (trimmed.startsWith('INV:')) {
    const parts = trimmed.split(':');
    if (parts.length >= 3) {
      return {
        businessId: parts[1],
        sku: parts.slice(2).join(':'),
      };
    }
  }

  // Fallback if raw text is simply the SKU itself
  return {
    businessId: null,
    sku: trimmed,
  };
};
