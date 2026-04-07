import { getMimeType, formatarData } from 'src/utils/util';

describe('util.ts', () => {
  describe('getMimeType', () => {
    test('deve retornar image/jpeg para extensão jpg', () => {
      expect(getMimeType('image.jpg')).toBe('image/jpeg');
    });

    test('deve retornar image/jpeg para extensão jpeg', () => {
      expect(getMimeType('photo.jpeg')).toBe('image/jpeg');
    });

    test('deve retornar image/png para extensão png', () => {
      expect(getMimeType('logo.png')).toBe('image/png');
    });

    test('deve retornar image/jpeg para extensão desconhecida', () => {
      expect(getMimeType('file.pdf')).toBe('image/jpeg');
    });

    test('deve lidar com extensões em caixa alta', () => {
      expect(getMimeType('IMAGE.PNG')).toBe('image/png');
    });
  });

  describe('formatarData', () => {
    test('deve formatar data ISO corretamente no padrão brasileiro', () => {
      const date = '2025-10-18T18:00:00.000Z';
      // Ajuste baseado no fuso horário para garantir precisão
      const formatted = formatarData(date);
      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}/);
      expect(formatted).toContain('18/10/2025');
    });

    test('deve retornar mensagem padrão para data nula ou indefinida', () => {
      expect(formatarData(null)).toBe('Data não informada');
      expect(formatarData(undefined)).toBe('Data não informada');
    });

    test('deve retornar mensagem padrão para string vazia', () => {
      expect(formatarData('')).toBe('Data não informada');
    });
  });
});
