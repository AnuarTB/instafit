import { useState, useRef, useEffect } from 'react';

const TARGET_RATIO = 4 / 5;

export default function CustomCropEditor({ url }) {
  const [offset, setOffset] = useState(0.5);          // 0 = top/left, 1 = bottom/right
  const [naturalSize, setNaturalSize] = useState(null);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const imgRef = useRef(null);

  const imgRatio = naturalSize ? naturalSize.w / naturalSize.h : 1;
  const isWider = imgRatio > TARGET_RATIO;    // landscape-ish → crop horizontally
  const fitsExactly = Math.abs(imgRatio - TARGET_RATIO) < 0.001;

  const { w: dW, h: dH } = displaySize;

  // Crop box position & size in display pixels
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

  // Keep display size in sync with container resizes
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

  const download = () => {
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
      const a = document.createElement('a');
      a.download = 'crop-custom.jpg';
      a.href = canvas.toDataURL('image/jpeg', 0.95);
      a.click();
    };
    img.src = url;
  };

  return (
    <div className="mt-10 border-t border-gray-200 dark:border-neutral-800 pt-8">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Custom crop</h3>
          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
            {fitsExactly
              ? 'Image is already 4:5 — no cropping needed.'
              : `Drag ${isWider ? 'left / right' : 'up / down'} to reposition`}
          </p>
        </div>
        <button
          onClick={download}
          className="flex items-center gap-1.5 bg-[#0095f6] hover:bg-[#1877f2] text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 3v12" />
          </svg>
          Download
        </button>
      </div>

      <div className="max-w-sm mx-auto">
        {/* Editor */}
        <div
          className={`relative overflow-hidden rounded-lg select-none ${fitsExactly ? '' : 'cursor-grab active:cursor-grabbing'}`}
          onPointerDown={startDrag}
        >
          <img
            ref={imgRef}
            src={url}
            className="w-full h-auto block"
            draggable={false}
            onLoad={(e) => {
              setNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight });
              setDisplaySize({ w: e.target.offsetWidth, h: e.target.offsetHeight });
            }}
          />

          {/* Crop window — box-shadow darkens everything outside it */}
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
            {/* Rule-of-thirds grid lines */}
            <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.35 }}>
              <div className="absolute top-1/3 left-0 right-0 border-t border-white" />
              <div className="absolute top-2/3 left-0 right-0 border-t border-white" />
              <div className="absolute left-1/3 top-0 bottom-0 border-l border-white" />
              <div className="absolute left-2/3 top-0 bottom-0 border-l border-white" />
            </div>

            {/* Corner handles */}
            {['-top-[3px] -left-[3px]', '-top-[3px] -right-[3px]', '-bottom-[3px] -left-[3px]', '-bottom-[3px] -right-[3px]'].map((pos) => (
              <div key={pos} className={`absolute w-3 h-3 bg-white rounded-[2px] ${pos}`} />
            ))}

            {/* Drag hint arrow */}
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

        {/* Position scrubber */}
        {!fitsExactly && (
          <input
            type="range"
            min={0} max={1} step={0.001}
            value={offset}
            onChange={(e) => setOffset(Number(e.target.value))}
            className="w-full mt-3 accent-[#0095f6]"
            aria-label="Crop position"
          />
        )}
      </div>
    </div>
  );
}
