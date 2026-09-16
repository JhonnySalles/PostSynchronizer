import AsyncStorage from '@react-native-async-storage/async-storage';
import { threadsJobService } from 'src/services/ThreadsJobService';
import { apiService } from 'src/services/ApiService';
import PostDao from 'src/dao/PostDao';
import { usePostStore } from 'src/store/usePostStore';
import { THREADS } from 'src/constants/platforms';
import { ERROR, SUCCESS } from 'src/constants/app';

jest.mock('src/services/ApiService');
jest.mock('src/dao/PostDao');
jest.mock('src/services/FirebaseService', () => ({
  firebaseService: {
    listenForPostUpdates: jest.fn(),
  },
}));
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}));

describe('ThreadsJobService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    (threadsJobService as any).activeJobs.clear();
    (threadsJobService as any).stopPolling();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    (threadsJobService as any).stopPolling();
  });

  test('deve adicionar um job à lista ativa e salvar no storage', async () => {
    await threadsJobService.addJob('job_123', 1);

    expect(threadsJobService.hasActiveJobs()).toBe(true);
    expect(threadsJobService.getActiveJobs()).toEqual([
      expect.objectContaining({
        jobId: 'job_123',
        postId: 1,
        status: 'queued',
      }),
    ]);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@threads_active_jobs',
      expect.stringContaining('job_123'),
    );
  });

  test('deve remover um job e atualizar o storage', async () => {
    await threadsJobService.addJob('job_123', 1);
    await threadsJobService.removeJob('job_123');

    expect(threadsJobService.hasActiveJobs()).toBe(false);
    expect(threadsJobService.getActiveJobs()).toHaveLength(0);
  });

  test('deve processar job com sucesso, atualizar banco, store e remover da lista', async () => {
    (apiService.getThreadsJobStatus as jest.Mock).mockResolvedValueOnce({
      success: true,
      status: 'success',
    });

    const updatePostProgressSpy = jest.spyOn(usePostStore.getState(), 'updatePostProgress');

    await threadsJobService.addJob('job_456', 2);
    await threadsJobService.checkAllActiveJobs();

    expect(apiService.getThreadsJobStatus).toHaveBeenCalledWith('job_456');
    expect(PostDao.update).toHaveBeenCalledWith(2, {
      platformsSuccess: THREADS,
      status: 'posted',
    });
    expect(updatePostProgressSpy).toHaveBeenCalledWith(2, {
      platform: THREADS,
      status: SUCCESS,
    });
    expect(threadsJobService.hasActiveJobs()).toBe(false);
  });

  test('deve processar job com erro, atualizar store e remover da lista', async () => {
    (apiService.getThreadsJobStatus as jest.Mock).mockResolvedValueOnce({
      success: true,
      status: 'error',
      error: 'Token inválido',
    });

    const updatePostProgressSpy = jest.spyOn(usePostStore.getState(), 'updatePostProgress');

    await threadsJobService.addJob('job_789', 3);
    await threadsJobService.checkAllActiveJobs();

    expect(apiService.getThreadsJobStatus).toHaveBeenCalledWith('job_789');
    expect(updatePostProgressSpy).toHaveBeenCalledWith(3, {
      platform: THREADS,
      status: ERROR,
    });
    expect(threadsJobService.hasActiveJobs()).toBe(false);
  });

  test('deve manter o job na lista se o status for processing', async () => {
    (apiService.getThreadsJobStatus as jest.Mock).mockResolvedValueOnce({
      success: true,
      status: 'processing',
    });

    await threadsJobService.addJob('job_999', 4);
    await threadsJobService.checkAllActiveJobs();

    expect(threadsJobService.hasActiveJobs()).toBe(true);
    expect(threadsJobService.getActiveJobs()[0].status).toBe('processing');
  });

  test('deve realizar sincronização manual com sucesso', async () => {
    (apiService.getThreadsJobStatus as jest.Mock).mockResolvedValueOnce({
      success: true,
      status: 'success',
    });

    await threadsJobService.addJob('job_manual', 5);
    const result = await threadsJobService.manualSync();

    expect(result.activeJobsChecked).toBe(1);
    expect(threadsJobService.hasActiveJobs()).toBe(false);
  });
});
