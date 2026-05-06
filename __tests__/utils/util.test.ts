import { getMimeType, formatarData, cleanTags } from 'src/utils/util';

describe('Utils', () => {
  describe('getMimeType', () => {
    test('deve retornar image/jpeg para extensões jpg e jpeg', () => {
      expect(getMimeType('photo.jpg')).toBe('image/jpeg');
      expect(getMimeType('photo.jpeg')).toBe('image/jpeg');
      expect(getMimeType('PHOTO.JPG')).toBe('image/jpeg');
    });

    test('deve retornar image/png para extensão png', () => {
      expect(getMimeType('image.png')).toBe('image/png');
    });

    test('deve retornar image/jpeg por padrão', () => {
      expect(getMimeType('file.txt')).toBe('image/jpeg');
      expect(getMimeType('file')).toBe('image/jpeg');
    });
  });

  describe('formatarData', () => {
    test('deve retornar mensagem de erro para data nula ou indefinida', () => {
      expect(formatarData(null)).toBe('Data não informada');
      expect(formatarData(undefined)).toBe('Data não informada');
    });

    test('deve formatar data ISO para o padrão brasileiro (SP)', () => {
      const isoDate = '2025-10-18T18:00:00.000Z';
      const formatted = formatarData(isoDate);
      // O resultado exato depende do ambiente, mas verificamos se contém partes da data
      expect(formatted).toContain('18/10/2025');
      expect(formatted).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('cleanTags', () => {
    test('deve remover espaços e tags vazias', () => {
      expect(cleanTags(' tag1 ;  tag2 ; ')).toBe('tag1; tag2');
      expect(cleanTags(';;tag1;;;tag2;;')).toBe('tag1; tag2');
    });

    test('deve retornar string vazia para entrada vazia', () => {
      expect(cleanTags('')).toBe('');
      expect(cleanTags(null)).toBe('');
      expect(cleanTags('   ')).toBe('');
    });
  });
});
