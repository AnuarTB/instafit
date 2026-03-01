import { useState, useRef, useEffect } from 'react';

const RATIOS = [
  { label: '1:1',  value: 1 },
  { label: '4:5',  value: 4 / 5 },
  { label: '3:4',  value: 3 / 4 },
  { label: '16:9', value: 16 / 9 },
];

function initCrop(natW, natH, ratio) {
  const R = natW / natH;
  if (R > ratio) {
    const w = natH * ratio;
    return { x: (natW - w) / 2, y: 0, w };
  }
  const h = natW / ratio;
  return { x: 0, y: (natH - h) / 2, w: natW };
}

function getCroppedDataUrl(imageUrl, crop, ratio) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { x, y, w } = crop;
      const h = w / ratio;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w);
      canvas.height = Math.round(h);
      canvas.getContext('2d').drawImage(img, Math.round(x), Math.round(y), Math.round(w), Math.round(h), 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.src = imageUrl;
  });
}

const CORNERS = [
  { signX: -1, signY: -1, pos: '-top-[5px] -left-[5px]',    cursor: 'nw-resize' },
  { signX:  1, signY: -1, pos: '-top-[5px] -right-[5px]',   cursor: 'ne-resize' },
  { signX: -1, signY:  1, pos: '-bottom-[5px] -left-[5px]', cursor: 'sw-resize' },
  { signX:  1, signY:  1, pos: '-bottom-[5px] -right-[5px]',cursor: 'se-resize' },
];

function RatioSelector({ ratio, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {RATIOS.map(({ label, value }) => (
        <button
          key={label}
          onClick={() => onChange(value)}
          className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
            ratio === value
              ? 'bg-[#0095f6] border-[#0095f6] text-white'
              : 'border-gray-300 dark:border-neutral-700 text-gray-600 dark:text-neutral-400 hover:border-gray-400 dark:hover:border-neutral-500'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function CropModal({ photo, onApply, onClose }) {
  const sourceUrl = photo.originalUrl ?? photo.url;
  const [ratio, setRatio] = useState(4 / 5);
  const [crop, setCrop] = useState(null);
  const [naturalSize, setNaturalSize] = useState(null);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const imgRef = useRef(null);

  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setDisplaySize({ w: el.offsetWidth, h: el.offsetHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [naturalSize]);

  // Re-init crop when ratio changes
  useEffect(() => {
    if (!naturalSize) return;
    setCrop(initCrop(naturalSize.w, naturalSize.h, ratio));
  }, [ratio, naturalSize]);

  const scale = naturalSize && displaySize.w > 0 ? displaySize.w / naturalSize.w : 1;
  const sqrtDiag = Math.sqrt(ratio * ratio + 1); // diagonal length of (ratio, 1) vector
  const dc = crop ? {
    x: crop.x * scale,
    y: crop.y * scale,
    w: crop.w * scale,
    h: (crop.w / ratio) * scale,
  } : null;

  const startPan = (e) => {
    if (!crop || !naturalSize) return;
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX, sy = e.clientY;
    const sc = { ...crop };
    const h = sc.w / ratio;
    const onMove = (ev) => setCrop({
      w: sc.w,
      x: Math.max(0, Math.min(naturalSize.w - sc.w, sc.x + (ev.clientX - sx) / scale)),
      y: Math.max(0, Math.min(naturalSize.h - h,    sc.y + (ev.clientY - sy) / scale)),
    });
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const startResize = (signX, signY) => (e) => {
    if (!crop || !naturalSize) return;
    e.preventDefault();
    e.stopPropagation();
    const h = crop.w / ratio;
    const anchor = {
      x: signX > 0 ? crop.x          : crop.x + crop.w,
      y: signY > 0 ? crop.y          : crop.y + h,
    };
    const maxW = Math.min(
      signX > 0 ? naturalSize.w - anchor.x : anchor.x,
      (signY > 0 ? naturalSize.h - anchor.y : anchor.y) * ratio,
    );
    const minW = naturalSize.w * 0.1;

    const onMove = (ev) => {
      const rect = imgRef.current.getBoundingClientRect();
      const mx = (ev.clientX - rect.left) / scale;
      const my = (ev.clientY - rect.top)  / scale;
      const dx = (mx - anchor.x) * signX;
      const dy = (my - anchor.y) * signY;
      const proj = (dx * ratio + dy) / sqrtDiag;
      const newW = Math.max(minW, Math.min(proj * ratio / sqrtDiag, maxW));
      const newH = newW / ratio;
      setCrop({
        w: newW,
        x: signX > 0 ? anchor.x : anchor.x - newW,
        y: signY > 0 ? anchor.y : anchor.y - newH,
      });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleApply = async () => {
    if (!crop) return;
    onApply(await getCroppedDataUrl(sourceUrl, crop, ratio));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-neutral-800 shrink-0">
          <h3 className="font-semibold text-gray-900 dark:text-white">Adjust crop</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-neutral-200 text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Body: image left, controls right */}
        <div className="flex flex-1 min-h-0">
          {/* Image editor */}
          <div className="flex-1 p-5 min-w-0 overflow-hidden flex items-center">
            <div className="relative overflow-hidden rounded-lg select-none w-full">
              <img
                ref={imgRef}
                src={sourceUrl}
                className="w-full h-auto block"
                draggable={false}
                onLoad={(e) => {
                  const natW = e.target.naturalWidth, natH = e.target.naturalHeight;
                  setNaturalSize({ w: natW, h: natH });
                  setDisplaySize({ w: e.target.offsetWidth, h: e.target.offsetHeight });
                }}
              />

              {dc && (
                <div
                  className="absolute"
                  style={{
                    left: Math.round(dc.x), top: Math.round(dc.y),
                    width: Math.round(dc.w), height: Math.round(dc.h),
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                    border: '1.5px solid rgba(255,255,255,0.85)',
                    cursor: 'grab',
                  }}
                  onPointerDown={startPan}
                >
                  {/* Rule-of-thirds */}
                  <div className="absolute inset-0 pointer-events-none opacity-35">
                    <div className="absolute top-1/3 left-0 right-0 border-t border-white" />
                    <div className="absolute top-2/3 left-0 right-0 border-t border-white" />
                    <div className="absolute left-1/3 top-0 bottom-0 border-l border-white" />
                    <div className="absolute left-2/3 top-0 bottom-0 border-l border-white" />
                  </div>

                  {/* Move hint */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/30 rounded-full p-1.5">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M5 9l-3 3 3 3M19 9l3 3-3 3M9 5l3-3 3 3M9 19l3 3 3-3M2 12h20M12 2v20" />
                      </svg>
                    </div>
                  </div>

                  {/* Corner handles */}
                  {CORNERS.map(({ signX, signY, pos, cursor }) => (
                    <div
                      key={`${signX},${signY}`}
                      className={`absolute w-4 h-4 bg-white rounded-[2px] ${pos}`}
                      style={{ cursor }}
                      onPointerDown={startResize(signX, signY)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right panel: ratio + actions */}
          <div className="w-44 shrink-0 border-l border-gray-200 dark:border-neutral-800 p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wide">Ratio</p>
            <RatioSelector ratio={ratio} onChange={setRatio} />
            <p className="text-xs text-gray-400 dark:text-neutral-500 mt-auto">
              Drag to move · corners to resize
            </p>
            <button
              onClick={onClose}
              className="w-full py-2 rounded-lg border border-gray-300 dark:border-neutral-700 text-sm font-medium text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="w-full py-2 rounded-lg bg-[#0095f6] hover:bg-[#1877f2] text-white text-sm font-semibold transition-colors"
            >
              Apply crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
