import { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable';

import UploadZone from './components/UploadZone';
import GridItem from './components/GridItem';
import Lightbox from './components/Lightbox';
import CropPreview from './components/CropPreview';
import CropModal from './components/CropModal';

export default function App() {
  const [photos, setPhotos] = useState([]);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dark, setDark] = useState(true);
  const [page, setPage] = useState('grid'); // 'grid' | 'crop'
  const [cropTarget, setCropTarget] = useState(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleUpload = useCallback((newPhotos) => {
    setPhotos((prev) => [...prev, ...newPhotos]);
  }, []);

  const handleDragStart = () => setIsDragging(true);

  const handleDragEnd = ({ active, over }) => {
    setIsDragging(false);
    if (over && active.id !== over.id) {
      setPhotos((items) => {
        const oldIndex = items.findIndex((p) => p.id === active.id);
        const newIndex = items.findIndex((p) => p.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleOpen = useCallback((photo) => {
    if (!isDragging) setLightboxPhoto(photo);
  }, [isDragging]);

  const handleRemove = (id) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    if (lightboxPhoto?.id === id) setLightboxPhoto(null);
  };

  const addFiles = (files) => {
    const readers = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) =>
              resolve({ id: crypto.randomUUID(), url: ev.target.result, name: file.name });
            reader.readAsDataURL(file);
          })
      );
    Promise.all(readers).then(handleUpload);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-black transition-colors duration-200">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-neutral-800 bg-white dark:bg-black sticky top-0 z-40 transition-colors duration-200">
        <div className="max-w-[935px] mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-semibold text-gray-900 dark:text-white text-lg tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
            Grid Preview
          </span>

          {/* Nav tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${page === 'grid'
                  ? 'bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Grid
            </button>
            <button
              onClick={() => setPage('crop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${page === 'crop'
                  ? 'bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16l4-4m0 0l4-4m-4 4h12M8 8H4m16 8l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Crop
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark mode toggle */}
            <button
              onClick={() => setDark((d) => !d)}
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {dark ? (
                // Sun icon
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M12 3v1m0 16v1m8.66-9H21M3 12H2m15.07-6.07-.71.71M6.64 17.36l-.71.71M17.36 17.36l.71.71M6.64 6.64l.71.71M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                // Moon icon
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )}
            </button>

            {/* Add photos */}
            <label className="flex items-center gap-2 bg-[#0095f6] text-white text-sm font-semibold px-4 py-1.5 rounded-lg cursor-pointer hover:bg-[#1877f2] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add photos
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </div>
      </header>

      {page === 'crop' && <CropPreview />}

      <main className={`max-w-[935px] mx-auto px-4 py-6 ${page !== 'grid' ? 'hidden' : ''}`}>
        {/* Profile stub */}
        <div className="flex items-center gap-8 mb-8 pb-6 border-b border-gray-200 dark:border-neutral-800 transition-colors duration-200">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex-shrink-0 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-light mb-1 text-gray-900 dark:text-white transition-colors duration-200">your_username</h1>
            <div className="flex gap-6 text-sm text-gray-900 dark:text-white transition-colors duration-200">
              <span><strong>{photos.length}</strong> posts</span>
            </div>
          </div>
        </div>

        {photos.length === 0 ? (
          <UploadZone onUpload={handleUpload} />
        ) : (
          <>
            <p className="text-xs text-gray-400 dark:text-neutral-500 text-center mb-3">
              Drag to reorder · Click to preview
            </p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-3 gap-[3px]">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <GridItem photo={photo} onOpen={handleOpen} />
                      {/* Delete */}
                      <button
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 text-white rounded-full text-xs leading-none items-center justify-center hidden group-hover:flex hover:bg-black/80 transition-colors z-10"
                        onClick={(e) => { e.stopPropagation(); handleRemove(photo.id); }}
                        aria-label="Remove photo"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <div className="mt-4">
              <UploadZone onUpload={handleUpload} />
            </div>
          </>
        )}
      </main>

      {page === 'grid' && lightboxPhoto && (
        <Lightbox
          photo={lightboxPhoto}
          onClose={() => setLightboxPhoto(null)}
          onCrop={() => { setCropTarget(lightboxPhoto); setLightboxPhoto(null); }}
        />
      )}

      {cropTarget && (
        <CropModal
          photo={cropTarget}
          onClose={() => setCropTarget(null)}
          onApply={(croppedUrl) => {
            setPhotos((prev) =>
              prev.map((p) => p.id === cropTarget.id ? { ...p, url: croppedUrl } : p)
            );
            setCropTarget(null);
          }}
        />
      )}
    </div>
  );
}
