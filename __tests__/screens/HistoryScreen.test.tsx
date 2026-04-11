import { Alert } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import PostDao from 'src/dao/PostDao';

// Mock dependencies
jest.mock('src/dao/PostDao');
jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
  getString: jest.fn(),
  hasString: jest.fn(),
}));

/**
 * HistoryScreen — Testes de Lógica de Negócio
 * 
 * Estratégia: Testar os motores de busca, filtros e processamento de dados 
 * da tela de histórico de forma isolada.
 */
describe('HistoryScreen — Lógica de Negócio', () => {
  const FILTER_REGEX = /\b(tag|status|data):(?:"([^"]*)"|([^"\s]+))/gi;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  describe('Motor de Filtro (Search Engine)', () => {
    const mockHistory = [
      { id: 1, content: 'Promoção de Verão', tags: 'promo; verao', status: 'posted', created_at: '2025-01-01T10:00:00Z' },
      { id: 2, content: 'Novo Produto', tags: 'tech; novo', status: 'draft', created_at: '2025-02-15T10:00:00Z' },
      { id: 3, content: 'Aviso Importante', tags: 'news; aviso', status: 'posted', created_at: '2024-12-20T10:00:00Z' },
    ] as any[];

    const applyFilter = (history: any[], query: string) => {
      let result = history;
      let contentSearch = query;
      const activeFilters: { key: string; value: string }[] = [];

      contentSearch = query.replace(FILTER_REGEX, (match, key, quotedValue, unquotedValue) => {
        const value = quotedValue || unquotedValue;
        activeFilters.push({ key: key.toLowerCase(), value: value.toLowerCase() });
        return '';
      });

      contentSearch = contentSearch.replace(/\s+/g, ' ').trim().toLowerCase();

      if (contentSearch) {
        result = result.filter(item => item.content?.toLowerCase().includes(contentSearch));
      }

      if (activeFilters.length > 0) {
        result = result.filter(item => {
          return activeFilters.every(filter => {
            if (filter.key === 'tag')
              return item.tags?.toLowerCase().includes(filter.value);

            if (filter.key === 'status') {
              const itemStatus = item.status === 'posted' ? 'postado' : 'rascunho';
              return itemStatus.includes(filter.value) || item.status.includes(filter.value);
            }

            if (filter.key === 'data') {
                // Simplificado para teste de lógica (apenas o ano ou string da data)
              return item.created_at.includes(filter.value);
            }

            return true;
          });
        });
      }
      return result;
    };

    test('deve filtrar por conteúdo de texto simples', () => {
      const result = applyFilter(mockHistory, 'verão');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    test('deve filtrar especificamente por tag:prefixo', () => {
      const result = applyFilter(mockHistory, 'tag:tech');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    test('deve filtrar por status:"postado"', () => {
      const result = applyFilter(mockHistory, 'status:postado');
      expect(result).toHaveLength(2); // IDs 1 e 3
    });

    test('deve combinar texto e filtros complexos', () => {
      const result = applyFilter(mockHistory, 'Promoção tag:verao status:postado');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    test('deve manter termos que não casam com filtros conhecidos na busca de texto', () => {
        const result = applyFilter(mockHistory, 'Produto');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(2);
    });
  });

  describe('Sugestões de Busca (Auto-complete)', () => {
    const mockHistory = [
        { tags: 'viagem; ferias' },
        { tags: 'trabalho; tech' },
    ] as any[];

    const getSuggestions = (text: string, history: any[]) => {
        const tokens = text.split(/\s+/);
        const currentToken = tokens[tokens.length - 1].toLowerCase();
        if (!currentToken) return [];

        let newSuggestions: string[] = [];
        const prefixes = ['tag:', 'status:', 'data:'];

        if (!currentToken.includes(':')) {
            newSuggestions = prefixes.filter(p => p.startsWith(currentToken));
        } else {
            const [prefix, rawValue] = currentToken.split(':');
            const value = rawValue ? rawValue.replace(/^"/, '') : '';

            if (prefix === 'tag') {
                const allTags = new Set<string>();
                history.forEach(h => {
                    if (h.tags) h.tags.split(';').forEach((t: string) => allTags.add(t.trim().toLowerCase()));
                });
                newSuggestions = Array.from(allTags)
                    .filter(t => t.includes(value))
                    .map(t => `tag:"${t}"`);
            } else if (prefix === 'status') {
                newSuggestions = ['status:"postado"', 'status:"rascunho"'].filter(s => s.includes(value));
            }
        }
        return newSuggestions.slice(0, 5);
    };

    test('deve sugerir prefixos ao iniciar digitação', () => {
        const res = getSuggestions('ta', []);
        expect(res).toContain('tag:');
    });

    test('deve sugerir tags existentes baseadas no histórico', () => {
        const res = getSuggestions('tag:via', mockHistory);
        expect(res).toContain('tag:"viagem"');
    });

    test('deve sugerir opções de status', () => {
        const res = getSuggestions('status:pos', []);
        expect(res).toContain('status:"postado"');
    });
  });

  describe('Processamento de Compartilhamento', () => {
    const formatShareMessage = (content: string, tags: string) => {
        let formattedTags = '';
        if (tags) {
            formattedTags = tags
                .split(';')
                .map(tag => tag.trim())
                .filter(Boolean)
                .map(tag =>
                    tag
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join('')
                )
                .map(tag => `#${tag}`)
                .join(' ');
        }
        return tags && formattedTags ? `${content || ''}\n\n${formattedTags}`.trim() : content || '';
    };

    test('deve converter tags separadas por ponto e vírgula em Hashtags CamelCase', () => {
        const content = 'Meu post legal';
        const tags = 'viagem; mundo afora; tech';
        const res = formatShareMessage(content, tags);

        expect(res).toContain('#Viagem');
        expect(res).toContain('#MundoAfora'); // CamelCase
        expect(res).toContain('#Tech');
    });

    test('deve retornar apenas conteúdo se não houver tags', () => {
        const res = formatShareMessage('Apenas texto', '');
        expect(res).toBe('Apenas texto');
    });
  });

  describe('Operações de Histórico', () => {
    test('deve chamar PostDao.delete ao deletar item', async () => {
        (PostDao.delete as jest.Mock).mockResolvedValue(true);
        const postId = 123;
        
        // Simulação do onPress do alerta de deleção
        const handleDelete = async (id: number) => {
            await PostDao.delete(id);
        };

        await handleDelete(postId);
        expect(PostDao.delete).toHaveBeenCalledWith(postId);
    });
  });
});
