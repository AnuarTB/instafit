import { useState, useRef } from 'react';
import CustomCropEditor from './CustomCropEditor';

const CROPS = [
  { label: 'Top',    positionClass: 'object-top',    yFactor: 0 },
  { label: 'Center', positionClass: 'object-center', yFactor: 0.5 },
  { label: 'Bottom', positionClass: 'object-bottom', yFactor: 1 },
];

/**
 * Replicates object-fit:cover + object-position for a 4:5 target.
 * Returns the source rectangle to draw onto a canvas.
 */
function getCropRect(imgW, imgH, yFactor) {
  const targetRatio = 4 / 5;
  const imgRatio = imgW / imgH;

  let srcX, srcY, srcW, srcH;

  if (imgRatio > targetRatio) {
    // Wider than 4:5 → full height, crop width (centered horizontally)
    srcH = imgH;
    srcW = imgH * targetRatio;
    srcY = 0;
    srcX = (imgW - srcW) / 2; // object-position x is always 50% for top/center/bottom
  } else {
    // Taller (or equal) → full width, crop height
    srcW = imgW;
    srcH = imgW / targetRatio;
    srcX = 0;
    srcY = (imgH - srcH) * yFactor;
  }

  return { srcX, srcY, srcW, srcH };
}

function downloadCrop(imageUrl, yFactor, label) {
  const img = new Image();
  img.onload = () => {
    const { srcX, srcY, srcW, srcH } = getCropRect(img.naturalWidth, img.naturalHeight, yFactor);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(srcW);
    canvas.height = Math.round(srcH);
    canvas.getContext('2d').drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
    const a = document.createElement('a');
    a.download = `crop-${label.toLowerCase()}.jpg`;
    a.href = canvas.toDataURL('image/jpeg', 0.95);
    a.click();
  };
  img.src = imageUrl;
}

function CropCard({ label, positionClass, yFactor, url }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-full aspect-[4/5] overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
        <img
          src={url}
          alt={label}
          className={`w-full h-full object-cover ${positionClass}`}
          draggable={false}
        />
      </div>
      <div className="flex items-center justify-between w-full px-0.5">
        <span className="text-sm font-medium text-gray-700 dark:text-neutral-300">{label}</span>
        <button
          onClick={() => downloadCrop(url, yFactor, label)}
          className="flex items-center gap-1 text-xs text-[#0095f6] hover:text-[#1877f2] font-medium transition-colors"
          aria-label={`Download ${label} crop`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 3v12" />
          </svg>
          Download
        </button>
      </div>
    </div>
  );
}

export default function CropPreview() {
  const [imageUrl, setImageUrl] = useState(null);
  const [draggingOver, setDraggingOver] = useState(false);
  const inputRef = useRef(null);

  const loadFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => setImageUrl(e.target.result);
    reader.readAsDataURL(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDraggingOver(false);
    loadFile(e.dataTransfer.files[0]);
  };

  return (
    <main className="max-w-[935px] mx-auto px-4 py-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Crop Preview</h2>
      <p className="text-sm text-gray-500 dark:text-neutral-400 mb-6">
        See how your photo crops to 4:5 from the top, center, and bottom.
      </p>

      {/* Upload zone */}
      <div
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 mb-8 transition-colors cursor-pointer select-none
          ${draggingOver
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-950'
            : 'border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-gray-400 dark:hover:border-neutral-500'}`}
        onDragOver={(e) => { e.preventDefault(); setDraggingOver(true); }}
        onDragLeave={() => setDraggingOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current.click()}
      >
        <svg className="w-8 h-8 text-gray-400 dark:text-neutral-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="text-sm text-gray-600 dark:text-neutral-400 font-medium">
          {imageUrl ? 'Replace image' : <>Drop an image or <span className="text-blue-500">browse</span></>}
        </p>
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { loadFile(e.target.files[0]); e.target.value = ''; }} />
      </div>

      {/* Preset crop previews */}
      {imageUrl && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CROPS.map(({ label, positionClass, yFactor }) => (
              <CropCard key={label} label={label} positionClass={positionClass} yFactor={yFactor} url={imageUrl} />
            ))}
          </div>
          <CustomCropEditor url={imageUrl} />
        </>
      )}
    </main>
  );
}
