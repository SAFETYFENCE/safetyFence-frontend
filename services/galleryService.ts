import AsyncStorage from '@react-native-async-storage/async-storage';

export interface GalleryPhoto {
    id: string;
    uri: string;
    date: string; // YYYY-MM-DD
    title?: string;
    description?: string;
    createdAt: number;
}

const STORAGE_KEY = 'gallery_photos';

export const galleryService = {
    /**
     * 모든 사진 불러오기
     */
    async getPhotos(): Promise<GalleryPhoto[]> {
        try {
            const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
            return jsonValue != null ? JSON.parse(jsonValue) : [];
        } catch (e) {
            console.error('Failed to load photos', e);
            return [];
        }
    },

    /**
     * 사진 추가
     */
    async addPhoto(photo: Omit<GalleryPhoto, 'id' | 'createdAt'>): Promise<GalleryPhoto> {
        try {
            const photos = await this.getPhotos();
            const newPhoto: GalleryPhoto = {
                ...photo,
                id: Date.now().toString(),
                createdAt: Date.now(),
            };

            const newPhotos = [newPhoto, ...photos];
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPhotos));
            return newPhoto;
        } catch (e) {
            console.error('Failed to save photo', e);
            throw e;
        }
    },

    /**
     * 사진 삭제
     */
    async deletePhoto(id: string): Promise<void> {
        try {
            const photos = await this.getPhotos();
            const newPhotos = photos.filter(p => p.id !== id);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPhotos));
        } catch (e) {
            console.error('Failed to delete photo', e);
            throw e;
        }
    },

    /**
     * 특정 날짜의 사진 불러오기
     */
    async getPhotosByDate(date: string): Promise<GalleryPhoto[]> {
        const photos = await this.getPhotos();
        return photos.filter(p => p.date === date);
    }
};
