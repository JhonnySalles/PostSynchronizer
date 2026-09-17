import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import Toast from 'react-native-toast-message';
import Logger from 'src/services/LoggerService';
import { apiService } from 'src/services/ApiService';
import PostDao from 'src/dao/PostDao';
import { usePostStore } from 'src/store/usePostStore';
import { THREADS } from 'src/constants/platforms';
import { ERROR, POSTED, PostType, SUCCESS } from 'src/constants/app';
import { firebaseService } from 'src/services/FirebaseService';

export interface ThreadsJobItem {
  jobId: string;
  postId: number;
  status: 'queued' | 'processing' | 'success' | 'error' | 'failed';
  createdAt: number;
}

const STORAGE_KEY = '@threads_active_jobs';
const POLLING_INTERVAL_MS = 5000;

class ThreadsJobService {
  private activeJobs: Map<string, ThreadsJobItem> = new Map();
  private pollingTimer: NodeJS.Timeout | null = null;
  private isPollingActive = false;
  private appStateSubscription: any = null;
  private isForeground = true;

  public async initialize(): Promise<void> {
    Logger.info('[ThreadsJobService] Inicializando serviço de sincronização de jobs...');
    try {
      await this.loadJobsFromStorage();

      if (!this.appStateSubscription) {
        this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
      }

      this.evaluatePolling();
    } catch (error) {
      Logger.error(error as Error, { message: '[ThreadsJobService] Erro durante inicialização' });
    }
  }

