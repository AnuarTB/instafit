import { useState, useRef, useEffect } from 'react';

const TARGET_RATIO = 4 / 5;
const SQRT41 = Math.sqrt(41); // sqrt(4² + 5²) — diagonal of the 4:5 box

function initCrop(natW, natH) {
  const R = natW / natH;
  if (R > TARGET_RATIO) {
    const w = natH * TARGET_RATIO;
    return { x: (natW - w) / 2, y: 0, w };
  }
  const h = natW / TARGET_RATIO;
  return { x: 0, y: (natH - h) / 2, w: natW };
}

function getCroppedDataUrl(imageUrl, crop) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { x, y, w } = crop;
      const h = w * 5 / 4;
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

export default function CropModal({ photo, onApply, onClose }) {
  const sourceUrl = photo.originalUrl ?? photo.url;
  const [crop, setCrop] = useState(null);          // { x, y, w } in natural px
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

  const scale = naturalSize && displaySize.w > 0 ? displaySize.w / naturalSize.w : 1;
  const dc = crop ? {
    x: crop.x * scale,
    y: crop.y * scale,
    w: crop.w * scale,
    h: crop.w * 5 / 4 * scale,
  } : null;

  // Pan: drag anywhere inside the crop box
  const startPan = (e) => {
    if (!crop || !naturalSize) return;
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX, sy = e.clientY;
    const sc = { ...crop };
    const h = sc.w * 5 / 4;
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

  // Resize: project mouse onto the crop-box diagonal to preserve 4:5 ratio
  const startResize = (signX, signY) => (e) => {
    if (!crop || !naturalSize) return;
    e.preventDefault();
    e.stopPropagation();
    const h = crop.w * 5 / 4;
    const anchor = {
      x: signX > 0 ? crop.x          : crop.x + crop.w,
      y: signY > 0 ? crop.y          : crop.y + h,
    };
    const maxW = Math.min(
      signX > 0 ? naturalSize.w - anchor.x : anchor.x,
      (signY > 0 ? naturalSize.h - anchor.y : anchor.y) * TARGET_RATIO,
    );
    const minW = naturalSize.w * 0.1;

    const onMove = (ev) => {
      const rect = imgRef.current.getBoundingClientRect();
      const mx = (ev.clientX - rect.left) / scale;
      const my = (ev.clientY - rect.top)  / scale;
      const dx = (mx - anchor.x) * signX;
      const dy = (my - anchor.y) * signY;
      // Project (dx,dy) onto the (4,5) diagonal unit vector
      const proj = (dx * 4 + dy * 5) / SQRT41;
      const newW = Math.max(minW, Math.min(proj * 4 / SQRT41, maxW));
      const newH = newW * 5 / 4;
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
    onApply(await getCroppedDataUrl(sourceUrl, crop));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-neutral-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">Adjust crop</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-neutral-200 text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Editor */}
        <div className="p-5">
          <div className="relative overflow-hidden rounded-lg select-none">
            <img
              ref={imgRef}
              src={sourceUrl}
              className="w-full h-auto block"
              draggable={false}
              onLoad={(e) => {
                const natW = e.target.naturalWidth, natH = e.target.naturalHeight;
                setNaturalSize({ w: natW, h: natH });
                setDisplaySize({ w: e.target.offsetWidth, h: e.target.offsetHeight });
                setCrop(initCrop(natW, natH));
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

                {/* Move hint icon */}
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

          <p className="text-xs text-center text-gray-400 dark:text-neutral-500 mt-3">
            Drag to move · Drag corners to resize (4:5 locked)
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 text-sm font-medium text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2 rounded-lg bg-[#0095f6] hover:bg-[#1877f2] text-white text-sm font-semibold transition-colors"
          >
            Apply crop
          </button>
        </div>
      </div>
    </div>
  );
}
