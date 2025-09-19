import { StyleSheet } from 'react-native';
import { ColorsType } from 'src/theme/colors';

export const getStyles = (colors: ColorsType) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flexGrow: 1,
      padding: 20,
      alignItems: 'center',
    },
    themeSelectorContainer: {
      width: '100%',
      marginTop: 20,
      padding: 15,
      backgroundColor: colors.background,
    },
    themeSelectorLabel: {
      fontSize: 16,
      color: colors.text,
      marginBottom: 10,
    },
    pickerWrapper: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
    },
  });
