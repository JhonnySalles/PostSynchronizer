// Mock manual para evitar erros de transpilização do socket.io-client real
const mSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn(),
  connected: true,
};

module.exports = {
  io: jest.fn(() => mSocket),
  Socket: jest.fn(() => mSocket),
};
