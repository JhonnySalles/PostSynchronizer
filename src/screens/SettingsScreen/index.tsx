import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView, ScrollView, Text, Alert } from 'react-native';
import { getStyles } from './styles';
import LoginCard from '../../components/LoginCard';
import { apiService } from 'src/services/ApiService';
import { BLUESKY, THREADS, TUMBLR, UNKNOW, X } from 'src/constants/platforms';
import AuthTokenDao, { Credentials } from 'src/dao/AuthTokenDao';
import { useFocusEffect } from '@react-navigation/native';
import LoadingIndicator from 'src/components/LoadingIndicator';
import Logger from 'src/services/LoggerService';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../../theme/ThemeProvider';
import { DARK, LIGHT, SYSTEM } from 'src/constants/themes';
import Button from 'src/components/Button';

const DEFAULT: Credentials = {
  platform: UNKNOW,
  active: false,
  aditional: '',
};

const SettingsScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isConsulting, setIsConsulting] = useState<string | null>(null);
  const [connections, setConnections] = useState<Credentials[]>([]);

  const { themeMode, setThemeMode, colors } = useTheme();
  const styles = getStyles(colors);

  useFocusEffect(
    useCallback(() => {
      const loadSettings = async () => {
        setIsLoading(true);
        try {
          setConnections(await AuthTokenDao.getAllCredentials());
        } catch (error: Error | any) {
          Logger.error(error, {
            msg: '[Settings Screen] Não foi possível carregar as configurações salvas.',
          });
          Alert.alert('Erro', 'Não foi possível carregar as configurações salvas.');
        } finally {
          setIsLoading(false);
        }
      };

      loadSettings();
    }, []),
  );

  const handleConsultBlogs = async (credentials: Credentials) => {
    setIsConsulting(credentials.platform);
    setConnections(connections.filter(c => c.platform !== credentials.platform).concat([credentials]));
    try {
      const blogs = await apiService.getTumblrBlogs();

      // prettier-ignore
      if (blogs && blogs.length > 0) {
        // prettier-ignore
        if (credentials.platform === TUMBLR)
          setConnections(prevConnections => prevConnections.map(c => c.platform === TUMBLR ? { ...c, blogs: blogs } : c));
      } else
        Alert.alert('Falha na Conexão', 'Erro ao realizar o recebimento dos dados do blog.');
    } catch (error: Error | any) {
      Logger.error(error, {
        message: '[Settings Screen] Erro ao obter os dados do blog.',
      });
      Alert.alert('Erro', 'Ocorreu um erro inesperado ao tentar obter os dados do blog.');
    } finally {
      setIsConsulting(null);
    }
  };

  const handleStatusChange = async (updatedCredentials: Credentials) => {
    const originalConnections = connections;

    setConnections(prevConnections =>
      prevConnections.map(c => (c.platform === updatedCredentials.platform ? updatedCredentials : c)),
    );

    try {
      await AuthTokenDao.updateActiveStatus(updatedCredentials);
    } catch (error: Error | any) {
      Logger.error(error, {
        message: '[Settings Screen] Não foi possível atualizar o status da conexão.',
      });
      Alert.alert('Erro', 'Não foi possível atualizar o status da conexão.');
      setConnections(originalConnections);
    }
  };

  const handleCredentialsChange = async (updatedCredentials: Credentials) => {
    const originalConnections = connections;

    setConnections(prevConnections =>
      prevConnections.map(c => (c.platform === updatedCredentials.platform ? updatedCredentials : c)),
    );

    try {
      await AuthTokenDao.saveCredentials(updatedCredentials);
    } catch (error: Error | any) {
      Logger.error(error, {
        message: '[Settings Screen] Não foi possível atualizar as credenciais.',
      });
      Alert.alert('Erro', 'Não foi possível atualizar as credenciais.');
      setConnections(originalConnections);
    }
  };

  const handleLoginTest = async () => {
    try {
      const success = await apiService.login();

      // prettier-ignore
      if (success)
        Alert.alert('Login Bem-Sucedido!', `Login realizado com sucesso na api.`);
      else
        Alert.alert('Falha no Login', 'Não foi possível realizar o login na api. Verifique sua internet.');
    } catch (e) {
      Alert.alert('Erro Crítico no Login', (e as Error).message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <LoadingIndicator visible={isLoading} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
          <Button title="Login na API" onPress={handleLoginTest} style={{ flex: 1, marginRight: 10 }} />
        </View>

        <View style={styles.themeSelectorContainer}>
          <Text style={styles.themeSelectorLabel}>Aparência do Aplicativo</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={themeMode}
              onValueChange={itemValue => setThemeMode(itemValue)}
              dropdownIconColor={colors.text}
              style={{ width: '100%', color: colors.text }}
            >
              <Picker.Item label="Padrão do Sistema" value={SYSTEM} />
              <Picker.Item label="Modo Claro" value={LIGHT} />
              <Picker.Item label="Modo Escuro" value={DARK} />
            </Picker>
          </View>
        </View>

        <LoginCard
          credential={
            connections.find(c => c.platform === TUMBLR) || {
              ...DEFAULT,
              platform: TUMBLR,
            }
          }
          iconName="logo-tumblr"
          iconColor={colors.tumblr}
          onConsult={handleConsultBlogs}
          buttonStyle={{ backgroundColor: colors.tumblr }}
          onStatusChange={credentials => handleStatusChange(credentials)}
          onCredentialsChange={credentials => handleCredentialsChange(credentials)}
          isConsulting={isConsulting === TUMBLR}
        />

        <LoginCard
          credential={
            connections.find(c => c.platform === X) || {
              ...DEFAULT,
              platform: X,
            }
          }
          iconName="logo-twitter"
          iconColor={colors.twitter}
          buttonStyle={{ backgroundColor: colors.twitter }}
          onStatusChange={credentials => handleStatusChange(credentials)}
        />

        <LoginCard
          credential={
            connections.find(c => c.platform === THREADS) || {
              ...DEFAULT,
              platform: THREADS,
            }
          }
          iconName="at-sharp"
          iconColor={colors.threads}
          buttonStyle={{ backgroundColor: colors.threads }}
          onStatusChange={credentials => handleStatusChange(credentials)}
        />

        <LoginCard
          credential={
            connections.find(c => c.platform === BLUESKY) || {
              ...DEFAULT,
              platform: BLUESKY,
            }
          }
          iconName="chatbubbles-outline"
          iconColor={colors.bluesky}
          buttonStyle={{ backgroundColor: colors.bluesky }}
          onStatusChange={credentials => handleStatusChange(credentials)}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;
