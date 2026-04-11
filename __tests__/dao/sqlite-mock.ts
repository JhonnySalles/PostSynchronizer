// Utilizar o mock definido globalmente no setup
const mockExecuteSql = (global as any).mockExecuteSql;

export { mockExecuteSql };
