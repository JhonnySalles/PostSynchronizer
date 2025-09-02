// Define a estrutura de tipos para nossas cores
export interface ColorsType {
    primary: string;
    secondary: string;
    tertiary: string;
    cancel: string;
    delete: string;
    background: string;
    card: string;
    text: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
    success: string;
    error: string;
    inactive: string;
}

// Paleta para o modo claro
const lightColors: ColorsType = {
    primary: '#007BFF',
    secondary: '#28a745',
    tertiary: '#ffc107',
    cancel: '#dc3545',
    delete: '#dc3545',
    background: '#f5f5f5',
    card: '#ffffff',
    text: '#121212',
    textPrimary: '#ffffff',
    textSecondary: '#666666',
    border: '#dddddd',
    success: '#28a745',
    error: '#dc3545',
    inactive: '#808080',
};

// Paleta para o modo escuro
const darkColors: ColorsType = {
    primary: '#007BFF',
    secondary: '#28a745',
    tertiary: '#ffc107',
    cancel: '#dc3545',
    delete: '#dc3545',
    background: '#121212',
    card: '#1e1e1e',
    text: '#ffffff',
    textPrimary: '#ffffff',
    textSecondary: '#a0a0a0',
    border: '#333333',
    success: '#28a745',
    error: '#dc3545',
    inactive: '#808080',
};

export const palette = {
    light: lightColors,
    dark: darkColors,
};