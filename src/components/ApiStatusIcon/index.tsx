import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { getStyles } from './styles';
import { apiService } from 'src/services/ApiService';
import { ApiStatusType, CONNECTING, OFFLINE, ONLINE } from 'src/constants/app';

export const ApiStatusIcon = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [status, setStatus] = useState(apiService.getApiStatus());

  useEffect(() => {
    const handleStatusChange = (newStatus: ApiStatusType) => {
      setStatus(newStatus);
    };
    apiService.onApiStatusChange(handleStatusChange);

    return () => {
      apiService.offApiStatusChange(handleStatusChange);
    };
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case ONLINE:
        return '#4ade80';
      case CONNECTING:
        return '#fbbf24';
      case OFFLINE:
        return '#f87171';
      default:
        return '#9ca3af';
    }
  };

  return (
    <View style={styles.container}>
      <Icon name="server" size={24} color={getStatusColor()} />
    </View>
  );
};
