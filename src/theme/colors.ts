// Define a estrutura de tipos para nossas cores
export interface ColorsType {
  primary: string;
  primaryAccent: string;
  primaryOuther: string;
  primaryOutherAccent: string;
  secondary: string;
  tertiary: string;
  cancel: string;
  delete: string;
  background: string;
  card: string;
  text: string;
  textPrimary: string;
  textSecondary: string;
  title: string;
  border: string;
  success: string;
  error: string;
  inactive: string;
  disabledPlatform: string;
  shadown: string;
  iconOverlay: string;

  tumblr: string;
  x: string;
  threads: string;
  bluesky: string;
  unknow: string;
}

// Paleta para o modo claro
const lightColors: ColorsType = {
  primary: '#007BFF',
  primaryAccent: '#81b0ff',
  primaryOuther: '#808080',
  primaryOutherAccent: '#767577',
  secondary: '#28a745',
  tertiary: '#ffc107',
  cancel: '#dc3545',
  delete: '#dc3545',
  background: '#f5f5f5',
  card: '#ffffff',
  text: '#121212',
  textPrimary: '#ffffff',
  textSecondary: '#666666',
  title: '#333333',
  border: '#dddddd',
  success: '#28a745',
  error: '#dc3545',
  inactive: '#808080',
  disabledPlatform: '#000000',
  shadown: '#000000',
  iconOverlay: '#ffffff',

  tumblr: '#35465c',
  x: '#000000',
  threads: '#000000',
  bluesky: '#0288dbff',
  unknow: '#121212',
};

// Paleta para o modo escuro
const darkColors: ColorsType = {
  primary: '#007BFF',
  primaryAccent: '#81b0ff',
  primaryOuther: '#808080',
  primaryOutherAccent: '#767577',
  secondary: '#28a745',
  tertiary: '#ffc107',
  cancel: '#dc3545',
  delete: '#dc3545',
  background: '#121212',
  card: '#1e1e1e',
  text: '#ffffff',
  textPrimary: '#ffffff',
  textSecondary: '#bfbfbf',
  title: '#bfbfbf',
  border: '#808080',
  success: '#28a745',
  error: '#dc3545',
  inactive: '#bfbfbf',
  disabledPlatform: '#ffffff',
  shadown: '#000000',
  iconOverlay: '#ffffff',

  tumblr: '#A9B8C5',
  x: '#ffffff',
  threads: '#E0E0E0',
  bluesky: '#62B8E9',
  unknow: '#ffffff',
};

export const palette = {
  light: lightColors,
  dark: darkColors,
};
