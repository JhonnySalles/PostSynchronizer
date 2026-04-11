import { act } from 'react';
import { usePostStore } from 'src/store/usePostStore';
import { X, BLUESKY, TUMBLR } from 'src/constants/platforms';
import { PENDING, SUCCESS, ERROR, IDLE } from 'src/constants/app';

describe('usePostStore', () => {
  // Resetar o estado da store antes de cada teste
  beforeEach(() => {
    act(() => {
      usePostStore.getState().clearForm();
      const state = usePostStore.getState();
      // Garantir reset total de estados que não estão no clearForm
      state.isPosting = false;
      state.postProgress = 0;
      state.pendingPosts = {};
      state.connections = [];
      state.oldPostId = null;
    });
  });

  describe('Gerenciamento de Imagens', () => {
    test('deve adicionar imagens respeitando o limite de 4 para X e BlueSky', () => {
      const mockImages = Array(6).fill({ path: 'test.jpg', platforms: [X, BLUESKY, TUMBLR] });
      
      act(() => {
        usePostStore.getState().addImages(mockImages, [X, BLUESKY, TUMBLR]);
      });

      const { selectedImages } = usePostStore.getState();
      
      // Os índices 0, 1, 2, 3 devem ter X e BlueSky
      expect(selectedImages[0].platforms).toContain(X);
      expect(selectedImages[3].platforms).toContain(BLUESKY);
      
      // Os índices 4 e 5 NÃO devem ter X nem BlueSky por conta do limite
      expect(selectedImages[4].platforms).not.toContain(X);
      expect(selectedImages[4].platforms).not.toContain(BLUESKY);
      expect(selectedImages[4].platforms).toContain(TUMBLR);
    });

    test('deve alternar plataformas de uma imagem (toggleImagePlatform)', () => {
      act(() => {
        usePostStore.getState().addImages([{ path: 'img.jpg', platforms: [TUMBLR] }], [TUMBLR]);
      });

      // Adiciona X
      act(() => {
        usePostStore.getState().toggleImagePlatform(0, X);
      });
      expect(usePostStore.getState().selectedImages[0].platforms).toContain(X);

      // Remove X
      act(() => {
        usePostStore.getState().toggleImagePlatform(0, X);
      });
      expect(usePostStore.getState().selectedImages[0].platforms).not.toContain(X);
    });
  });

  describe('Fluxo de Postagem (Status e Progresso)', () => {
    test('deve iniciar postagem corretamente (startPosting)', () => {
      const platforms = [X, TUMBLR];
      const connections = [
        { platform: X, active: true, postStatus: IDLE },
        { platform: TUMBLR, active: true, postStatus: IDLE }
      ];

      act(() => {
        usePostStore.setState({ connections });
        usePostStore.getState().startPosting(123, platforms);
      });

      const state = usePostStore.getState();
      expect(state.isPosting).toBe(true);
      expect(state.oldPostId).toBe(123);
      expect(state.pendingPosts[123]).toBeDefined();
      expect(state.connections.find(c => c.platform === X)?.postStatus).toBe(PENDING);
    });

    test('deve atualizar progresso global (updatePostProgress)', () => {
      act(() => {
        usePostStore.getState().startPosting(1, [X, TUMBLR]); // Peso 2
        usePostStore.getState().updatePostProgress(1, { progress: 0.5 });
      });

      expect(usePostStore.getState().postProgress).toBe(0.5);
    });

    test('deve atualizar status das conexões individualmente (updatePostProgress)', () => {
      act(() => {
        usePostStore.setState({ oldPostId: 1, connections: [{ platform: X, active: true, postStatus: PENDING }] });
        usePostStore.getState().updatePostProgress(1, { platform: X, status: 'success' });
      });

      expect(usePostStore.getState().connections.find(c => c.platform === X)?.postStatus).toBe(SUCCESS);
    });

    test('deve finalizar postagem e limpar estado (finishPosting)', () => {
      const summary = { successful: [X], failed: [TUMBLR] };
      
      act(() => {
        usePostStore.setState({ 
          oldPostId: 1, 
          pendingPosts: { 1: { postId: 1, progress: 0.5, platformsCount: 2 } },
          connections: [
            { platform: X, active: true, postStatus: PENDING },
            { platform: TUMBLR, active: true, postStatus: PENDING }
          ]
        });
        usePostStore.getState().finishPosting(1, summary);
      });

      const state = usePostStore.getState();
      expect(state.pendingPosts[1]).toBeUndefined();
      expect(state.connections.find(c => c.platform === X)?.postStatus).toBe(SUCCESS);
      expect(state.connections.find(c => c.platform === TUMBLR)?.postStatus).toBe(ERROR);
      expect(state.isPosting).toBe(false);
    });
  });

  describe('Cálculo de Progresso Global', () => {
    test('deve calcular progresso ponderado corretamente para múltiplos posts', () => {
       act(() => {
         // Post 1: 2 plataformas, 50% concluído
         usePostStore.getState().startPosting(1, [X, TUMBLR]);
         usePostStore.getState().updatePostProgress(1, { progress: 0.5 });

         // Post 2: 1 plataforma, 100% concluído
         usePostStore.getState().startPosting(2, [BLUESKY]);
         usePostStore.getState().updatePostProgress(2, { progress: 1 });
       });

       // Cálculo: ((0.5 * 2) + (1.0 * 1)) / (2 + 1) = 2 / 3 = ~0.666
       expect(usePostStore.getState().postProgress).toBeCloseTo(0.666, 2);
    });
  });
});
