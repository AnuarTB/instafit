import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRef } from 'react';

export default function GridItem({ photo, onOpen }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  // Track pointer-down position to distinguish click from drag
  const pointerStart = useRef(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative w-full aspect-[4/5] overflow-hidden bg-gray-100 cursor-grab active:cursor-grabbing select-none"
      {...attributes}
      {...listeners}
      onPointerDown={(e) => {
        pointerStart.current = { x: e.clientX, y: e.clientY };
        listeners?.onPointerDown?.(e); // forward to dnd-kit
      }}
      onPointerUp={(e) => {
        if (!pointerStart.current) return;
        const dx = Math.abs(e.clientX - pointerStart.current.x);
        const dy = Math.abs(e.clientY - pointerStart.current.y);
        if (dx < 8 && dy < 8) onOpen(photo);
        pointerStart.current = null;
      }}
    >
      <img
        src={photo.url}
        alt={photo.name}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        draggable={false}
      />
    </div>
  );
}
