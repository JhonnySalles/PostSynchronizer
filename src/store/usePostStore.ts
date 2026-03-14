import { create } from 'zustand';
import { PlatformType, X, BLUESKY } from 'src/constants/platforms';
import { ConnectionStatus, SelectedImage } from 'src/types/types';
import { IDLE, PENDING, SUCCESS, ERROR, PostStatusType } from 'src/constants/app';

export interface PendingPostProgress {
  postId: number;
  progress: number;
  platformsCount: number;
}
interface PostState {
  // Conteúdo do Post
  postText: string;
  tagsText: string;
  selectedImages: SelectedImage[];
  oldPostId: number | null;
  editingPostId: number | null;

  // Status da UI
  connections: ConnectionStatus[];
  isPosting: boolean;
  postProgress: number;
  pendingPosts: Record<number, PendingPostProgress>;

  // Ações para modificar o estado
  setPostText: (text: string) => void;
  setTagsText: (text: string) => void;
  addImages: (newImages: SelectedImage[], activePlatforms: PlatformType[]) => void;
  toggleImagePlatform: (imageIndex: number, platform: PlatformType) => void;
  removeImage: (index: number) => void;
  clearForm: () => void;
  setSelectedImages: (images: SelectedImage[]) => void;

  // Ações para o fluxo de postagem
  startPosting: (postId: number, platformsToPost: PlatformType[]) => void;
  updatePostProgress: (
    postId: number | string | undefined | null,
    update: { platform: PlatformType; status: 'success' | 'scheduled' | 'error' } | { progress: number },
  ) => void;
  mergeConnections: (allPlatforms: PlatformType[], activePlatforms: PlatformType[]) => void;
  finishPosting: (
    postId: number | string | undefined | null,
    summary: { successful: PlatformType[]; failed: PlatformType[] },
  ) => void;
  resetPostStatus: (postId?: number | null) => void;
  removePendingPost: (postId: number) => void;
}

const globalProgress = (pendingPosts: Record<number, PendingPostProgress>): number => {
  const posts = Object.values(pendingPosts);
  // prettier-ignore
  if (posts.length === 0) 
    return 0;

  let totalProgress = 0;
  let totalWeight = 0;

  posts.forEach(post => {
    totalProgress += post.progress * post.platformsCount;
    totalWeight += post.platformsCount;
  });

  return totalWeight > 0 ? totalProgress / totalWeight : 0;
};

export const usePostStore = create<PostState>((set, get) => ({
  // Estado Inicial
  postText: '',
  tagsText: '',
  selectedImages: [],
  oldPostId: null,
  editingPostId: null,
  connections: [],
  isPosting: false,
  postProgress: 0,
  pendingPosts: {},

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

      // prettier-ignore
      if (platformIndex > -1)
        image.platforms.splice(platformIndex, 1);
      else
        image.platforms.push(platform);

      return { selectedImages: newImages };
    }),
  removeImage: indexToRemove =>
    set(state => ({
      selectedImages: state.selectedImages.filter((_, index) => index !== indexToRemove),
    })),
  clearForm: () => set({ postText: '', selectedImages: [], editingPostId: null }),
  setSelectedImages: images => set({ selectedImages: images }),

  startPosting: (postId: number, platformsToPost: PlatformType[]) =>
    set(state => {
      const newPendingPosts = {
        ...state.pendingPosts,
        [postId]: {
          postId,
          progress: 0,
          platformsCount: platformsToPost.length,
        },
      };

      return {
        oldPostId: postId,
        isPosting: true,
        pendingPosts: newPendingPosts,
        postProgress: globalProgress(newPendingPosts),
        connections: state.connections.map(c =>
          platformsToPost.includes(c.platform) ? { ...c, postStatus: PENDING } : { ...c, postStatus: IDLE },
        ),
      };
    }),
  updatePostProgress: (postId: number | string | undefined | null, update) =>
    set(state => {
      // prettier-ignore
      if (postId === undefined || postId === null)
        return {};

      const id: number = typeof postId === 'string' ? Number.parseInt(postId, 10) : (postId as number);

      // prettier-ignore
      if (isNaN(id)) 
        return {};

      const postToUpdate = state.pendingPosts[id];
      let newPendingPosts = state.pendingPosts;
      if (postToUpdate && 'progress' in update) {
        newPendingPosts = {
          ...state.pendingPosts,
          [id]: { ...postToUpdate, progress: update.progress },
        };
      }
      let newConnections = state.connections;
      if ('platform' in update && 'status' in update && state.oldPostId === id && state.oldPostId !== null) {
        let status: PostStatusType;
        switch (update.status) {
          case 'error':
            status = ERROR;
            break;
          case 'success':
          case 'scheduled':
            status = SUCCESS;
            break;
          default:
            status = PENDING;
        }
        newConnections = state.connections.map(c =>
          c.platform === update.platform ? { ...c, postStatus: status } : c,
        );
      }
      return {
        pendingPosts: newPendingPosts,
        postProgress: globalProgress(newPendingPosts),
        connections: newConnections,
      };
    }),
  removePendingPost: postId =>
    set(state => {
      const newPendingPosts = { ...state.pendingPosts };
      delete newPendingPosts[postId];

      const hasRemaining = Object.keys(newPendingPosts).length > 0;

      return {
        pendingPosts: newPendingPosts,
        postProgress: hasRemaining ? globalProgress(newPendingPosts) : 0,
        isPosting: hasRemaining,
      };
    }),
  finishPosting: (postId: number | string | undefined | null, summary) =>
    set(state => {
      // prettier-ignore
      if (postId === undefined || postId === null)
        return {};

      const id: number = typeof postId === 'string' ? Number.parseInt(postId, 10) : (postId as number);

      // prettier-ignore
      if (isNaN(id)) 
        return {};

      const newPendingPosts = { ...state.pendingPosts };
      delete newPendingPosts[id];
      const hasRemaining = Object.keys(newPendingPosts).length > 0;

      let newConnections = state.connections;

      if (state.oldPostId === id && state.oldPostId !== null) {
        newConnections = state.connections.map(c => {
          if (summary.successful.includes(c.platform)) return { ...c, postStatus: SUCCESS as PostStatusType };
          if (summary.failed.includes(c.platform)) return { ...c, postStatus: ERROR as PostStatusType };
          return c;
        });
      }

      return {
        pendingPosts: newPendingPosts,
        postProgress: hasRemaining ? globalProgress(newPendingPosts) : 100,
        connections: newConnections,
        isPosting: hasRemaining,
        oldPostId: hasRemaining ? state.oldPostId : null,
      };
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
  resetPostStatus: (postId?: number | null) =>
    set(state => {
      setTimeout(() => {
        set(s => {
          // prettier-ignore
          if (postId != null && s.oldPostId !== postId && s.oldPostId !== null)
            return {};

          return {
            connections: s.connections.map(c => ({ ...c, postStatus: IDLE })),
          };
        });
      }, 5000);
      return {};
    }),
}));
