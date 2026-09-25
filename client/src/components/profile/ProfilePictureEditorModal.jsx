import { useState, useRef, useEffect, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  RefreshCw,
  Upload,
  Check,
  Move,
} from 'lucide-react';

export const ProfilePictureEditorModal = ({
  isOpen,
  onClose,
  imageSrc,
  onSave,
  onChangeImage,
  loading = false,
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageObjRef = useRef(null);

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState('');

  const VIEW_SIZE = 320; // 320x320 viewport
  const EXPORT_SIZE = 512; // 512x512 export resolution

  // Load image whenever imageSrc changes
  useEffect(() => {
    if (!imageSrc || !isOpen) {
      setImageLoaded(false);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageObjRef.current = img;
      setImageLoaded(true);
      // Reset adjustments on fresh image
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    };
    img.onerror = () => {
      // Retry without anonymous crossOrigin if it failed
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        imageObjRef.current = fallbackImg;
        setImageLoaded(true);
        setZoom(1);
        setRotation(0);
        setPan({ x: 0, y: 0 });
      };
      fallbackImg.src = imageSrc;
    };
    img.src = imageSrc;
  }, [imageSrc, isOpen]);

  // Draw current frame onto visible canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, VIEW_SIZE, VIEW_SIZE);

    // Calculate base scale so image fills the circular crop area (diameter: VIEW_SIZE)
    const minDim = Math.min(img.naturalWidth, img.naturalHeight);
    const baseScale = VIEW_SIZE / (minDim || 1);
    const currentScale = baseScale * zoom;

    ctx.save();
    // Center point of canvas
    ctx.translate(VIEW_SIZE / 2 + pan.x, VIEW_SIZE / 2 + pan.y);
    // Rotation
    ctx.rotate((rotation * Math.PI) / 180);
    // Scale
    ctx.scale(currentScale, currentScale);
    // Draw centered
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    // Update live preview thumbnail
    try {
      setPreviewDataUrl(canvas.toDataURL('image/jpeg', 0.8));
    } catch {
      // Ignore if tainted in preview
    }
  }, [imageLoaded, zoom, rotation, pan]);

  useEffect(() => {
    if (imageLoaded) {
      drawCanvas();
    }
  }, [imageLoaded, drawCanvas]);

  // Mouse drag handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch drag handlers
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prev) => Math.min(3, Math.max(1, +(prev + delta).toFixed(2))));
  };

  // Reset adjustments
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Export high-res cropped image
  const handleSave = () => {
    const img = imageObjRef.current;
    if (!img) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = EXPORT_SIZE;
    exportCanvas.height = EXPORT_SIZE;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // High quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Scale factor from view size (320) to export size (512)
    const factor = EXPORT_SIZE / VIEW_SIZE;

    const minDim = Math.min(img.naturalWidth, img.naturalHeight);
    const baseScale = EXPORT_SIZE / (minDim || 1);
    const currentScale = baseScale * zoom;

    ctx.save();
    ctx.translate(EXPORT_SIZE / 2 + pan.x * factor, EXPORT_SIZE / 2 + pan.y * factor);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(currentScale, currentScale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    try {
      const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.92);
      onSave(dataUrl);
    } catch {
      // If tainted or error, fallback to original image
      onSave(imageSrc);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit & Adjust Profile Picture"
      maxWidth="max-w-md"
    >
      <div className="space-y-5 select-none">
        {/* Viewport container with circular crop guide */}
        <div className="flex flex-col items-center">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            className={`relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] rounded-3xl overflow-hidden bg-zinc-950 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 touch-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            {/* The dynamic canvas */}
            <canvas
              ref={canvasRef}
              width={VIEW_SIZE}
              height={VIEW_SIZE}
              className="w-full h-full object-contain"
            />

            {/* Circular mask overlay with darkened outer border */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
            >
              <defs>
                <mask id="profile-crop-mask">
                  {/* Fill white everywhere */}
                  <rect width="100%" height="100%" fill="white" />
                  {/* Cut out black circle in center */}
                  <circle
                    cx={VIEW_SIZE / 2}
                    cy={VIEW_SIZE / 2}
                    r={VIEW_SIZE / 2 - 12}
                    fill="black"
                  />
                </mask>
              </defs>
              {/* Semi-transparent dark overlay covering outside the circle */}
              <rect
                width="100%"
                height="100%"
                fill="rgba(0, 0, 0, 0.65)"
                mask="url(#profile-crop-mask)"
              />
              {/* Crisp border ring around circular crop zone */}
              <circle
                cx={VIEW_SIZE / 2}
                cy={VIEW_SIZE / 2}
                r={VIEW_SIZE / 2 - 12}
                fill="none"
                stroke="rgba(255, 255, 255, 0.75)"
                strokeWidth="2"
                strokeDasharray={isDragging ? '4 4' : 'none'}
              />
            </svg>

            {/* Subtle drag hint */}
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-zinc-300 font-medium flex items-center gap-1 pointer-events-none">
              <Move className="w-2.5 h-2.5" />
              <span>Drag to center</span>
            </div>
          </div>
        </div>

        {/* Adjustments Toolbar */}
        <div className="space-y-3.5 bg-zinc-50 dark:bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
          {/* Zoom Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-600 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <ZoomIn className="w-3.5 h-3.5" /> Zoom
              </span>
              <span className="font-mono text-[11px] text-zinc-800 dark:text-zinc-200">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(1, +(prev - 0.2).toFixed(2)))}
                aria-label="Zoom out"
                className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-zinc-900 dark:accent-white cursor-pointer h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none"
              />
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(3, +(prev + 0.2).toFixed(2)))}
                aria-label="Zoom in"
                className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Symmetrical Quick Action Buttons (Rotate -90, Rotate +90, Reset, Change) */}
          <div className="grid grid-cols-4 gap-2 pt-1 text-xs">
            <button
              type="button"
              onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
              title="Rotate 90° Counter-Clockwise"
              className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium transition-colors text-[11px] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>-90°</span>
            </button>
            <button
              type="button"
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              title="Rotate 90° Clockwise"
              className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium transition-colors text-[11px] cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 shrink-0" />
              <span>+90°</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              title="Reset zoom and rotation"
              className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium transition-colors text-[11px] cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 shrink-0" />
              <span>Reset</span>
            </button>
            {onChangeImage && (
              <button
                type="button"
                onClick={onChangeImage}
                title="Choose different photo"
                className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium transition-colors text-[11px] cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 shrink-0" />
                <span>Change</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Preview Avatar + Symmetrical Save Controls */}
        <div className="space-y-3 pt-2 border-t border-black/[0.05] dark:border-white/[0.08]">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800">
            {previewDataUrl ? (
              <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-zinc-900/10 dark:ring-white/10 shrink-0">
                <img
                  src={previewDataUrl}
                  alt="Avatar Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
            )}
            <div className="text-xs">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                Avatar Preview
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Live circular crop result
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="w-full justify-center rounded-xl text-xs py-2.5 font-medium"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              loading={loading}
              className="w-full justify-center rounded-xl text-xs py-2.5 font-medium shadow-xs"
            >
              <Check className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              Save Photo
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ProfilePictureEditorModal;
