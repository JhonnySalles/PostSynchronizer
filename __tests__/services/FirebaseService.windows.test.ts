jest.mock('src/services/LoggerService');

describe('FirebaseService Windows', () => {
  let firebaseService: any;
  let mockInitializeApp: any;
  let mockSignInAnonymously: any;
  let mockOnChildAdded: any;
  let mockOff: any;
  let mockRemove: any;
  let mockPostDao: any;
  let mockPostStore: any;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    
    // Mocks do Firebase Web SDK locais
    jest.doMock('firebase/app', () => ({ initializeApp: jest.fn() }));
    jest.doMock('firebase/auth', () => ({ 
        getAuth: jest.fn(() => ({ currentUser: null })), 
        signInAnonymously: jest.fn().mockResolvedValue({ user: { uid: 'win-uid' } }) 
    }));
    jest.doMock('firebase/database', () => ({
      getDatabase: jest.fn(() => ({})),
      ref: jest.fn(() => ({})),
      onChildAdded: jest.fn(),
      onChildChanged: jest.fn(),
      off: jest.fn(),
      remove: jest.fn().mockResolvedValue(null),
    }));

    jest.doMock('src/dao/PostDao', () => ({
        updateLastSync: jest.fn().mockResolvedValue(null)
    }));

    // Captura mocks
    mockInitializeApp = require('firebase/app').initializeApp;
    mockSignInAnonymously = require('firebase/auth').signInAnonymously;
    mockOnChildAdded = require('firebase/database').onChildAdded;
    mockOff = require('firebase/database').off;
    mockRemove = require('firebase/database').remove;
    mockPostDao = require('src/dao/PostDao');
    mockPostStore = require('src/store/usePostStore').usePostStore;

    // Importa serviço
    firebaseService = require('src/services/FirebaseService.windows').firebaseService;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('deve inicializar e realizar login anônimo', async () => {
    await firebaseService.initialize();

    expect(mockInitializeApp).toHaveBeenCalled();
    expect(mockSignInAnonymously).toHaveBeenCalled();
    expect(mockOnChildAdded).toHaveBeenCalled();
  });

  test('deve processar updates de post e atualizar DAO/Store', async () => {
    await firebaseService.initialize();
    
    expect(mockOnChildAdded).toHaveBeenCalled();
    const processCallback = mockOnChildAdded.mock.calls[0][1];

    const mockSnapshot = {
      exists: () => true,
      key: '123',
      val: () => ({
        _summary: { successful: ['tumblr'], failed: [] }
      }),
      ref: {}
    };

    // Configura o store local (o mesmo usado pelo serviço devido ao require dentro do resetModules)
    mockPostStore.setState({ editingPostId: 123 });
    const finishSpy = jest.spyOn(mockPostStore.getState(), 'finishPosting');

    await processCallback(mockSnapshot);

    expect(mockPostDao.updateLastSync).toHaveBeenCalledWith(123, ['tumblr']);
    expect(finishSpy).toHaveBeenCalledWith(123, expect.objectContaining({ successful: ['tumblr'] }));
    expect(mockRemove).toHaveBeenCalled();

    jest.runAllTimers();
  });

  test('deve parar de ouvir ao chamar stopListening', async () => {
    await firebaseService.initialize();
    firebaseService.stopListening();
    expect(mockOff).toHaveBeenCalled();
  });
});
