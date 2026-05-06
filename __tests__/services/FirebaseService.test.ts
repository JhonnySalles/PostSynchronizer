import { firebaseService } from 'src/services/FirebaseService.native';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import { usePostStore } from 'src/store/usePostStore';
import PostDao from 'src/dao/PostDao';

// Mocks
jest.mock('@react-native-firebase/database', () => {
  const mOn = jest.fn();
  const mOff = jest.fn();
  const mRef = jest.fn(() => ({
    on: mOn,
    off: mOff,
  }));
  return jest.fn(() => ({
    ref: mRef,
  }));
});

jest.mock('@react-native-firebase/auth', () => {
  const mSignInAnonymously = jest.fn(() => Promise.resolve({ user: { uid: 'test-uid' } }));
  const mAuth: any = () => ({
    currentUser: null,
    signInAnonymously: mSignInAnonymously,
  });
  return mAuth;
});

jest.mock('src/dao/PostDao');
jest.mock('src/store/usePostStore', () => ({
  usePostStore: {
    getState: jest.fn(),
  },
}));

describe('FirebaseService', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton state
    (firebaseService as any).isListening = false;
    (firebaseService as any).appInstanceId = null;
    (firebaseService as any).processingFinish.clear();
    (firebaseService as any).lastProcessedState.clear();
  });

  test('deve realizar login anônimo ao inicializar', async () => {
    await firebaseService.initialize();
    expect(auth().signInAnonymously).toHaveBeenCalled();
    expect(firebaseService.getAppInstanceId()).toBe('test-uid');
  });

  test('deve ativar listeners ao iniciar escuta', async () => {
    // Garante que temos um UID
    (auth() as any).currentUser = { uid: 'test-uid' };
    await firebaseService.initialize();
    
    firebaseService.listenForPostUpdates();
    
    const dbRef = database().ref();
    expect(dbRef.on).toHaveBeenCalledWith('child_added', expect.any(Function));
    expect(dbRef.on).toHaveBeenCalledWith('child_changed', expect.any(Function));
  });

  test('deve processar atualizações de post e atualizar store/dao', async () => {
    const mockSnapshot = {
      exists: () => true,
      key: '123',
      val: () => ({
        _summary: {
          successful: ['tumblr'],
          failed: [{ platform: 'x', error: 'limit' }],
        },
      }),
      ref: { remove: jest.fn().mockResolvedValue(null) },
    };

    const mockStore = {
      finishPosting: jest.fn(),
      resetPostStatus: jest.fn(),
      removePendingPost: jest.fn(),
      editingPostId: 123,
    };
    (usePostStore.getState as jest.Mock).mockReturnValue(mockStore);

    // UID Mock
    (auth() as any).currentUser = { uid: 'test-uid' };
    await firebaseService.initialize();

    // Recupera o callback de processamento
    const dbRef = database().ref();
    const processPostsCallback = (dbRef.on as jest.Mock).mock.calls[0][1];

    await processPostsCallback(mockSnapshot);

    expect(PostDao.updateLastSync).toHaveBeenCalledWith(123, ['tumblr']);
    expect(mockStore.finishPosting).toHaveBeenCalledWith(123, {
      successful: ['tumblr'],
      failed: ['x'],
    });
    expect(mockSnapshot.ref.remove).toHaveBeenCalled();
  });

  test('deve parar de ouvir ao chamar stopListening', async () => {
    (auth() as any).currentUser = { uid: 'test-uid' };
    await firebaseService.initialize();
    firebaseService.listenForPostUpdates();
    firebaseService.stopListening();

    const dbRef = database().ref();
    expect(dbRef.off).toHaveBeenCalled();
  });
});
