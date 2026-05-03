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
    promptContainer: {
      width: '100%',
      marginTop: 20,
      padding: 20,
      borderRadius: 12,
      backgroundColor: colors.background,
      shadowColor: colors.shadown,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
    },
    promptLabel: {
      fontSize: 16,
      color: colors.text,
      marginBottom: 10,
    },
    promptInput: {
      backgroundColor: colors.card,
      color: colors.text,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      minHeight: 150,
      textAlignVertical: 'top',
      fontSize: 14,
    },
    promptHint: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 8,
      lineHeight: 18,
    },
    promptClearButton: {
      marginTop: 10,
      borderRadius: 6,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 18,
      textAlign: 'center',
    },
    sectionTitle: {
      fontSize: 16,
      color: colors.text,
      marginBottom: 10,
    },
    dataSection: {
      width: '100%',
      marginTop: 20,
      padding: 20,
      borderRadius: 12,
      backgroundColor: colors.background,
      shadowColor: colors.shadown,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
    },
    dataButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 12,
    },
    dataButton: {
      flex: 1,
    },
    dataHint: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 8,
      lineHeight: 18,
      textAlign: 'center',
    },
  });
