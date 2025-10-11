import { create } from 'zustand';
import { PlatformType, X, BLUESKY } from 'src/constants/platforms';
import { ConnectionStatus, SelectedImage } from 'src/types/types';
import { IDLE, PENDING, SUCCESS, ERROR, PostStatusType } from 'src/constants/app';

interface PostState {
  // Conteúdo do Post
  postText: string;
  tagsText: string;
  selectedImages: SelectedImage[];
  editingPostId: number | null;

  // Status da UI
  connections: ConnectionStatus[];
  isPosting: boolean;
  postProgress: number;

  // Ações para modificar o estado
  setPostText: (text: string) => void;
  setTagsText: (text: string) => void;
  addImages: (newImages: SelectedImage[], activePlatforms: PlatformType[]) => void;
  toggleImagePlatform: (imageIndex: number, platform: PlatformType) => void;
  removeImage: (index: number) => void;
  clearForm: () => void;
  setSelectedImages: (images: SelectedImage[]) => void;

  // Ações para o fluxo de postagem
  startPosting: (platformsToPost: PlatformType[]) => void;
  updatePostProgress: (update: { platform: PlatformType; status: 'success' | 'error' } | { progress: number }) => void;
  mergeConnections: (allPlatforms: PlatformType[], activePlatforms: PlatformType[]) => void;
  finishPosting: (summary: { successful: PlatformType[]; failed: PlatformType[] }) => void;
  resetPostStatus: () => void;
  resetPosting: () => void;
}

export const usePostStore = create<PostState>((set, get) => ({
  // Estado Inicial
  postText: '',
  tagsText: '',
  selectedImages: [],
  editingPostId: null,
  connections: [],
  isPosting: false,
  postProgress: 0,

  // Ações
  setPostText: text => set({ postText: text }),
  setTagsText: text => set({ tagsText: text }),
  addImages: (newImages, _activePlatforms) =>
    set(state => {
      const allImages = [...state.selectedImages, ...newImages];
      const updatedImages = allImages.map((img, index) => {
        const platforms = img.platforms.filter((p: PlatformType) => !((p === X || p === BLUESKY) && index >= 4));
        return { ...img, platforms };
      });
      return { selectedImages: updatedImages };
    }),
  toggleImagePlatform: (imageIndex, platform) =>
    set(state => {
      const newImages = [...state.selectedImages];
      const image = newImages[imageIndex];
      const platformIndex = image.platforms.indexOf(platform);
      if (platformIndex > -1) {
        image.platforms.splice(platformIndex, 1);
      } else {
        image.platforms.push(platform);
      }
      return { selectedImages: newImages };
    }),
  removeImage: indexToRemove =>
    set(state => ({
      selectedImages: state.selectedImages.filter((_, index) => index !== indexToRemove),
    })),
  clearForm: () => set({ postText: '', selectedImages: [], editingPostId: null }),
  setSelectedImages: images => set({ selectedImages: images }),

  startPosting: platformsToPost =>
    set(state => ({
      isPosting: true,
      postProgress: 0,
      connections: state.connections.map(c =>
        platformsToPost.includes(c.platform) ? { ...c, postStatus: PENDING } : { ...c, postStatus: IDLE },
      ),
    })),
  updatePostProgress: update =>
    set(state => {
      if ('progress' in update) {
        return { postProgress: update.progress };
      }
      if ('platform' in update && 'status' in update) {
        return {
          connections: state.connections.map(c =>
            c.platform === update.platform ? { ...c, postStatus: update.status } : c,
          ),
        };
      }
      return {};
    }),
  finishPosting: summary =>
    set(state => {
      const finalConnections = state.connections.map(c => {
        if (summary.successful.includes(c.platform)) return { ...c, postStatus: SUCCESS as PostStatusType };
        if (summary.failed.includes(c.platform)) return { ...c, postStatus: ERROR as PostStatusType };
        return c;
      });
      return { postProgress: 1, connections: finalConnections };
    }),
  mergeConnections: (allPlatforms, activePlatforms) =>
    set(state => {
      const existingConnectionsMap = new Map(state.connections.map(c => [c.platform, c]));
      const newConnections = allPlatforms.map(platform => {
        const existingConnection = existingConnectionsMap.get(platform);
        const isActive = activePlatforms.includes(platform);

        // prettier-ignore
        if (existingConnection)
             return { ...existingConnection, active: isActive };
        else {
          return {
            platform,
            active: isActive,
            postStatus: IDLE as PostStatusType,
          };
        }
      });

      return { connections: newConnections };
    }),
  resetPostStatus: () =>
    set(state => {
      setTimeout(() => {
        set({
          isPosting: false,
          connections: state.connections.map(c => ({ ...c, postStatus: IDLE })),
        });
      }, 5000);
      return {};
    }),
  resetPosting: () => set({ isPosting: false }),
}));
