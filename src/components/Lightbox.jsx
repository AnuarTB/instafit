import { useEffect } from 'react';

function download(url, name) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name || 'photo.jpg';
  a.click();
}

export default function Lightbox({ photo, onClose, onCrop, onFrame }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85"
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="absolute top-4 right-4 text-white text-3xl leading-none hover:text-gray-300 transition-colors"
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>

      {/* Image */}
      <img
        src={photo.url}
        alt={photo.name}
        className="max-h-[80vh] max-w-[90vw] object-contain rounded shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Action bar */}
      <div
        className="flex items-center gap-3 mt-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => download(photo.url, photo.name)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 3v12" />
          </svg>
          Download
        </button>
        <button
          onClick={onCrop}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0095f6] hover:bg-[#1877f2] text-white text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M7 21V7m0 0H3m4 0h10M17 3v10m0 0h4m-4 0V7" />
          </svg>
          Crop
        </button>
        <button
          onClick={onFrame}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4h16v16H4zM4 9h16M4 15h16M9 4v16M15 4v16" />
          </svg>
          Frame
        </button>
      </div>
    </div>
  );
}
