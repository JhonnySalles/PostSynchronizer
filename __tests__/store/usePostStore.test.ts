import { usePostStore } from 'src/store/usePostStore';
import { TUMBLR, X, BLUESKY } from 'src/constants/platforms';
import { IDLE, PENDING, SUCCESS, ERROR } from 'src/constants/app';

describe('usePostStore', () => {
  beforeEach(() => {
    // Reseta o estado da store antes de cada teste
    const { clearForm, resetPostStatus } = usePostStore.getState();
    clearForm();
    // Forçar reset manual do que o clearForm não limpa
    usePostStore.setState({
      postText: '',
      tagsText: '',
      selectedImages: [],
      oldPostId: null,
      editingPostId: null,
      connections: [],
      isPosting: false,
      postProgress: 0,
      pendingPosts: {},
    });
  });

  test('deve iniciar com o estado padrão', () => {
    const state = usePostStore.getState();
    expect(state.postText).toBe('');
    expect(state.selectedImages).toEqual([]);
    expect(state.isPosting).toBe(false);
  });

  test('deve atualizar postText e tagsText', () => {
    const { setPostText, setTagsText } = usePostStore.getState();
    setPostText('Olá Mundo');
    setTagsText('tag1; tag2');

    expect(usePostStore.getState().postText).toBe('Olá Mundo');
    expect(usePostStore.getState().tagsText).toBe('tag1; tag2');
  });

  test('addImages: deve limitar plataformas X e Bluesky a 4 imagens', () => {
    const { addImages } = usePostStore.getState();
    const mockImages = Array(6).fill(null).map((_, i) => ({
      path: `img${i}.jpg`,
      platforms: [TUMBLR, X, BLUESKY]
    }));

    addImages(mockImages, [TUMBLR, X, BLUESKY]);

    const { selectedImages } = usePostStore.getState();
    expect(selectedImages).toHaveLength(6);
    // Imagem 0 (index 0 < 4) deve ter X e Bluesky
    expect(selectedImages[0].platforms).toContain(X);
    // Imagem 5 (index 5 >= 4) NÃO deve ter X e Bluesky
    expect(selectedImages[5].platforms).toContain(TUMBLR);
    expect(selectedImages[5].platforms).not.toContain(X);
    expect(selectedImages[5].platforms).not.toContain(BLUESKY);
  });

  test('startPosting: deve inicializar o progresso e pendências', () => {
    const { startPosting, mergeConnections } = usePostStore.getState();
    mergeConnections([TUMBLR, X], [TUMBLR, X]); // Ativa conexões
    
    startPosting(123, [TUMBLR, X]);

    const state = usePostStore.getState();
    expect(state.isPosting).toBe(true);
    expect(state.pendingPosts[123]).toBeDefined();
    expect(state.pendingPosts[123].platformsCount).toBe(2);
    expect(state.connections.find(c => c.platform === TUMBLR)?.postStatus).toBe(PENDING);
  });

  test('updatePostProgress: deve atualizar o progresso global', () => {
    const { startPosting, updatePostProgress } = usePostStore.getState();
    startPosting(1, [TUMBLR]);
    startPosting(2, [X, BLUESKY]); // Total de 3 plataformas no peso

    // Post 1: 50% (Peso 1)
    updatePostProgress(1, { progress: 50 });
    // Post 2: 100% (Peso 2)
    updatePostProgress(2, { progress: 100 });

    const { postProgress } = usePostStore.getState();
    // (50 * 1 + 100 * 2) / 3 = 250 / 3 = 83.33...
    expect(postProgress).toBeCloseTo(83.33);
  });

  test('finishPosting: deve limpar o post pendente e atualizar conexões', () => {
    const { startPosting, finishPosting, mergeConnections } = usePostStore.getState();
    mergeConnections([TUMBLR], [TUMBLR]);
    startPosting(1, [TUMBLR]);

    finishPosting(1, { successful: [TUMBLR], failed: [] });

    const state = usePostStore.getState();
    expect(state.pendingPosts[1]).toBeUndefined();
    expect(state.isPosting).toBe(false);
    expect(state.connections.find(c => c.platform === TUMBLR)?.postStatus).toBe(SUCCESS);
  });

  test('resetPostStatus: deve voltar conexões para IDLE após 5 segundos', () => {
    jest.useFakeTimers();
    const { mergeConnections, startPosting, finishPosting, resetPostStatus } = usePostStore.getState();
    
    mergeConnections([TUMBLR], [TUMBLR]);
    startPosting(1, [TUMBLR]);
    finishPosting(1, { successful: [TUMBLR], failed: [] });
    
    expect(usePostStore.getState().connections[0].postStatus).toBe(SUCCESS);

    resetPostStatus(1);
    
    jest.advanceTimersByTime(5000);
    
    expect(usePostStore.getState().connections[0].postStatus).toBe(IDLE);
    jest.useRealTimers();
  });
});
