import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getDatabase, ref, onChildAdded, onChildChanged, off, remove } from 'firebase/database';
import { AppState, AppStateStatus } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Logger from './LoggerService';
import PostDao from 'src/dao/PostDao';
import { PlatformType } from 'src/constants/platforms';
import { usePostStore } from 'src/store/usePostStore';
import { FIREBASE_API_KEY, FIREBASE_PROJECT_ID, FIREBASE_DATABASE_URL } from '@env';

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: `${FIREBASE_PROJECT_ID}.firebaseapp.com`,
  databaseURL: FIREBASE_DATABASE_URL,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: `${FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: '', // Opcional para RTDB
  appId: `1:1:web:${FIREBASE_PROJECT_ID}`, // Placeholder se não houver App ID real
};

export type FirebasePostUpdate = {
  isFinish: boolean;
  data: Record<PlatformType, { status: 'success' | 'error'; error?: string }>;
  summary?: {
    successful: PlatformType[];
    failed: PlatformType[];
  };
};

const BASE_DOCUMENT = 'post_status';

class FirebaseService {
  private appInstanceId: string | null = null;
  private isListening = false;
  private appBackground: any = null;
  private processingFinish = new Set<number>();
  private lastProcessedState = new Map<number, string>();
  private db: any = null;
  private auth: any = null;

  public async initialize(): Promise<void> {
    try {
      this.appInstanceId = DeviceInfo.getUniqueIdSync();
      Logger.info('[Firebase Windows] Machine ID:', this.appInstanceId);

      const app = initializeApp(firebaseConfig);
      this.db = getDatabase(app);
      this.auth = getAuth(app);

      await this.anonymousLogin();
      this.listenForPostUpdates();

      if (!this.appBackground) {
        this.appBackground = AppState.addEventListener('change', this.handleAppStateChange);
      }
    } catch (error) {
      Logger.error(error as Error, { message: '[FirebaseService Windows] Falha na inicialização.' });
    }
  }

  private handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      this.listenForPostUpdates();
    } else if (nextAppState.match(/inactive|background/)) {
      this.stopListening();
    }
  };

  private async anonymousLogin(): Promise<void> {
    try {
      if (this.auth.currentUser) return;
      await signInAnonymously(this.auth);
      Logger.info('[Firebase Windows] Login anônimo bem-sucedido.');
    } catch (error) {
      Logger.warn(
        '[Firebase Windows] Erro no login anônimo (pode ser ignorado se as regras permitirem acesso público):',
        error,
      );
    }
  }

  public getAppInstanceId(): string | null {
    return this.appInstanceId;
  }

  public listenForPostUpdates(): void {
    if (!this.appInstanceId || !this.db) return;
    if (this.isListening) return;

    const dbRef = ref(this.db, `/${BASE_DOCUMENT}/${this.appInstanceId}`);
    onChildAdded(dbRef, this.processPosts);
    onChildChanged(dbRef, this.processPosts);

    this.isListening = true;
    Logger.info(`[Firebase Windows] Ouvindo updates em: /${BASE_DOCUMENT}/${this.appInstanceId}`);
  }

  public stopListening(): void {
    if (!this.appInstanceId || !this.isListening || !this.db) return;

    const dbRef = ref(this.db, `/${BASE_DOCUMENT}/${this.appInstanceId}`);
    off(dbRef);

    this.isListening = false;
  }

  private processPosts = async (snapshot: any) => {
    if (!snapshot.exists()) return;

    const postIdStr = snapshot.key;
    const data = snapshot.val();
    if (!postIdStr || !data || !data._summary) return;

    const postId = parseInt(postIdStr, 10);
    if (this.processingFinish.has(postId)) return;

    const currentDataString = JSON.stringify(data);
    if (this.lastProcessedState.get(postId) === currentDataString) return;

    this.lastProcessedState.set(postId, currentDataString);
    this.processingFinish.add(postId);

    const { finishPosting, resetPostStatus, removePendingPost, editingPostId } = usePostStore.getState();
    const isCurrentPost = editingPostId === postId;

    const summary = data._summary;
    const successfulPlatforms: PlatformType[] = summary.successful || [];
    const failedPlatforms: PlatformType[] = summary.failed ? summary.failed.map((f: any) => f.platform) : [];

    await this.finalizePostSync(postId, successfulPlatforms);

    try {
      await remove(snapshot.ref);
    } catch (_) {
      // Ignore removal errors during sync
    }

    removePendingPost(postId);
    this.lastProcessedState.delete(postId);
    setTimeout(() => this.processingFinish.delete(postId), 5000);

    if (isCurrentPost) {
      finishPosting(postId, { successful: successfulPlatforms, failed: failedPlatforms });
      resetPostStatus(postId);
    }
  };

  private async finalizePostSync(postId: number, successfulPlatforms: string[]) {
    await PostDao.updateLastSync(postId, successfulPlatforms);
    Logger.info(`[Firebase Windows] Post ${postId} finalizado.`);
  }
}

export const firebaseService = new FirebaseService();
