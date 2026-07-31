import { SafeAreaView, ScrollView, Text, Alert, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStyles } from './styles';
import PlatformCard from '../../components/PlatformCard';
import { apiService } from 'src/services/ApiService';
import { BLUESKY, THREADS, TUMBLR, UNKNOW, X } from 'src/constants/platforms';
import AuthTokenDao, { Credentials, TumblrCredentials } from 'src/dao/AuthTokenDao';
import { useFocusEffect } from '@react-navigation/native';
import LoadingIndicator from 'src/components/LoadingIndicator';
import Logger from 'src/services/LoggerService';
import { useTheme } from '../../theme/ThemeProvider';
import { DARK, LIGHT, SYSTEM } from 'src/constants/themes';
import Button from 'src/components/Button';
import DropDownPicker from 'react-native-dropdown-picker';
import { AI_PROMPT_KEY, DEFAULT_PROMPT } from 'src/constants/app';
import { useCallback, useState } from 'react';
import { exportDatabase, importDatabase } from 'src/services/BackupService';
import Toast from 'react-native-toast-message';
import ConfirmPopup from 'src/components/ConfirmPopup';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { threadsAuthService } from 'src/services/ThreadsAuthService';

const DEFAULT: Credentials = {
  platform: UNKNOW,
  active: false,
  aditional: '',
};

