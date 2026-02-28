import { useState, useRef, useEffect } from 'react';

const TARGET_RATIO = 4 / 5;

function getCroppedDataUrl(imageUrl, offset, isWider, fitsExactly) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const imgW = img.naturalWidth, imgH = img.naturalHeight;
      let srcX = 0, srcY = 0, srcW = imgW, srcH = imgH;
      if (!fitsExactly) {
        if (isWider) {
          srcH = imgH;
          srcW = imgH * TARGET_RATIO;
          srcX = (imgW - srcW) * offset;
        } else {
          srcW = imgW;
          srcH = imgW / TARGET_RATIO;
          srcY = (imgH - srcH) * offset;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(srcW);
      canvas.height = Math.round(srcH);
      canvas.getContext('2d').drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.src = imageUrl;
  });
}

export default function CropModal({ photo, onApply, onClose }) {
  const [offset, setOffset] = useState(0.5);
  const [naturalSize, setNaturalSize] = useState(null);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const imgRef = useRef(null);

  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const imgRatio = naturalSize ? naturalSize.w / naturalSize.h : 1;
  const isWider = imgRatio > TARGET_RATIO;
  const fitsExactly = Math.abs(imgRatio - TARGET_RATIO) < 0.001;

  const { w: dW, h: dH } = displaySize;
  let cropW = dW, cropH = dH, cropX = 0, cropY = 0;
  if (dW > 0 && dH > 0 && !fitsExactly) {
    if (isWider) {
      cropH = dH;
      cropW = dH * TARGET_RATIO;
      cropX = (dW - cropW) * offset;
    } else {
      cropW = dW;
      cropH = dW / TARGET_RATIO;
      cropY = (dH - cropH) * offset;
    }
  }

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setDisplaySize({ w: el.offsetWidth, h: el.offsetHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [naturalSize]);

  const startDrag = (e) => {
    if (fitsExactly) return;
    e.preventDefault();
    const maxDelta = isWider ? dW - cropW : dH - cropH;
    if (maxDelta <= 0) return;
    const startCoord = isWider ? e.clientX : e.clientY;
    const startOffset = offset;
    const onMove = (ev) => {
      const coord = isWider ? ev.clientX : ev.clientY;
      setOffset(Math.max(0, Math.min(1, startOffset + (coord - startCoord) / maxDelta)));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleApply = async () => {
    const croppedUrl = await getCroppedDataUrl(photo.url, offset, isWider, fitsExactly);
    onApply(croppedUrl);
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

        {/* Crop editor */}
        <div className="p-5">
          <div
            className={`relative overflow-hidden rounded-lg select-none ${fitsExactly ? '' : 'cursor-grab active:cursor-grabbing'}`}
            onPointerDown={startDrag}
          >
            <img
              ref={imgRef}
              src={photo.url}
              className="w-full h-auto block"
              draggable={false}
              onLoad={(e) => {
                setNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight });
                setDisplaySize({ w: e.target.offsetWidth, h: e.target.offsetHeight });
              }}
            />
            {/* Crop window */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: Math.round(cropX),
                top: Math.round(cropY),
                width: Math.round(cropW),
                height: Math.round(cropH),
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                border: '1.5px solid rgba(255,255,255,0.85)',
              }}
            >
              {/* Rule-of-thirds */}
              <div className="absolute inset-0 pointer-events-none opacity-35">
                <div className="absolute top-1/3 left-0 right-0 border-t border-white" />
                <div className="absolute top-2/3 left-0 right-0 border-t border-white" />
                <div className="absolute left-1/3 top-0 bottom-0 border-l border-white" />
                <div className="absolute left-2/3 top-0 bottom-0 border-l border-white" />
              </div>
              {/* Corner handles */}
              {['-top-[3px] -left-[3px]', '-top-[3px] -right-[3px]', '-bottom-[3px] -left-[3px]', '-bottom-[3px] -right-[3px]'].map((pos) => (
                <div key={pos} className={`absolute w-3 h-3 bg-white rounded-[2px] ${pos}`} />
              ))}
              {/* Drag hint */}
              {!fitsExactly && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/30 rounded-full p-1.5">
                    {isWider ? (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h8M5 9l-3 3 3 3M19 9l3 3-3 3" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v8M9 5l3-3 3 3M9 19l3 3 3-3" />
                      </svg>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {!fitsExactly && (
            <input
              type="range" min={0} max={1} step={0.001}
              value={offset}
              onChange={(e) => setOffset(Number(e.target.value))}
              className="w-full mt-3 accent-[#0095f6]"
              aria-label="Crop position"
            />
          )}

          {fitsExactly && (
            <p className="text-xs text-center text-gray-400 dark:text-neutral-500 mt-3">
              This photo is already 4:5 — no cropping needed.
            </p>
          )}
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
