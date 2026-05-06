import ImageService from 'src/services/ImageService.windows';

jest.mock('src/services/LoggerService');

describe('ImageService Windows', () => {
  test('processImage deve retornar a mesma URI no Windows', async () => {
    const uri = 'file:///C:/test.jpg';
    const result = await ImageService.processImage(uri);
    expect(result).toBe(uri);
  });

  test('processImageList deve retornar a mesma lista e chamar onProgress', async () => {
    const uris = ['uri1', 'uri2'];
    const onProgress = jest.fn();
    const result = await ImageService.processImageList(uris, onProgress);

    expect(result).toEqual(uris);
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenLastCalledWith(1);
  });
});
