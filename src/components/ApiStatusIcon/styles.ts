import { StyleSheet } from 'react-native';
import { ColorsType } from '../../theme/colors';

export const getStyles = (colors: ColorsType) =>
  StyleSheet.create({
    container: {
      marginRight: 15,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
