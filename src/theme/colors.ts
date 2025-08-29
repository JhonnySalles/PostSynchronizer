// Define a estrutura de tipos para nossas cores
export interface ColorsType {
    primary: string;
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    error: string;
}

// Paleta para o modo claro
const lightColors: ColorsType = {
    primary: '#007BFF',
    background: '#f5f5f5',
    card: '#ffffff',
    text: '#121212',
    textSecondary: '#666666',
    border: '#dddddd',
    success: '#28a745',
    error: '#dc3545',
};

// Paleta para o modo escuro
const darkColors: ColorsType = {
    primary: '#007BFF',
    background: '#121212',
    card: '#1e1e1e',
    text: '#ffffff',
    textSecondary: '#a0a0a0',
    border: '#333333',
    success: '#28a745',
    error: '#dc3545',
};

export const palette = {
    light: lightColors,
    dark: darkColors,
};