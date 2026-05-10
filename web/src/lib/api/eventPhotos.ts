// filepath: web/src/lib/api/eventPhotos.ts
import api from "../api";
import { EventPhoto, EventPhotoReorderRequest } from "@/types";

export const eventPhotosApi = {
  upload: async (eventId: string, file: File, caption?: string): Promise<EventPhoto> => {
    const formData = new FormData();
    formData.append("file", file);
    if (caption) {
      formData.append("caption", caption);
    }
    const response = await api.post<EventPhoto>(
      `/api/v1/event-photos/${eventId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  list: async (eventId: string): Promise<EventPhoto[]> => {
    const response = await api.get<EventPhoto[]>(`/api/v1/event-photos/${eventId}`);
    return response.data;
  },

  delete: async (eventId: string, photoId: string): Promise<void> => {
    await api.delete(`/api/v1/event-photos/${eventId}/${photoId}`);
  },

  setCover: async (eventId: string, photoId: string): Promise<EventPhoto> => {
    const response = await api.patch<EventPhoto>(`/api/v1/event-photos/${eventId}/${photoId}/cover`);
    return response.data;
  },

  reorder: async (eventId: string, photoIds: string[]): Promise<void> => {
    const payload: EventPhotoReorderRequest = { photo_ids: photoIds };
    await api.patch(`/api/v1/event-photos/${eventId}/reorder`, payload);
  },
};