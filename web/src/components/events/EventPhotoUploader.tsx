// filepath: web/src/components/events/EventPhotoUploader.tsx
"use client";

import { useState, useEffect } from "react";
import { Upload, X, Check, Star, Trash2, Loader2 } from "lucide-react";
import { EventPhoto } from "@/types";
import { eventPhotosApi } from "@/lib/api/eventPhotos";

interface EventPhotoUploaderProps {
  eventId: string;
  initialPhotos: EventPhoto[];
  onPhotosChange?: (photos: EventPhoto[]) => void;
}

export default function EventPhotoUploader({ eventId, initialPhotos, onPhotosChange }: EventPhotoUploaderProps) {
  const [photos, setPhotos] = useState<EventPhoto[]>(initialPhotos);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (photos.length + pendingFiles.length + files.length > 8) {
      setError("En fazla 8 fotoğraf yükleyebilirsiniz.");
      return;
    }

    setPendingFiles((prev) => [...prev, ...files]);
    setError(null);
  };

  const handleSavePhotos = async () => {
    if (pendingFiles.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const uploadedPhotos: EventPhoto[] = [];
      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name} çok büyük (maks 5MB)`);
        }
        const photo = await eventPhotosApi.upload(eventId, file);
        uploadedPhotos.push(photo);
      }
      const newPhotos = [...photos, ...uploadedPhotos];
      setPhotos(newPhotos);
      onPhotosChange?.(newPhotos);
      setPendingFiles([]); // clear pending files after successful upload
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yükleme sırasında bir hata oluştu.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    try {
      await eventPhotosApi.delete(eventId, photoId);
      const newPhotos = photos.filter(p => p.id !== photoId);
      setPhotos(newPhotos);
      onPhotosChange?.(newPhotos);
    } catch {
      setError("Fotoğraf silinemedi.");
    }
  };

  const handleSetCover = async (photoId: string) => {
    try {
      await eventPhotosApi.setCover(eventId, photoId);
      const newPhotos = photos.map(p => ({
        ...p,
        is_cover: p.id === photoId
      }));
      setPhotos(newPhotos);
      onPhotosChange?.(newPhotos);
    } catch {
      setError("Kapak fotoğrafı ayarlanamadı.");
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Etkinlik Fotoğrafları ({photos.length}/8)</h3>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
          <X size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
            <img
              src={`${baseUrl}/uploads/${photo.file_path}`}
              className="h-full w-full object-cover"
              alt="Event photo"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={() => handleSetCover(photo.id)}
                className={`p-2 rounded-full ${photo.is_cover ? 'bg-yellow-400 text-white' : 'bg-white/20 text-white hover:bg-white/40'}`}
                title="Kapak Fotoğrafı Yap"
              >
                <Star size={18} fill={photo.is_cover ? "currentColor" : "none"} />
              </button>
              <button
                onClick={() => handleDelete(photo.id)}
                className="p-2 rounded-full bg-red-500/80 text-white hover:bg-red-500"
                title="Sil"
              >
                <Trash2 size={18} />
              </button>
            </div>
            {photo.is_cover && (
              <div className="absolute top-2 left-2 bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                Kapak
              </div>
            )}
          </div>
        ))}

        {/* Taslak Fotoğraflar */}
        {pendingFiles.map((file, index) => (
          <div key={`pending-${index}`} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-50 border-2 border-blue-200">
            <img
              src={URL.createObjectURL(file)}
              className="h-full w-full object-cover opacity-80"
              alt="Pending photo"
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={() => setPendingFiles(pendingFiles.filter((_, i) => i !== index))}
                className="p-2 rounded-full bg-red-500/80 text-white hover:bg-red-500"
                title="İptal Et"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div className="absolute top-2 left-2 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shadow-sm">
              Taslak (Kaydedilmedi)
            </div>
          </div>
        ))}

        {photos.length + pendingFiles.length < 8 && (
          <label className={`relative aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <input
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
            />
            {uploading ? (
              <Loader2 className="animate-spin text-blue-600" size={32} />
            ) : (
              <>
                <Upload className="text-gray-400 mb-2" size={32} />
                <span className="text-xs font-medium text-gray-500">Fotoğraf Seç</span>
              </>
            )}
          </label>
        )}
      </div>

      {/* Kaydet Butonu */}
      {pendingFiles.length > 0 && (
        <div className="flex justify-end pt-4 border-t border-gray-100 mt-4">
          <button
            onClick={handleSavePhotos}
            disabled={uploading}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            {uploading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Check size={18} />
            )}
            {uploading ? "Kaydediliyor..." : `${pendingFiles.length} Fotoğrafı Kaydet`}
          </button>
        </div>
      )}
    </div>
  );
}
