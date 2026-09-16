import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../theme/ThemeProvider';
import { getStyles } from './styles';
import { apiService } from 'src/services/ApiService';
import { threadsJobService } from 'src/services/ThreadsJobService';
import { ApiStatusType, CONNECTING, OFFLINE, ONLINE } from 'src/constants/app';

export const ApiStatusIcon = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [status, setStatus] = useState(apiService.getApiStatus());
  const [isChecking, setIsChecking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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

  const handleManualSync = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    Toast.show({
      type: 'info',
      text1: 'Sincronizando...',
      text2: 'Consultando status de jobs na API e atualizando Firebase.',
      position: 'top',
      visibilityTime: 2000,
    });

    try {
      const result = await threadsJobService.manualSync();
      setIsSyncing(false);

      Toast.show({
        type: 'success',
        text1: 'Sincronização Concluída',
        text2:
          result.activeJobsChecked > 0
            ? `${result.activeJobsChecked} job(s) consultado(s) com sucesso.`
            : 'Nenhum job pendente. Dados atualizados.',
        position: 'top',
        visibilityTime: 3000,
      });
    } catch (error: any) {
      setIsSyncing(false);
      Toast.show({
        type: 'error',
        text1: 'Falha na Sincronização',
        text2: error?.message || 'Erro ao sincronizar com o servidor.',
        position: 'top',
        visibilityTime: 4000,
      });
    }
  };

  const handlePressStatus = async () => {
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
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleManualSync}
        style={[styles.button, styles.syncButton]}
        disabled={isSyncing}
        testID="manual-sync-button"
        accessibilityLabel="Sincronizar jobs e dados manualmente"
      >
        <Icon
          name={isSyncing ? 'refresh' : 'refresh-outline'}
          size={22}
          color={colors.primary}
        />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handlePressStatus}
        style={styles.button}
        disabled={isChecking}
        testID="api-status-icon-button"
        accessibilityLabel="Verificar status do servidor"
      >
        <Icon
          name={isChecking ? 'sync-outline' : 'server'}
          size={22}
          color={getStatusColor()}
        />
      </TouchableOpacity>
    </View>
  );
};

