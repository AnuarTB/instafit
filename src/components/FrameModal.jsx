import { useState, useRef, useEffect } from 'react';

const TARGET_RATIO = 4 / 5; // frame width / frame height = 4/5

// Compute initial image position: fitted (contained) inside the 4:5 frame
function initImgPos(natW, natH, fw, fh) {
  const aspect = natW / natH;
  if (aspect >= TARGET_RATIO) {
    // Image wider than frame → fit by width
    const w = fw;
    const h = fw / aspect;
    return { x: 0, y: (fh - h) / 2, w };
  }
  // Image taller than frame → fit by height
  const h = fh;
  const w = fh * aspect;
  return { x: (fw - w) / 2, y: 0, w };
}

const CORNERS = [
  { signX: -1, signY: -1, pos: '-top-[5px] -left-[5px]',    cursor: 'nw-resize' },
  { signX:  1, signY: -1, pos: '-top-[5px] -right-[5px]',   cursor: 'ne-resize' },
  { signX: -1, signY:  1, pos: '-bottom-[5px] -left-[5px]', cursor: 'sw-resize' },
  { signX:  1, signY:  1, pos: '-bottom-[5px] -right-[5px]',cursor: 'se-resize' },
];

export default function FrameModal({ photo, onApply, onClose }) {
  const sourceUrl = photo.originalUrl ?? photo.url;
  const [naturalSize, setNaturalSize] = useState(null);
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 });
  const [imgPos, setImgPos] = useState(null); // { x, y, w } in display frame px
  const frameRef = useRef(null);
  const initialized = useRef(false);

  // Load natural image size
  useEffect(() => {
    const img = new Image();
    img.onload = () => setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = sourceUrl;
  }, [sourceUrl]);

  // Escape to close
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Track frame display size
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setFrameSize({ w: el.offsetWidth, h: el.offsetHeight })
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Initialize imgPos once (when both naturalSize and frameSize are ready)
  useEffect(() => {
    if (initialized.current || !naturalSize || !frameSize.w || !frameSize.h) return;
    initialized.current = true;
    setImgPos(initImgPos(naturalSize.w, naturalSize.h, frameSize.w, frameSize.h));
  }, [naturalSize, frameSize]);

  const imgAspect = naturalSize ? naturalSize.w / naturalSize.h : 1;
  const imgH = imgPos ? imgPos.w / imgAspect : 0;
  // Diagonal unit vector for the image's own aspect ratio: (A, 1) / sqrt(A²+1)
  const diagLen = Math.sqrt(imgAspect * imgAspect + 1);

  // Pan: drag image anywhere within (or beyond) the frame
  const startPan = (e) => {
    if (!imgPos) return;
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX, sy = e.clientY;
    const sp = { ...imgPos };
    const onMove = (ev) => setImgPos({
      ...sp,
      x: sp.x + (ev.clientX - sx),
      y: sp.y + (ev.clientY - sy),
    });
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Resize: project mouse onto image diagonal to maintain image aspect ratio
  const startResize = (signX, signY) => (e) => {
    if (!imgPos) return;
    e.preventDefault();
    e.stopPropagation();
    const h = imgPos.w / imgAspect;
    const anchor = {
      x: signX > 0 ? imgPos.x          : imgPos.x + imgPos.w,
      y: signY > 0 ? imgPos.y          : imgPos.y + h,
    };
    const minW = Math.min(frameSize.w, frameSize.h) * 0.1;

    const onMove = (ev) => {
      const rect = frameRef.current.getBoundingClientRect();
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      const dx = (mx - anchor.x) * signX;
      const dy = (my - anchor.y) * signY;
      const proj = (dx * imgAspect + dy) / diagLen;
      const newW = Math.max(minW, proj * imgAspect / diagLen);
      const newH = newW / imgAspect;
      setImgPos({
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

  const handleApply = () => {
    if (!imgPos || !naturalSize || !frameSize.w) return;
    const { w: natW, h: natH } = naturalSize;

    // Output frame dimensions (4:5, scaled from natural image size)
    const frameNatW = imgAspect >= TARGET_RATIO ? natW : Math.round(natH * TARGET_RATIO);
    const frameNatH = imgAspect >= TARGET_RATIO ? Math.round(natW / TARGET_RATIO) : natH;

    const outScale = frameNatW / frameSize.w;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = frameNatW;
      canvas.height = frameNatH;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        img,
        Math.round(imgPos.x * outScale),
        Math.round(imgPos.y * outScale),
        Math.round(imgPos.w * outScale),
        Math.round((imgPos.w / imgAspect) * outScale),
      );
      onApply(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.src = sourceUrl;
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
          <h3 className="font-semibold text-gray-900 dark:text-white">Add frame</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-neutral-200 text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Frame editor */}
        <div className="p-5">
          <div
            ref={frameRef}
            className="relative w-full select-none overflow-hidden rounded-lg bg-white"
            style={{ aspectRatio: '4/5', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)' }}
          >
            {imgPos && (
              <div
                className="absolute"
                style={{
                  left: Math.round(imgPos.x),
                  top: Math.round(imgPos.y),
                  width: Math.round(imgPos.w),
                  height: Math.round(imgH),
                }}
              >
                <img
                  src={sourceUrl}
                  className="w-full h-full block pointer-events-none"
                  draggable={false}
                />

                {/* Pan overlay */}
                <div
                  className="absolute inset-0"
                  style={{ cursor: 'grab' }}
                  onPointerDown={startPan}
                />

                {/* Corner handles */}
                {CORNERS.map(({ signX, signY, pos, cursor }) => (
                  <div
                    key={`${signX},${signY}`}
                    className={`absolute w-4 h-4 bg-white border border-gray-400 rounded-[2px] ${pos}`}
                    style={{ cursor }}
                    onPointerDown={startResize(signX, signY)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Center buttons */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => imgPos && setImgPos((p) => ({ ...p, x: (frameSize.w - p.w) / 2 }))}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-gray-300 dark:border-neutral-700 text-xs font-medium text-gray-600 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v18M3 12h4m10 0h4M7 12h10" />
              </svg>
              Center horizontally
            </button>
            <button
              onClick={() => imgPos && setImgPos((p) => ({ ...p, y: (frameSize.h - p.w / imgAspect) / 2 }))}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-gray-300 dark:border-neutral-700 text-xs font-medium text-gray-600 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M12 3v4m0 10v4M12 7v10" />
              </svg>
              Center vertically
            </button>
          </div>

          <p className="text-xs text-center text-gray-400 dark:text-neutral-500 mt-2">
            Drag to reposition · Drag corners to resize · White fills the rest
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
            Apply frame
          </button>
        </div>
      </div>
    </div>
  );
}
