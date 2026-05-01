import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../theme/ThemeProvider';
import { getStyles } from './styles';
import { apiService } from 'src/services/ApiService';
import { ApiStatusType, CONNECTING, OFFLINE, ONLINE } from 'src/constants/app';

export const ApiStatusIcon = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [status, setStatus] = useState(apiService.getApiStatus());
  const [isChecking, setIsChecking] = useState(false);

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

  const handlePress = async () => {
    if (isChecking) return;

    setIsChecking(true);
    const isOnline = await apiService.checkHealth();
    setIsChecking(false);

    if (isOnline) {
      Toast.show({
        type: 'success',
        text1: 'API Online',
        text2: 'O servidor backend está respondendo corretamente.',
        position: 'top',
        visibilityTime: 3000,
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'API Offline',
        text2: 'Não foi possível estabelecer conexão com o servidor backend.',
        position: 'top',
        visibilityTime: 4000,
      });
    }
  };

  return (
    <TouchableOpacity 
      onPress={handlePress} 
      style={styles.container}
      disabled={isChecking}
    >
      <Icon 
        name={isChecking ? "sync-outline" : "server"} 
        size={24} 
        color={getStatusColor()} 
      />
    </TouchableOpacity>
  );
};
