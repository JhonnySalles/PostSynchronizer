import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView, ScrollView, Text, Alert, } from 'react-native';
import { getStyles } from './styles';
import LoginCard from '../../components/LoginCard';
import { apiService } from 'src/services/ApiService';
import { BLUESKY, THREADS, TUMBLR, UNKNOW, X } from 'src/constants/platforms';
import AuthTokenDao, { Credentials, TumblrCredentials } from 'src/dao/AuthTokenDao';
import { useFocusEffect } from '@react-navigation/native';
import LoadingIndicator from 'src/components/LoadingIndicator';
import Logger from 'src/services/LoggerService';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../../theme/ThemeProvider';
import { DARK, LIGHT, SYSTEM } from 'src/constants/themes';

const DEFAULT: Credentials = {
    platform: UNKNOW,
    active: false,
    aditional: ''
}

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
                } catch (e: Error | any) {
                    Logger.error(e, { msg: '[Settings Screen] Não foi possível carregar as configurações salvas.' });
                    Alert.alert("Erro", "Não foi possível carregar as configurações salvas.");
                } finally {
                    setIsLoading(false);
                }
            };

            loadSettings();
        }, [])
    );

    const handleConsultBlogs = async (credentials: Credentials) => {
        setIsConsulting(credentials.platform);
        setConnections(connections.filter(c => c.platform !== credentials.platform).concat([credentials]));
        try {
            const blogs = await apiService.getTumblrBlogs(credentials as TumblrCredentials);

            if (blogs && blogs.length > 0) {
                Alert.alert("Sucesso!", `As credenciais são válidas e a conexão com o ${credentials.platform} foi bem-sucedida.`);

                if (credentials.platform === TUMBLR) {
                    const salvado = await AuthTokenDao.getCredentialsForPlatform<TumblrCredentials>(credentials.platform)
                    setConnections(connections.map(c => c.platform === TUMBLR ? { ...c, blogs: salvado?.blogs, blogName: salvado?.blogName } : c))
                }
            } else
                Alert.alert("Falha na Conexão", "As credenciais são inválidas. Verifique os dados e tente novamente.");
        } catch (e: Error | any) {
            Logger.error(e, { message: '[Settings Screen] Erro ao testar credenciais.' });
            Alert.alert("Erro", "Ocorreu um erro inesperado ao tentar testar as credenciais.");
        } finally {
            setIsConsulting(null);
        }
    };

    const handleStatusChange = async (credentials: Credentials) => {
        setConnections(connections.filter(c => c.platform !== credentials.platform).concat([credentials]));

        try {
            await AuthTokenDao.updateActiveStatus(credentials);
        } catch (e: Error | any) {
            Logger.error(e, { message: '[Settings Screen] Não foi possível atualizar o status da conexão.' });
            Alert.alert("Erro", "Não foi possível atualizar o status da conexão.");
            credentials.active = !credentials.active;
            setConnections(connections.filter(c => c.platform !== credentials.platform).concat([credentials]));
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <LoadingIndicator visible={isLoading} />

                <View style={styles.themeSelectorContainer}>
                    <Text style={styles.themeSelectorLabel}>Aparência do Aplicativo</Text>
                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={themeMode}
                            onValueChange={(itemValue) => setThemeMode(itemValue)}
                            dropdownIconColor={colors.text}
                            style={{ width: '100%', color: colors.text, }}
                        >
                            <Picker.Item label="Padrão do Sistema" value={ SYSTEM } />
                            <Picker.Item label="Modo Claro" value={ LIGHT } />
                            <Picker.Item label="Modo Escuro" value={ DARK } />
                        </Picker>
                    </View>
                </View>

                <LoginCard
                    credential={connections.find(c => c.platform === TUMBLR) || { ...DEFAULT, platform: TUMBLR }}
                    iconName="logo-tumblr"
                    iconColor={colors.tumblr}
                    onConsult={handleConsultBlogs}
                    buttonStyle={{ backgroundColor: colors.tumblr }}
                    onStatusChange={(credentials) => handleStatusChange(credentials)}
                    isConsulting={isConsulting === TUMBLR}
                />

                <LoginCard
                    credential={connections.find(c => c.platform === X) || { ...DEFAULT, platform: X }}
                    iconName="logo-twitter"
                    iconColor={colors.twitter}
                    buttonStyle={{ backgroundColor: colors.twitter }}
                    onStatusChange={(credentials) => handleStatusChange(credentials)}
                />

                <LoginCard
                    credential={connections.find(c => c.platform === THREADS) || { ...DEFAULT, platform: THREADS }}
                    iconName="at-sharp"
                    iconColor={colors.threads}
                    buttonStyle={{ backgroundColor: colors.threads }}
                    onStatusChange={(credentials) => handleStatusChange(credentials)}
                />

                <LoginCard
                    credential={connections.find(c => c.platform === BLUESKY) || { ...DEFAULT, platform: BLUESKY }}
                    iconName="chatbubbles-outline"
                    iconColor={colors.bluesky}
                    buttonStyle={{ backgroundColor: colors.bluesky }}
                    onStatusChange={(credentials) => handleStatusChange(credentials)}
                />
            </ScrollView>
        </SafeAreaView>
    );
};

export default SettingsScreen;