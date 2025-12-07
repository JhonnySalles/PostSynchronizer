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
  twitter: string;
  threads: string;
  bluesky: string;
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
  twitter: '#1DA1F2',
  threads: '#000000',
  bluesky: '#0288dbff',
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
  twitter: '#88C9F7',
  threads: '#E0E0E0',
  bluesky: '#62B8E9',
};

export const palette = {
  light: lightColors,
  dark: darkColors,
};
