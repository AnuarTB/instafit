import { useRef, useState } from 'react';

export default function UploadZone({ onUpload }) {
  const inputRef = useRef(null);
  const [draggingOver, setDraggingOver] = useState(false);

  const handleFiles = (files) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!imageFiles.length) return;

    const readers = imageFiles.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) =>
            resolve({ id: crypto.randomUUID(), url: e.target.result, name: file.name });
          reader.readAsDataURL(file);
        })
    );

    Promise.all(readers).then(onUpload);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDraggingOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 transition-colors cursor-pointer select-none
        ${draggingOver
          ? 'border-blue-400 bg-blue-50 dark:bg-blue-950'
          : 'border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-gray-400 dark:hover:border-neutral-500'}`}
      onDragOver={(e) => { e.preventDefault(); setDraggingOver(true); }}
      onDragLeave={() => setDraggingOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current.click()}
    >
      <svg className="w-10 h-10 text-gray-400 dark:text-neutral-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
      <p className="text-sm text-gray-600 dark:text-neutral-400 font-medium">Drop photos here or <span className="text-blue-500">browse</span></p>
      <p className="text-xs text-gray-400 dark:text-neutral-600 mt-1">PNG, JPG, GIF, WEBP</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
