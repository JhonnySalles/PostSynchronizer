import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from 'src/screens/HomeScreen';
import { usePostStore } from 'src/store/usePostStore';
import PostDao from 'src/dao/PostDao';
import AuthTokenDao from 'src/dao/AuthTokenDao';
import { apiService } from 'src/services/ApiService';
import ImagePicker from 'react-native-image-crop-picker';
import Toast from 'react-native-toast-message';
import { TUMBLR, X } from 'src/constants/platforms';
import { Alert } from 'react-native';

// Mocks
jest.mock('src/dao/AuthTokenDao');
jest.mock('src/dao/PostDao');
jest.mock('src/services/ApiService');
jest.mock('react-native-image-crop-picker', () => ({
  openPicker: jest.fn(),
  openCropper: jest.fn(),
}));
jest.mock('src/utils/permissions', () => ({
  requestGalleryPermission: jest.fn(() => Promise.resolve(true)),
  requestReadPermission: jest.fn(() => Promise.resolve(true)),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: any) => {
    const React = require('react');
    React.useEffect(cb, []);
  },
}));

// Mock do Zustand store
const mockSetPostText = jest.fn();
const mockClearForm = jest.fn();
const mockAddImages = jest.fn();

let mockStoreState: any = {
  postText: '',
  tagsText: '',
  selectedImages: [],
  editingPostId: null,
  connections: [],
  isPosting: false,
  postProgress: {},
  setPostText: mockSetPostText,
  setTagsText: jest.fn(),
  addImages: mockAddImages,
  clearForm: mockClearForm,
  startPosting: jest.fn(),
  updatePostProgress: jest.fn(),
  finishPosting: jest.fn(),
  mergeConnections: jest.fn(),
  resetPostStatus: jest.fn(),
  setSelectedImages: jest.fn(),
};

jest.mock('src/store/usePostStore', () => ({
  usePostStore: Object.assign(
    (selector: any) => (selector ? selector(mockStoreState) : mockStoreState),
    {
        getState: () => mockStoreState,
        setState: (val: any) => {
            Object.assign(mockStoreState, val);
        },
    }
  ),
}));

describe('HomeScreen', () => {
  const mockNavigation = {
    setOptions: jest.fn(),
    setParams: jest.fn(),
    navigate: jest.fn(),
  };

  const mockRoute = {
    params: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState.postText = '';
    mockStoreState.tagsText = '';
    mockStoreState.selectedImages = [];
    (AuthTokenDao.getActivePlatforms as jest.Mock).mockResolvedValue([TUMBLR]);
    (PostDao.getTagSuggestions as jest.Mock).mockResolvedValue(['tag1', 'tag2']);
  });

  test('deve renderizar campos básicos', () => {
    const { getByPlaceholderText } = render(
      <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );
    expect(getByPlaceholderText('O que você deseja postar?')).toBeTruthy();
  });

  test('deve atualizar texto do post no store ao digitar', () => {
    const { getByTestId } = render(
      <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );
    
    const input = getByTestId('post-text-input');
    fireEvent.changeText(input, 'Olá mundo');
    
    expect(mockSetPostText).toHaveBeenCalledWith('Olá mundo');
  });

  test('deve abrir seletor de imagem e adicionar ao store', async () => {
    (ImagePicker.openPicker as jest.Mock).mockResolvedValue([
      { path: 'file://test.jpg' }
    ]);
    
    const { getByTestId } = render(
      <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );
    
    const imageBtn = getByTestId('attach-image-button');
    await act(async () => {
      fireEvent.press(imageBtn);
    });

    expect(ImagePicker.openPicker).toHaveBeenCalled();
    expect(mockAddImages).toHaveBeenCalled();
  });

  test('deve salvar rascunho se houver conteúdo', async () => {
    mockStoreState.postText = 'Conteúdo rascunho';
    (PostDao.create as jest.Mock).mockResolvedValue(123);

    const { getByTestId } = render(
      <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );
    
    const draftBtn = getByTestId('draft-action-button');
    await act(async () => {
      fireEvent.press(draftBtn);
    });

    expect(PostDao.create).toHaveBeenCalled();
    expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({
      type: 'success',
      text1: 'Sucesso!'
    }));
  });

  test('deve mostrar alerta se tentar salvar rascunho vazio', async () => {
    mockStoreState.postText = '';
    mockStoreState.selectedImages = [];
    const spyAlert = jest.spyOn(Alert, 'alert');

    const { getByTestId } = render(
      <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );
    
    const draftBtn = getByTestId('draft-action-button');
    fireEvent.press(draftBtn);

    expect(spyAlert).toHaveBeenCalledWith('Rascunho Vazio', expect.any(String));
  });

  test('deve executar fluxo de postagem completa', async () => {
    mockStoreState.postText = 'Texto para postar';
    mockStoreState.connections = [{ platform: TUMBLR, active: true, postStatus: 'idle' }];
    (PostDao.create as jest.Mock).mockResolvedValue(456);
    (AuthTokenDao.getCredentialsForPlatform as jest.Mock).mockResolvedValue({ blogName: 'testblog' });
    (PostDao.platformSuccessCount as jest.Mock).mockResolvedValue(0);

    const mockStartPosting = jest.fn();
    const mockUpdatePostProgress = jest.fn();
    const mockFinishPosting = jest.fn();
    mockStoreState.startPosting = mockStartPosting;
    mockStoreState.updatePostProgress = mockUpdatePostProgress;
    mockStoreState.finishPosting = mockFinishPosting;

    (apiService.postAll as jest.Mock).mockImplementation((payload, onProgress) => {
      // Simula progresso
      onProgress({ type: 'progress', postId: 456, progress: 50 });
      onProgress({ type: 'summary', postId: 456, summary: { successful: [TUMBLR], failed: [] } });
      return Promise.resolve({ success: true });
    });

    const { getByTestId } = render(
      <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );
    
    const postBtn = getByTestId('post-action-button');
    await act(async () => {
      fireEvent.press(postBtn);
    });

    expect(apiService.postAll).toHaveBeenCalled();
    expect(mockStartPosting).toHaveBeenCalledWith(456, [TUMBLR]);
    expect(mockUpdatePostProgress).toHaveBeenCalledWith(456, expect.objectContaining({ progress: 50 }));
    expect(mockFinishPosting).toHaveBeenCalledWith(456, { successful: [TUMBLR], failed: [] });
    
    // Verifica persistência final
    expect(PostDao.update).toHaveBeenCalledWith(456, expect.objectContaining({
      platformsSuccess: TUMBLR,
      status: 'posted'
    }));
  });

  test('deve postar em plataforma única via clique longo no ícone', async () => {
    mockStoreState.postText = 'Texto para post único';
    mockStoreState.connections = [{ platform: TUMBLR, active: true, postStatus: 'idle' }];
    (PostDao.create as jest.Mock).mockResolvedValue(789);
    (apiService.postSingle as jest.Mock).mockResolvedValue({ success: true });

    const { getByTestId } = render(
      <HomeScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );
    
    const tumblrIcon = getByTestId('platform-status-icon-tumblr');
    await act(async () => {
      fireEvent(tumblrIcon, 'onLongPress');
    });

    expect(apiService.postSingle).toHaveBeenCalledWith(TUMBLR, expect.any(Object));
    expect(PostDao.update).toHaveBeenCalledWith(789, expect.objectContaining({ platformsSuccess: TUMBLR }));
  });
});
