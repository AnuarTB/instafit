import { useState, useRef, useEffect } from 'react';

const TARGET_RATIO = 4 / 5;
const SQRT41 = Math.sqrt(41);

function initCrop(natW, natH) {
  const R = natW / natH;
  if (R > TARGET_RATIO) {
    const w = natH * TARGET_RATIO;
    return { x: (natW - w) / 2, y: 0, w };
  }
  const h = natW / TARGET_RATIO;
  return { x: 0, y: (natH - h) / 2, w: natW };
}

const CORNERS = [
  { signX: -1, signY: -1, pos: '-top-[5px] -left-[5px]',    cursor: 'nw-resize' },
  { signX:  1, signY: -1, pos: '-top-[5px] -right-[5px]',   cursor: 'ne-resize' },
  { signX: -1, signY:  1, pos: '-bottom-[5px] -left-[5px]', cursor: 'sw-resize' },
  { signX:  1, signY:  1, pos: '-bottom-[5px] -right-[5px]',cursor: 'se-resize' },
];

export default function CustomCropEditor({ url }) {
  const [crop, setCrop] = useState(null);
  const [naturalSize, setNaturalSize] = useState(null);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const imgRef = useRef(null);

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

  const download = () => {
    if (!crop) return;
    const img = new Image();
    img.onload = () => {
      const { x, y, w } = crop;
      const h = w * 5 / 4;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w);
      canvas.height = Math.round(h);
      canvas.getContext('2d').drawImage(img, Math.round(x), Math.round(y), Math.round(w), Math.round(h), 0, 0, canvas.width, canvas.height);
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
            Drag to move · Drag corners to resize (4:5 locked)
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
        <div className="relative overflow-hidden rounded-lg select-none">
          <img
            ref={imgRef}
            src={url}
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
      </div>
    </div>
  );
}
