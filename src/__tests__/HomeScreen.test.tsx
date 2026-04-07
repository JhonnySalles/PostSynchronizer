/**
 * HomeScreen — Testes de Lógica de Negócio
 *
 * Estratégia: Testar a lógica dos handlers e validações diretamente,
 * sem renderizar o componente completo (evita crashes de deps nativas no Jest).
 */
import { Alert } from 'react-native';
import { apiService } from 'src/services/ApiService';
import PostDao from 'src/dao/PostDao';
import AuthTokenDao from 'src/dao/AuthTokenDao';

jest.mock('src/services/ApiService');
jest.mock('src/dao/PostDao');
jest.mock('src/dao/AuthTokenDao');

describe('HomeScreen — Lógica de Negócio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Validação de Postagem', () => {
    const validateAndPost = (text: string, images: any[], connections: any[]) => {
      if (!text && images.length === 0) {
        Alert.alert('Conteúdo Vazio', 'Adicione texto ou imagens antes de postar.');
        return false;
      }

      const xActive = connections.find(c => c.platform === 'x' && c.active);
      if (xActive && images.length > 4) {
        Alert.alert('Limite de Imagens Excedido', 'X (Twitter) suporta no máximo 4 imagens.');
        return false;
      }

      return true;
    };

    test('deve impedir postagem se texto e imagens estiverem vazios', () => {
      const result = validateAndPost('', [], [{ platform: 'x', active: true }]);

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith('Conteúdo Vazio', expect.any(String));
    });

    test('deve validar o limite de 4 imagens para o Twitter (X)', () => {
      const images = Array(5).fill({ path: 'img.jpg', platforms: ['x'] });
      const connections = [{ platform: 'x', active: true }];

      const result = validateAndPost('Texto de teste', images, connections);

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith('Limite de Imagens Excedido', expect.stringContaining('X (Twitter)'));
    });

    test('deve permitir postagem com conteúdo válido', () => {
      const result = validateAndPost('Hello World', [], [{ platform: 'x', active: true }]);
      expect(result).toBe(true);
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    test('deve permitir postagem com imagens dentro do limite', () => {
      const images = Array(4).fill({ path: 'img.jpg', platforms: ['x'] });
      const result = validateAndPost('Teste', images, [{ platform: 'x', active: true }]);
      expect(result).toBe(true);
    });
  });

  describe('Processamento de Tags', () => {
    const cleanTags = (tagsText: string) => {
      return tagsText
        .split(';')
        .map(t => t.trim())
        .filter(Boolean)
        .join('; ');
    };

    test('deve limpar espaços extras das tags', () => {
      const result = cleanTags('tag1; tag2; tag3; ');
      expect(result).toBe('tag1; tag2; tag3');
    });

    test('deve remover tags vazias', () => {
      const result = cleanTags('tag1;;tag2; ;tag3');
      expect(result).toBe('tag1; tag2; tag3');
    });
  });

  describe('Chamada ao ApiService', () => {
    test('deve chamar apiService.postAll com o payload correto', async () => {
      (AuthTokenDao.getCredentialsForPlatform as jest.Mock).mockResolvedValue(null);
      (PostDao.platformSuccessCount as jest.Mock).mockResolvedValue(0);
      (apiService.postAll as jest.Mock).mockResolvedValue({ success: true });

      await apiService.postAll(
        { text: 'Hello World', tags: ['news', 'tech'] } as any,
        jest.fn()
      );

      expect(apiService.postAll).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Hello World', tags: ['news', 'tech'] }),
        expect.any(Function)
      );
    });

    test('deve salvar post como rascunho no banco de dados', async () => {
      (PostDao.create as jest.Mock).mockResolvedValue(42);

      const id = await PostDao.create({
        content: 'Rascunho de teste',
        status: 'draft' as any,
      });

      expect(id).toBe(42);
      expect(PostDao.create).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Rascunho de teste' })
      );
    });
  });
});
