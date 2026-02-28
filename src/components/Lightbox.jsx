import { useEffect } from 'react';

export default function Lightbox({ photo, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white text-3xl leading-none hover:text-gray-300 transition-colors"
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>
      <img
        src={photo.url}
        alt={photo.name}
        className="max-h-[90vh] max-w-[90vw] object-contain rounded shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
