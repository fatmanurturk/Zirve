// filepath: web/src/components/events/EventPhotoGallery.tsx
"use client";

import { useState } from "react";
import { EventPhoto } from "@/types";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface EventPhotoGalleryProps {
  photos: EventPhoto[];
}

export default function EventPhotoGallery({ photos }: EventPhotoGalleryProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  if (!photos || photos.length === 0) return null;

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const nextPhoto = () => {
    if (selectedPhotoIndex !== null) {
      setSelectedPhotoIndex((selectedPhotoIndex + 1) % photos.length);
    }
  };

  const prevPhoto = () => {
    if (selectedPhotoIndex !== null) {
      setSelectedPhotoIndex((selectedPhotoIndex - 1 + photos.length) % photos.length);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-gray-900">Etkinlik Galerisi</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {photos.map((photo, index) => (
          <div 
            key={photo.id}
            className="relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-gray-100 hover:opacity-90 transition-opacity"
            onClick={() => setSelectedPhotoIndex(index)}
          >
            <img 
              src={`${baseUrl}/uploads/${photo.file_path}`} 
              alt={photo.caption || photo.original_filename}
              className="h-full w-full object-cover"
            />
            {photo.is_cover && (
              <span className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                Kapak
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedPhotoIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setSelectedPhotoIndex(null)}
          >
            <X size={32} />
          </button>
          
          <button 
            className="absolute left-4 text-white hover:text-gray-300"
            onClick={prevPhoto}
          >
            <ChevronLeft size={48} />
          </button>

          <div className="max-w-4xl max-h-full flex flex-col items-center">
            <img 
              src={`${baseUrl}/uploads/${photos[selectedPhotoIndex].file_path}`} 
              alt="Full size"
              className="max-w-full max-h-[80vh] object-contain"
            />
            {photos[selectedPhotoIndex].caption && (
              <p className="mt-4 text-white text-lg text-center">
                {photos[selectedPhotoIndex].caption}
              </p>
            )}
          </div>

          <button 
            className="absolute right-4 text-white hover:text-gray-300"
            onClick={nextPhoto}
          >
            <ChevronRight size={48} />
          </button>
        </div>
      )}
    </div>
  );
}
