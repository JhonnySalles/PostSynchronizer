import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getDatabase, ref, onChildAdded, onChildChanged, off, remove, update, get } from 'firebase/database';
import { AppState, AppStateStatus } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Logger from './LoggerService';
import Toast from 'react-native-toast-message';
import PostDao from 'src/dao/PostDao';
import { PlatformType } from 'src/constants/platforms';
import { usePostStore } from 'src/store/usePostStore';
import { FIREBASE_API_KEY, FIREBASE_PROJECT_ID, FIREBASE_DATABASE_URL } from '@env';
import { threadsJobService } from './ThreadsJobService';

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
  data: Record<PlatformType, { status: 'success' | 'error' | 'queued' | 'scheduled'; error?: string }>;
  summary?: {
    successful: (PlatformType | { platform: PlatformType; [key: string]: any })[];
    failed: (PlatformType | { platform: PlatformType; reason?: string; [key: string]: any })[];
    scheduled?: (PlatformType | { platform: PlatformType; jobId?: string; [key: string]: any })[];
    queued?: (PlatformType | { platform: PlatformType; jobId?: string; [key: string]: any })[];
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

  public async syncAllPosts(): Promise<void> {
    if (!this.appInstanceId || !this.db) {
      Logger.warn('[Firebase Windows] Não é possível sincronizar posts sem appInstanceId ou db.');
      return;
    }

    try {
      Logger.info(`[Firebase Windows] Sincronizando todos os posts de /${BASE_DOCUMENT}/${this.appInstanceId}...`);
      const dbRef = ref(this.db, `/${BASE_DOCUMENT}/${this.appInstanceId}`);
      const snapshot = await get(dbRef);

      if (!snapshot.exists()) {
        Logger.info('[Firebase Windows] Nenhum post pendente no Firebase.');
        return;
      }

      const promises: Promise<void>[] = [];
      snapshot.forEach((childSnapshot: any) => {
        promises.push(this.processPosts(childSnapshot));
      });

      await Promise.all(promises);
      Logger.info('[Firebase Windows] Sincronização manual de todos os posts concluída.');
    } catch (error) {
      Logger.error(error as Error, { message: '[Firebase Windows] Erro ao sincronizar todos os posts.' });
    }
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

    const { finishPosting, resetPostStatus, removePendingPost, editingPostId, oldPostId } = usePostStore.getState();
    const isCurrentPost = editingPostId === postId || oldPostId === postId;

    const summary = data._summary;
    const extractPlatformName = (item: any): PlatformType => {
      if (typeof item === 'string') return item as PlatformType;
      return (item?.platform || item?.name || '') as PlatformType;
    };

    // Extrair jobIds do Threads se houver em scheduled ou queued
    const extractAndRegisterThreadsJobs = (items: any[]) => {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        if (typeof item === 'object' && item !== null) {
          const platform = (item.platform || item.name || '').toLowerCase();
          if (platform === 'threads' && item.jobId) {
            threadsJobService.addJob(item.jobId, postId);
          }
        }
      }
    };

    extractAndRegisterThreadsJobs(summary.scheduled || []);
    extractAndRegisterThreadsJobs(summary.queued || []);

    const successfulPlatforms: PlatformType[] = (summary.successful || []).map(extractPlatformName).filter(Boolean);
    const failedPlatforms: PlatformType[] = (summary.failed || []).map(extractPlatformName).filter(Boolean);
    const scheduledPlatforms: PlatformType[] = (summary.scheduled || []).map(extractPlatformName).filter(Boolean);
    const queuedPlatforms: PlatformType[] = (summary.queued || []).map(extractPlatformName).filter(Boolean);
    const combinedQueuedPlatforms = Array.from(new Set([...queuedPlatforms, ...scheduledPlatforms]));

    await this.finalizePostSync(postId, successfulPlatforms, combinedQueuedPlatforms, failedPlatforms);

    const updatedPost = await PostDao.getById(postId);
    const allSuccessfulPlatforms: PlatformType[] = updatedPost?.platformsSuccess
      ? (updatedPost.platformsSuccess.split(',').map((p: string) => p.trim()).filter(Boolean) as PlatformType[])
      : successfulPlatforms;

    try {
      await remove(snapshot.ref);
    } catch (_) {
      // Ignore removal errors during sync
    }

    if (combinedQueuedPlatforms.length === 0) {
      removePendingPost(postId);
    }
    this.lastProcessedState.delete(postId);
    setTimeout(() => this.processingFinish.delete(postId), 5000);

    if (failedPlatforms.length > 0) {
      Toast.show({
        type: 'error',
        text1: 'Falha na publicação',
        text2: `Falha ao publicar em: ${failedPlatforms.join(', ')}`,
        position: 'top',
        visibilityTime: 5000,
      });
    }

    if (isCurrentPost) {
      finishPosting(postId, {
        successful: allSuccessfulPlatforms,
        failed: failedPlatforms,
        scheduled: scheduledPlatforms,
        queued: queuedPlatforms,
      });
      resetPostStatus(postId);
    }
  };

  private async finalizePostSync(postId: number, successfulPlatforms: string[], queuedPlatforms: string[] = [], failedPlatforms: string[] = []) {
    await PostDao.updateLastSync(postId, successfulPlatforms, queuedPlatforms, failedPlatforms);
    usePostStore.getState().triggerHistoryUpdate();
    Logger.info(`[Firebase Windows] Post ${postId} finalizado.`);
  }

  public async updateThreadsToken(token: string, expiresAt: string): Promise<void> {
    try {
      if (!this.db) return;
      const dbRef = ref(this.db, '/chaves');
      await update(dbRef, {
        THREADS_ACCESS_TOKEN: token,
        THREADS_TOKEN_EXPIRES_AT: expiresAt,
      });
      Logger.info('[Firebase Windows] Tokens do Threads atualizados com sucesso no nó /chaves.');
    } catch (error) {
      Logger.error(error as Error, { message: '[Firebase Windows] Erro ao atualizar tokens do Threads no Firebase.' });
      throw error;
    }
  }
}

export const firebaseService = new FirebaseService();
