import { StyleSheet, Platform } from 'react-native';
import { ColorsType } from 'src/theme/colors';

export const getStyles = (colors: ColorsType) =>
  StyleSheet.create({
    cardContainer: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 20,
      marginVertical: 10,
      width: '100%',
      shadowColor: colors.shadown,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      marginLeft: 10,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: 8,
      fontSize: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      ...Platform.select({
        windows: {
          marginStart: 15,
          marginEnd: 15,
          padding: 12,
        },
        default: {
          paddingHorizontal: 15,
          paddingVertical: 12,
        }
      })
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 10,
      ...Platform.select({
        windows: {
          padding: 15,
        },
        default: {
          paddingVertical: 15,
        }
      })
    },
    buttonText: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
    },
    switchContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      ...Platform.select({
        windows: {
          padding: 10,
        },
        default: {
          paddingVertical: 10,
        }
      })
    },
    switchLabel: {
      fontSize: 16,
      color: colors.title,
    },
    activityIndicatorContainer: {
      position: 'absolute',
      right: 0,
      top: 0,
      backgroundColor: 'rgba(255,255,255,0.8)',
      borderRadius: 50,
      padding: 5,
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