  private handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      Logger.info('[ThreadsJobService] App em primeiro plano. Retomando verificação de jobs...');
      this.isForeground = true;
      await this.loadJobsFromStorage();
      this.evaluatePolling();
    } else if (nextAppState.match(/inactive|background/)) {
      Logger.info('[ThreadsJobService] App em segundo plano. Salvando jobs ativos e pausando polling...');
      this.isForeground = false;
      await this.saveJobsToStorage();
      this.stopPolling();
    }
  };

  private async loadJobsFromStorage(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed: ThreadsJobItem[] = JSON.parse(data);
        parsed.forEach(job => {
          if (!this.activeJobs.has(job.jobId)) {
            this.activeJobs.set(job.jobId, job);
          }
        });
        Logger.info(`[ThreadsJobService] ${parsed.length} jobs carregados do armazenamento.`);
      }
    } catch (error) {
      Logger.warn('[ThreadsJobService] Erro ao carregar jobs do armazenamento:', error);
    }
  }

  private async saveJobsToStorage(): Promise<void> {
    try {
      const jobsArray = Array.from(this.activeJobs.values());
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(jobsArray));
    } catch (error) {
      Logger.warn('[ThreadsJobService] Erro ao salvar jobs no armazenamento:', error);
    }
  }

  public async addJob(jobId: string, postId: number): Promise<void> {
    if (!jobId) return;

    const jobItem: ThreadsJobItem = {
      jobId,
      postId,
      status: 'queued',
      createdAt: Date.now(),
    };

    this.activeJobs.set(jobId, jobItem);
    Logger.info(`[ThreadsJobService] Job ${jobId} adicionado para o post ${postId}.`);
    await this.saveJobsToStorage();
    this.evaluatePolling();
  }

  public async removeJob(jobId: string): Promise<void> {
    if (this.activeJobs.has(jobId)) {
      this.activeJobs.delete(jobId);
      Logger.info(`[ThreadsJobService] Job ${jobId} removido da lista ativa.`);
      await this.saveJobsToStorage();
      this.evaluatePolling();
    }
  }

  public getActiveJobs(): ThreadsJobItem[] {
    return Array.from(this.activeJobs.values());
  }

  public hasActiveJobs(): boolean {
    return this.activeJobs.size > 0;
  }

  private evaluatePolling(): void {
    if (this.hasActiveJobs() && this.isForeground) {
      this.startPolling();
    } else {
      this.stopPolling();
    }
  }

  private startPolling(): void {
    if (this.isPollingActive) return;

    this.isPollingActive = true;
    Logger.info('[ThreadsJobService] Iniciando loop de polling a cada 5s...');

    this.pollingTimer = setInterval(() => {
      this.checkAllActiveJobs();
    }, POLLING_INTERVAL_MS);

    // Executa imediatamente na inicialização
    this.checkAllActiveJobs();
  }

  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.isPollingActive = false;
    Logger.info('[ThreadsJobService] Loop de polling interrompido.');
  }

  public async checkAllActiveJobs(): Promise<void> {
    if (this.activeJobs.size === 0) {
      this.stopPolling();
      return;
    }

    const jobs = Array.from(this.activeJobs.values());
    Logger.info(`[ThreadsJobService] Consultando status de ${jobs.length} jobs ativos na API...`);

    for (const job of jobs) {
      await this.checkJobStatus(job);
    }
  }

  private async checkJobStatus(job: ThreadsJobItem): Promise<void> {
    try {
      const response = await apiService.getThreadsJobStatus(job.jobId);
      if (response.notFound) {
        Logger.info(
          `[ThreadsJobService] Job ${job.jobId} não encontrado na API (expirado/concluído). Removendo da fila...`,
        );
        await this.removeJob(job.jobId);
        return;
      }

      if (!response.success && !response.status) {
        // Falha de rede ou timeout, manter na fila e tentar no próximo ciclo
        return;
      }

      let status = response.status;
      const data = response.data || {};

      // Se a API retornar error/failed mas ainda houver tentativas restantes,
      // consideramos que o job ainda está em processamento (retentativa).
      if (
        (status === 'error' || status === 'failed') &&
        data.attempts !== undefined &&
        data.maxAttempts !== undefined &&
        data.attempts < data.maxAttempts
      ) {
        Logger.info(
          `[ThreadsJobService] Job ${job.jobId} falhou na tentativa ${data.attempts}/${data.maxAttempts}. Mantendo em processamento para retentativa...`,
        );
        status = 'processing';
      }

      if (status === 'success') {
        Logger.info(`[ThreadsJobService] Job ${job.jobId} (Post ${job.postId}) concluído com SUCESSO.`);
        
        await PostDao.updateLastSync(job.postId, [THREADS], [], []);

        const { updatePostProgress, finishPosting, editingPostId, oldPostId, triggerHistoryUpdate } = usePostStore.getState();
        updatePostProgress(job.postId, { platform: THREADS, status: SUCCESS });

        if (editingPostId === job.postId || oldPostId === job.postId) {
          finishPosting(job.postId, { successful: [THREADS], failed: [] });
        } else {
          triggerHistoryUpdate();
        }

        Toast.show({
          type: 'success',
          text1: 'Threads: Post Publicado',
          text2: 'A publicação no Threads foi concluída com sucesso.',
          position: 'top',
          visibilityTime: 4000,
        });

        await this.removeJob(job.jobId);
      } else if (status === 'error' || status === 'failed') {
        const errorMsg = response.error || response.data?.error || 'Ocorreu um erro no processamento do Threads.';
        Logger.warn(`[ThreadsJobService] Job ${job.jobId} (Post ${job.postId}) finalizado com ERRO: ${errorMsg}`);

        await PostDao.updateLastSync(job.postId, [], [], [THREADS]);

        const { updatePostProgress, finishPosting, editingPostId, oldPostId, triggerHistoryUpdate } = usePostStore.getState();
        updatePostProgress(job.postId, { platform: THREADS, status: ERROR });

        if (editingPostId === job.postId || oldPostId === job.postId) {
          finishPosting(job.postId, { successful: [], failed: [THREADS] });
        } else {
          triggerHistoryUpdate();
        }

        Toast.show({
          type: 'error',
          text1: 'Threads: Falha na Publicação',
          text2: errorMsg,
          position: 'top',
          visibilityTime: 5000,
        });

        await this.removeJob(job.jobId);
      } else if (status === 'processing' || status === 'queued') {
        // Atualiza status interno
        job.status = status;
        this.activeJobs.set(job.jobId, job);
      }
    } catch (error) {
      Logger.error(error as Error, {
        message: `[ThreadsJobService] Erro inesperado ao consultar job ${job.jobId}`,
      });
    }
  }

  /**
   * Força uma sincronização manual imediata consultando a API dos jobs e o Firebase.
   */
  public async manualSync(): Promise<{ activeJobsChecked: number }> {
    Logger.info('[ThreadsJobService] Executando sincronização manual solicitada pelo usuário...');

    // Reativa o listener do Firebase para garantir captura de atualizações
    firebaseService.listenForPostUpdates();

    // Sincroniza todos os registros pendentes do Firebase baixando e processando
    await firebaseService.syncAllPosts();

    // Executa verificação em todos os jobs ativos
    const activeCount = this.activeJobs.size;
    if (activeCount > 0) {
      await this.checkAllActiveJobs();
    }

    return { activeJobsChecked: activeCount };
  }
}

export const threadsJobService = new ThreadsJobService();
