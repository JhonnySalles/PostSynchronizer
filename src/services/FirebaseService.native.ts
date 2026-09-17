import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import { AppState, AppStateStatus } from 'react-native';
import Logger from './LoggerService';
import Toast from 'react-native-toast-message';
import PostDao from 'src/dao/PostDao';
import { PlatformType } from 'src/constants/platforms';
import { usePostStore } from 'src/store/usePostStore';
import { threadsJobService } from './ThreadsJobService';

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

  public async initialize(): Promise<void> {
    try {
      await this.anonymousLogin();
      this.listenForPostUpdates();

      // prettier-ignore
      if (!this.appBackground) 
        this.appBackground = AppState.addEventListener('change', this.handleAppStateChange);
    } catch (error) {
      Logger.error(error as Error, { message: '[FirebaseService] Falha na inicialização.' });
    }
  }

  private handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      Logger.info('[FirebaseService] App em primeiro plano. Processando pendentes e reativando listener.');
      this.listenForPostUpdates();
    } else if (nextAppState.match(/inactive|background/)) {
      Logger.info('[FirebaseService] App em segundo plano. Desativando listener do Firebase.');
      this.stopListening();
    }
  };

  private async anonymousLogin(): Promise<void> {
    if (auth().currentUser) {
      this.appInstanceId = auth().currentUser!.uid;
      Logger.info('[FirebaseService] Já logado anonimamente com ID:', this.appInstanceId);
      return;
    }

    Logger.info('[FirebaseService] Realizando login anônimo...');
    const userCredential = await auth().signInAnonymously();
    this.appInstanceId = userCredential.user.uid;
    Logger.info('[FirebaseService] Login anônimo bem-sucedido com ID:', this.appInstanceId);
  }

  public getAppInstanceId(): string | null {
    return this.appInstanceId;
  }

  public listenForPostUpdates(): void {
    if (!this.appInstanceId) {
      Logger.warn('[FirebaseService] Não é possível ouvir updates sem um appInstanceId.');
      return;
    }

    // prettier-ignore
    if (this.isListening) 
        return;

    const dbRef = database().ref(`/${BASE_DOCUMENT}/${this.appInstanceId}`);
    dbRef.on('child_added', this.processPosts);
    dbRef.on('child_changed', this.processPosts);

    this.isListening = true;
    Logger.info('[FirebaseService] Listener global ativado na raiz do documento.');
  }

  public stopListening(): void {
    // prettier-ignore
    if (!this.appInstanceId || !this.isListening) 
        return;

    const dbRef = database().ref(`/${BASE_DOCUMENT}/${this.appInstanceId}`);
    dbRef.off('child_added', this.processPosts);
    dbRef.off('child_changed', this.processPosts);

    this.isListening = false;
  }

  public async syncAllPosts(): Promise<void> {
    if (!this.appInstanceId) {
      Logger.warn('[FirebaseService] Não é possível sincronizar posts sem um appInstanceId.');
      return;
    }

    try {
      Logger.info(`[FirebaseService] Sincronizando todos os posts do Firebase para /${BASE_DOCUMENT}/${this.appInstanceId}...`);
      const snapshot = await database().ref(`/${BASE_DOCUMENT}/${this.appInstanceId}`).once('value');
      if (!snapshot.exists()) {
        Logger.info('[FirebaseService] Nenhum post pendente no Firebase.');
        return;
      }

      const promises: Promise<void>[] = [];
      snapshot.forEach((childSnapshot: any) => {
        promises.push(this.processPosts(childSnapshot));
        return undefined;
      });

      await Promise.all(promises);
      Logger.info('[FirebaseService] Sincronização manual de todos os posts concluída.');
    } catch (error) {
      Logger.error(error as Error, { message: '[FirebaseService] Erro ao sincronizar todos os posts.' });
    }
  }

  private processPosts = async (snapshot: any) => {
    // prettier-ignore
    if (!snapshot.exists()) 
        return;

    const postIdStr = snapshot.key;
    const data = snapshot.val();
    // prettier-ignore
    if (!postIdStr || !data || !data._summary) 
        return;

    const postId = parseInt(postIdStr, 10);

    // prettier-ignore
    if (this.processingFinish.has(postId))
      return;

    const currentDataString = JSON.stringify(data);
    // prettier-ignore
    if (this.lastProcessedState.get(postId) === currentDataString)
      return;

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
      await snapshot.ref.remove();
      // eslint-disable-next-line no-empty
    } catch (_) {}

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
    Logger.info(`[FirebaseService] Post ${postId} finalizado e sincronizado.`);
  }

  public async updateThreadsToken(token: string, expiresAt: string): Promise<void> {
    try {
      await database().ref('/chaves').update({
        THREADS_ACCESS_TOKEN: token,
        THREADS_TOKEN_EXPIRES_AT: expiresAt,
      });
      Logger.info('[FirebaseService] Tokens do Threads atualizados com sucesso no nó /chaves.');
    } catch (error) {
      Logger.error(error as Error, { message: '[FirebaseService] Erro ao atualizar tokens do Threads no Firebase.' });
      throw error;
    }
  }
}

export const firebaseService = new FirebaseService();
