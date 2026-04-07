import { firebaseService } from 'src/services/FirebaseService.windows';
import * as firebaseApp from 'firebase/app';
import * as firebaseDatabase from 'firebase/database';
import * as firebaseAuth from 'firebase/auth';
import PostDao from 'src/dao/PostDao';

// Mocks exatos do Firebase Web SDK
jest.mock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})) }));
jest.mock('firebase/auth', () => ({ 
  getAuth: jest.fn(() => ({})), 
  signInAnonymously: jest.fn(() => Promise.resolve({ user: { uid: 'mock-uid' } })) 
}));
jest.mock('firebase/database', () => {
  const mRef = { parent: {} };
  return {
    getDatabase: jest.fn(() => ({})),
    ref: jest.fn(() => mRef),
    onChildAdded: jest.fn(),
    onChildChanged: jest.fn(),
    off: jest.fn(),
    remove: jest.fn(() => Promise.resolve()),
  };
});

jest.mock('react-native-device-info', () => ({ getUniqueIdSync: jest.fn(() => 'mock-device-id') }));

describe('FirebaseService.windows.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Preparar o estado interno do Singleton
    (firebaseService as any).isListening = false;
    (firebaseService as any).appInstanceId = 'mock-id';
    (firebaseService as any).db = {};
    (firebaseService as any).auth = {};
  });

  test('deve inicializar e fazer login anônimo corretamente', async () => {
    // Definimos o mock da auth antes de inicializar
    (firebaseAuth.getAuth as jest.Mock).mockReturnValue({});
    
    await firebaseService.initialize();
    
    expect(firebaseApp.initializeApp).toHaveBeenCalled();
    expect(firebaseAuth.signInAnonymously).toHaveBeenCalled();
    expect(firebaseDatabase.onChildAdded).toHaveBeenCalled();
  });

  test('stopListening deve remover os listeners (off)', () => {
    (firebaseService as any).isListening = true;
    firebaseService.stopListening();
    expect(firebaseDatabase.off).toHaveBeenCalled();
  });

  describe('Processamento de Posts (processPosts)', () => {
    test('deve processar snapshot e atualizar PostDao', async () => {
      const updateLastSyncSpy = jest.spyOn(PostDao, 'updateLastSync').mockResolvedValue(undefined as any);
      
      await firebaseService.initialize();
      const processPostsCallback = (firebaseDatabase.onChildAdded as jest.Mock).mock.calls[0][1];
      
      const mockSnapshot = {
        exists: () => true,
        key: '123',
        val: () => ({ _summary: { successful: ['x'], failed: [] } }),
        ref: { parent: {} }
      };

      await processPostsCallback(mockSnapshot);

      expect(updateLastSyncSpy).toHaveBeenCalledWith(123, ['x']);
      expect(firebaseDatabase.remove).toHaveBeenCalled();
      
      updateLastSyncSpy.mockRestore();
    });

    test('deve ignorar snapshots inexistentes', async () => {
        await firebaseService.initialize();
        const processPostsCallback = (firebaseDatabase.onChildAdded as jest.Mock).mock.calls[0][1];
        
        const mockSnapshot = { exists: () => false };

        await processPostsCallback(mockSnapshot);
        expect(firebaseDatabase.remove).not.toHaveBeenCalled();
    });
  });
});
