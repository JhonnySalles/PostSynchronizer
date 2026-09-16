import { StyleSheet } from 'react-native';
import { ColorsType } from '../../theme/colors';

export const getStyles = (colors: ColorsType) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 15,
    },
    button: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 4,
    },
    syncButton: {
      marginRight: 10,
    },
  });
