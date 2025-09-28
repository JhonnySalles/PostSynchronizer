import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import Logger from './LoggerService';
import PostDao from 'src/dao/PostDao';
import { PlatformType } from 'src/constants/platforms';
import { IDLE, POSTED, PostType } from 'src/constants/app';
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

  public async initialize(): Promise<void> {
    try {
      await this.anonymousLogin();
      await this.processPendingCallbacks();
    } catch (error) {
      Logger.error(error as Error, { message: '[FirebaseService] Falha na inicialização.' });
    }
  }

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

  public listenForPostUpdates(postId: number, onFinish: () => void): () => void {
    if (!this.appInstanceId) {
      Logger.warn('[FirebaseService] Não é possível ouvir updates sem um appInstanceId.');
      return () => {};
    }

    const dbRef = database().ref(`/${BASE_DOCUMENT}/${this.appInstanceId}/${postId}`);

    const onValueChange = (snapshot: any) => {
      // prettier-ignore
      if (!snapshot.exists())
        return;

      const data = snapshot.val();
      const state = usePostStore.getState();

      const platformsWithStatus = Object.keys(data).filter(k => k !== '_summary');
      const totalPlatformsToPost = state.connections.filter(c => c.postStatus !== IDLE).length;
      const newProgress = platformsWithStatus.length / (totalPlatformsToPost || 1);
      state.updatePostProgress({ progress: newProgress });

      const isFinish = !!data._summary;

      if (isFinish) {
        Logger.info(`[FirebaseService] Sumário final recebido para o post ${postId}. Finalizando.`);
        this.finalizePostSync(postId, data._summary.successful);
        dbRef.off('value', onValueChange);
        dbRef.remove();

        PostDao.update(postId, {
          platformsSuccess: data._summary.successful.join(', '),
          status: POSTED as PostType,
        });
        onFinish();
      }
    };

    dbRef.on('value', onValueChange);
    return () => dbRef.off('value', onValueChange);
  }

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
