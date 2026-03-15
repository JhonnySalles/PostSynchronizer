import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import { AppState, AppStateStatus } from 'react-native';
import Logger from './LoggerService';
import PostDao from 'src/dao/PostDao';
import { PlatformType } from 'src/constants/platforms';
import { usePostStore } from 'src/store/usePostStore';

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

    const { finishPosting, resetPostStatus, removePendingPost, editingPostId } = usePostStore.getState();
    const isCurrentPost = editingPostId === postId;

    const summary = data._summary;
    const successfulPlatforms: PlatformType[] = summary.successful || [];
    const failedPlatforms: PlatformType[] = summary.failed ? summary.failed.map((f: any) => f.platform) : [];
    await this.finalizePostSync(postId, successfulPlatforms);

    try {
      await snapshot.ref.remove();
      // eslint-disable-next-line no-empty
    } catch (_) {}

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
    Logger.info(`[FirebaseService] Post ${postId} finalizado e sincronizado.`);
  }
}

export const firebaseService = new FirebaseService();
