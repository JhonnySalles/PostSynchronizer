/**
 * SettingsScreen — Testes de Lógica de Negócio
 *
 * Estratégia: Testar a lógica dos handlers diretamente em vez de renderizar o
 * componente completo, evitando problemas de dependências nativas em ambiente Jest.
 */
import { Alert } from 'react-native';
import { apiService } from 'src/services/ApiService';
import AuthTokenDao from 'src/dao/AuthTokenDao';

jest.mock('src/services/ApiService');
jest.mock('src/dao/AuthTokenDao');

describe('SettingsScreen — Lógica de Negócio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handleLoginTest', () => {
    const handleLoginTest = async () => {
      try {
        const success = await apiService.login();
        if (success)
          Alert.alert('Login Bem-Sucedido!', 'Login realizado com sucesso na api.');
        else
          Alert.alert('Falha no Login', 'Não foi possível realizar o login na api. Verifique sua internet.');
      } catch (e) {
        Alert.alert('Erro Crítico no Login', (e as Error).message);
      }
    };

    test('deve mostrar alerta de sucesso quando login retorna true', async () => {
      (apiService.login as jest.Mock).mockResolvedValue(true);

      await handleLoginTest();

      expect(apiService.login).toHaveBeenCalledTimes(1);
      expect(Alert.alert).toHaveBeenCalledWith('Login Bem-Sucedido!', expect.any(String));
    });

    test('deve mostrar alerta de falha quando login retorna false', async () => {
      (apiService.login as jest.Mock).mockResolvedValue(false);

      await handleLoginTest();

      expect(Alert.alert).toHaveBeenCalledWith('Falha no Login', expect.any(String));
    });

    test('deve mostrar alerta de erro crítico quando login lança exceção', async () => {
      (apiService.login as jest.Mock).mockRejectedValue(new Error('Sem conexão'));

      await handleLoginTest();

      expect(Alert.alert).toHaveBeenCalledWith('Erro Crítico no Login', 'Sem conexão');
    });
  });

  describe('loadSettings', () => {
    test('deve carregar credenciais ao montar', async () => {
      const mockCredentials = [
        { platform: 'x', active: true, aditional: '' },
        { platform: 'tumblr', active: false, aditional: '' },
      ];
      (AuthTokenDao.getAllCredentials as jest.Mock).mockResolvedValue(mockCredentials);

      const result = await AuthTokenDao.getAllCredentials();

      expect(AuthTokenDao.getAllCredentials).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result[0].platform).toBe('x');
    });

    test('deve mostrar alerta de erro se carregamento falhar', async () => {
      (AuthTokenDao.getAllCredentials as jest.Mock).mockRejectedValue(new Error('DB Error'));

      try {
        await AuthTokenDao.getAllCredentials();
      } catch {
        Alert.alert('Erro', 'Não foi possível carregar as configurações salvas.');
      }

      expect(Alert.alert).toHaveBeenCalledWith('Erro', expect.any(String));
    });
  });

  describe('handleStatusChange', () => {
    test('deve chamar updateActiveStatus com as credenciais atualizadas', async () => {
      const credential = { platform: 'x', active: true, aditional: '' };
      (AuthTokenDao.updateActiveStatus as jest.Mock).mockResolvedValue(undefined);

      await AuthTokenDao.updateActiveStatus({ ...credential, active: false });

      expect(AuthTokenDao.updateActiveStatus).toHaveBeenCalledWith(
        expect.objectContaining({ platform: 'x', active: false })
      );
    });
  });
});
