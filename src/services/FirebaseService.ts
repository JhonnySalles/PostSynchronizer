import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import { AppState, AppStateStatus } from 'react-native';
import Logger from './LoggerService';
import PostDao from 'src/dao/PostDao';
import { PlatformType } from 'src/constants/platforms';
import { POSTED, PostType } from 'src/constants/app';
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

  public async initialize(): Promise<void> {
    try {
      await this.anonymousLogin();
      await this.processPendingCallbacks();

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
      await this.processPendingCallbacks();
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
    if (!postIdStr || !data) 
        return;

    const postId = parseInt(postIdStr, 10);
    const { updatePostProgress, finishPosting, resetPostStatus } = usePostStore.getState();

    for (const platformKey in data) {
      // prettier-ignore
      if (platformKey === '_summary') 
        continue;

      const platformUpdate = data[platformKey];
      if (platformUpdate && platformUpdate.status) {
        updatePostProgress(postId, {
          platform: platformKey as PlatformType,
          status: platformUpdate.status,
        });
      }
    }

    const isFinish = !!data._summary;

    if (isFinish) {
      Logger.info(
        `[FirebaseService] Sumário final recebido para o post ${postId}. Finalizando e limpando.`,
        JSON.stringify(data),
      );
      await this.finalizePostSync(postId, data._summary.successful);
      await snapshot.ref.remove();

      finishPosting(postId, { successful: data._summary.successful, failed: data._summary.failed || [] });
      resetPostStatus(postId);
    }
  };

  public async processPendingCallbacks(): Promise<void> {
    const pendingPosts = await PostDao.getPendingPosts();
    // prettier-ignore
    if (pendingPosts.length === 0 || !this.appInstanceId) 
        return;

    Logger.info(`[FirebaseService] Verificando ${pendingPosts.length} posts com callbacks pendentes.`);
    const userDbRef = database().ref(`/${BASE_DOCUMENT}/${this.appInstanceId}`);

    for (const post of pendingPosts) {
      const postSnapshot = await userDbRef.child(post.id.toString()).once('value');
      // prettier-ignore
      if (!postSnapshot.exists()) 
        continue;

      const rtData = postSnapshot.val();
      const originalPlatforms = post.platformsSend?.split(',').map(p => p.trim()) || [];
      // prettier-ignore
      const successfulPlatforms = new Set(post.platformsSuccess?.split(',').map(p => p.trim()).filter(Boolean) || []);

      let hasUpdates = false;
      for (const platform in rtData) {
        // prettier-ignore
        if (platform === '_summary') 
            continue;

        successfulPlatforms.add(platform);
        hasUpdates = true;
        await userDbRef.child(post.id.toString()).child(platform).remove();
      }

      // prettier-ignore
      if (hasUpdates)
        await PostDao.update(post.id, { platformsSuccess: Array.from(successfulPlatforms).join(', '), status: POSTED as PostType });

      const remainingPlatforms = originalPlatforms.filter(p => !successfulPlatforms.has(p));
      if (remainingPlatforms.length === 0) {
        await this.finalizePostSync(post.id, Array.from(successfulPlatforms));
        await userDbRef.child(post.id.toString()).remove();
      }
    }
  }

  private async finalizePostSync(postId: number, successfulPlatforms: string[]) {
    await PostDao.update(postId, {
      pending: false,
      platformsSuccess: successfulPlatforms.join(', '),
    });
    Logger.info(`[FirebaseService] Post ${postId} finalizado e sincronizado.`);
  }
}

export const firebaseService = new FirebaseService();
