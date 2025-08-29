import { StyleSheet } from 'react-native';
import { ColorsType } from '../../theme/colors';

// Esta função gera os estilos do botão com base nas cores do tema atual
export const getStyles = (colors: ColorsType) =>
    StyleSheet.create({
        // Estilo base para todos os botões
        baseContainer: {
            paddingVertical: 14,
            paddingHorizontal: 20,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
        },
        // Estilo base para o texto de todos os botões
        baseText: {
            fontSize: 16,
            fontWeight: 'bold',
        },

        // --- Variantes de Estilo ---
        primaryContainer: {
            backgroundColor: colors.primary,
        },
        primaryText: {
            color: '#ffffff',
        },
        secondaryContainer: {
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.primary,
        },
        secondaryText: {
            color: colors.primary,
        },
        destructiveContainer: {
            backgroundColor: colors.error,
        },
        destructiveText: {
            color: '#ffffff',
        },

        // --- Estado Desabilitado ---
        disabledContainer: {
            opacity: 0.5,
        },
    });