module.exports = {
  DocumentDirectoryPath: '/mock/path',
  exists: jest.fn(() => Promise.resolve(true)),
  mkdir: jest.fn(() => Promise.resolve()),
  writeFile: jest.fn(() => Promise.resolve()),
  readFile: jest.fn(() => Promise.resolve('')),
  unlink: jest.fn(() => Promise.resolve()),
  ExternalStorageDirectoryPath: '/mock/external',
  DownloadDirectoryPath: '/mock/download',
};
