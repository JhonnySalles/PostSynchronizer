import { StyleSheet } from 'react-native';
import { ColorsType } from '../../theme/colors';

export const getStyles = (colors: ColorsType) =>
    StyleSheet.create({
        modalBackground: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
        activityIndicatorWrapper: {
            backgroundColor: colors.card,
            height: 140,
            width: 140,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            padding: 20,
        },
        indicator: {
            marginBottom: 10,
        },
        text: {
            fontSize: 16,
            color: colors.text,
            textAlign: 'center',
        },
    });