const SettingsScreen = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isConsulting, setIsConsulting] = useState<string | null>(null);
  const [connections, setConnections] = useState<Credentials[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [isThreadsLogging, setIsThreadsLogging] = useState(false);
  const [threadsTokenStatus, setThreadsTokenStatus] = useState<{
    text: string;
    type: 'success' | 'warning' | 'error' | 'info';
  } | null>(null);

  const { themeMode, setThemeMode, colors, isDark } = useTheme();
  const styles = getStyles(colors);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([
    { label: 'Padrão do Sistema', value: SYSTEM },
    { label: 'Modo Claro', value: LIGHT },
    { label: 'Modo Escuro', value: DARK },
  ]);

  const loadThreadsExpiryStatus = async () => {
    const info = await threadsAuthService.checkTokenExpiry();
    if (!info.expiryDate) {
      setThreadsTokenStatus(null);
      return;
    }
    if (info.daysRemaining <= 0) {
      setThreadsTokenStatus({ text: 'Token expirado', type: 'error' });
    } else if (info.isExpiringSoon) {
      setThreadsTokenStatus({ text: `Expira em ${info.daysRemaining}d`, type: 'warning' });
    } else {
      setThreadsTokenStatus({ text: `Token OK (${info.daysRemaining}d)`, type: 'success' });
    }
  };

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

        try {
          const savedPrompt = await AsyncStorage.getItem(AI_PROMPT_KEY);
          setAiPrompt(savedPrompt || DEFAULT_PROMPT);
        } catch (error) {
          Logger.error(error, { msg: '[Settings Screen] Erro ao carregar prompt da IA.' });
        }

        await loadThreadsExpiryStatus();
      };

      loadSettings();
    }, []),
  );

  const handleThreadsLogin = async () => {
    setIsThreadsLogging(true);
    try {
      // 1. Tentar renovação inteligente com o token existente
      Toast.show({
        type: 'info',
        text1: 'Verificando Token',
        text2: 'Tentando renovar token atual sem login...',
        position: 'top',
        visibilityTime: 2500,
      });

      const refreshSuccess = await threadsAuthService.tryTokenRefreshFlow();
      if (refreshSuccess) {
        Toast.show({
          type: 'success',
          text1: 'Sucesso',
          text2: 'Token renovado e deploy no Render iniciado!',
          position: 'top',
          visibilityTime: 5000,
        });
        await loadThreadsExpiryStatus();
        return;
      }

      // 2. Se falhar, segue com o fluxo OAuth tradicional
      Toast.show({
        type: 'info',
        text1: 'Autenticação Necessária',
        text2: 'Abriremos o navegador para realizar o login completo.',
        position: 'top',
        visibilityTime: 3000,
      });

      const authUrl = threadsAuthService.getAuthorizationUrl();
      const redirectUrl = 'https://127.0.0.1:3000/callback';

      if (await InAppBrowser.isAvailable()) {
        const result = await InAppBrowser.openAuth(authUrl, redirectUrl, {
          // iOS Properties
          ephemeralWebSession: false,
          // Android Properties
          showTitle: false,
          enableUrlBarHiding: true,
          enableDefaultShare: false,
          forceCloseOnRedirection: true,
        });

        if (result.type === 'success' && result.url) {
          const urlObj = new URL(result.url);
          const code = urlObj.searchParams.get('code');
          if (code) {
            Toast.show({
              type: 'info',
              text1: 'Autenticação Threads',
              text2: 'Código obtido. Atualizando Render API...',
              position: 'top',
              visibilityTime: 4000,
            });

            await threadsAuthService.handleFullLoginFlow(code);

            Toast.show({
              type: 'success',
              text1: 'Sucesso',
              text2: 'Token atualizado e deploy no Render iniciado!',
              position: 'top',
              visibilityTime: 5000,
            });

            await loadThreadsExpiryStatus();
          } else {
            throw new Error('Nenhum código de autorização encontrado na URL.');
          }
        }
      } else {
        Alert.alert('Erro', 'Navegador interno não disponível no dispositivo.');
      }
    } catch (error: any) {
      Logger.error(error, { msg: '[Settings Screen] Erro no login do Threads' });
      Alert.alert('Erro no Login Threads', error.message || 'Erro inesperado durante a autenticação.');
    } finally {
      setIsThreadsLogging(false);
    }
  };

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
        Alert.alert('Login Bem-Sucedido!', 'Login realizado com sucesso na api.');
      else
        Alert.alert('Falha no Login', 'Não foi possível realizar o login na api. Verifique sua internet.');
    } catch (e) {
      Alert.alert('Erro Crítico no Login', (e as Error).message);
    }
  };

  const handleSavePrompt = async (text: string) => {
    setAiPrompt(text);
    try {
      await AsyncStorage.setItem(AI_PROMPT_KEY, text);
    } catch (error) {
      Logger.error(error, { message: '[Settings Screen] Erro ao salvar prompt da IA.' });
    }
  };

  const handleExportBackup = async () => {
    setIsLoading(true);
    try {
      const success = await exportDatabase();
      if (success) {
        Toast.show({
          type: 'success',
          text1: 'Backup Concluído',
          text2: 'O arquivo de backup foi gerado e compartilhado.',
          position: 'top',
          visibilityTime: 4000,
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Erro no Backup',
        text2: error.message,
        position: 'top',
        visibilityTime: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    setShowImportConfirm(false);
    setIsLoading(true);
    try {
      const success = await importDatabase();
      if (success) {
        Alert.alert(
          'Importação Concluída',
          'O banco de dados foi restaurado com sucesso. O aplicativo será encerrado para aplicar as mudanças.',
          [{ text: 'OK', onPress: () => Logger.debug('[App] Reiniciar app após importação') }],
        );
      }
    } catch (error: any) {
      Alert.alert('Erro na Importação', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <LoadingIndicator visible={isLoading} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, width: '100%' }}>
          <Button title="Login na API" onPress={handleLoginTest} style={{ flex: 1 }} testID="login-api-button" />
        </View>

        {/* 1. Aparência do Aplicativo */}
        <View style={styles.themeSelectorContainer}>
          <Text style={styles.themeSelectorLabel}>Aparência do Aplicativo</Text>
          <DropDownPicker
            open={open}
            value={themeMode}
            items={items}
            setOpen={setOpen}
            setValue={callback => {
              const newValue = callback(themeMode);
              setThemeMode(newValue);
            }}
            setItems={setItems}
            theme={isDark ? 'DARK' : 'LIGHT'}
            style={styles.pickerContainer}
            textStyle={styles.pickerTextStyle}
            placeholderStyle={styles.pickerPlaceholderStyle}
            dropDownContainerStyle={styles.pickerDropDownContainer}
            listItemLabelStyle={styles.pickerListItemLabel}
            listMode="SCROLLVIEW"
          />
        </View>

        {/* 2. Gerenciamento de Dados (Reposicionado) */}
        <View style={styles.dataSection}>
          <Text style={styles.sectionTitle}>Gerenciamento de Dados</Text>
          <View style={styles.dataButtonsRow}>
            <Button
              title="Gerar Backup"
              onPress={handleExportBackup}
              style={styles.dataButton}
              icon="cloud-upload-outline"
              variant="secondary"
              testID="generate-backup-button"
            />
            <Button
              title="Importar Backup"
              onPress={() => setShowImportConfirm(true)}
              style={styles.dataButton}
              icon="cloud-download-outline"
              variant="secondary"
              testID="import-backup-button"
            />
          </View>
          <Text style={styles.dataHint}>
            Use o backup para transferir seus dados entre dispositivos ou garantir uma cópia de segurança.
          </Text>
        </View>

        {/* 3. Prompt da IA (Abaixo dos Dados) */}
        <View style={styles.promptContainer}>
          <Text style={styles.promptLabel}>Prompt da IA para Sugestões</Text>
          <TextInput
            style={styles.promptInput}
            multiline
            value={aiPrompt}
            onChangeText={handleSavePrompt}
            placeholder="Digite o modelo de prompt aqui..."
            placeholderTextColor={colors.textSecondary}
            testID="ai-prompt-input"
          />
          <Button
            title="Limpar"
            onPress={() => handleSavePrompt(DEFAULT_PROMPT)}
            style={styles.promptClearButton}
            icon="refresh-outline"
            variant="secondary"
          />
          <Text style={styles.promptHint}>
            Parâmetros aceitos (opcionais):{'\n'}
            ::texto - Texto base da postagem{'\n'}
            ::tags - Tags selecionadas{'\n'}
            ::plataformas - Redes sociais ativas{'\n'}
            ::emocao - Humor selecionado
          </Text>
        </View>

        <PlatformCard
          credential={
            connections.find(c => c.platform === TUMBLR) ||
            ({
              ...DEFAULT,
              platform: TUMBLR,
              blogs: [],
              blogName: '',
            } as TumblrCredentials)
          }
          iconName="logo-tumblr"
          iconColor={colors.tumblr}
          onConsult={handleConsultBlogs}
          buttonStyle={{ backgroundColor: colors.tumblr }}
          onStatusChange={credentials => handleStatusChange(credentials)}
          onCredentialsChange={credentials => handleCredentialsChange(credentials)}
          isConsulting={isConsulting === TUMBLR}
        />

        <PlatformCard
          credential={
            connections.find(c => c.platform === X) || {
              ...DEFAULT,
              platform: X,
            }
          }
          iconName="logo-twitter"
          iconColor={colors.x}
          buttonStyle={{ backgroundColor: colors.x }}
          onStatusChange={credentials => handleStatusChange(credentials)}
        />

        <PlatformCard
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
          extraAction={{
            title: isThreadsLogging
              ? 'Conectando...'
              : threadsTokenStatus && threadsTokenStatus.type === 'success'
                ? 'Atualizar Token do Threads'
                : 'Gerar Token do Threads',
            icon: 'logo-instagram',
            onPress: handleThreadsLogin,
            isLoading: isThreadsLogging,
          }}
          statusBadge={threadsTokenStatus}
        />

        <PlatformCard
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

      <ConfirmPopup
        visible={showImportConfirm}
        title="Atenção!"
        message="Ao importar um backup, todos os seus dados atuais (postagens, histórico, conexões) serão substituídos pelo arquivo selecionado. O aplicativo precisará ser reiniciado. Deseja continuar?"
        confirmLabel="Importar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmImport}
        onCancel={() => setShowImportConfirm(false)}
        isDestructive
      />
    </SafeAreaView>
  );
};

export default SettingsScreen;
