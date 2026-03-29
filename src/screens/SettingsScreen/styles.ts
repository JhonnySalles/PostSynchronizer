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
      zIndex: 5000,
    },
    themeSelectorLabel: {
      fontSize: 16,
      color: colors.text,
      marginBottom: 10,
    },
    pickerContainer: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1,
      marginBottom: 10,
    },
    pickerTextStyle: {
      color: colors.text,
      fontSize: 14,
    },
    pickerPlaceholderStyle: {
      color: colors.textSecondary,
    },
    pickerDropDownContainer: {
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
    pickerListItemLabel: {
      color: colors.text,
    },
  });
