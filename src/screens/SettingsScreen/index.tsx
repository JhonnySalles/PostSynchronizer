import React, { useCallback, useState } from 'react';
import { SafeAreaView, ScrollView, Text, Alert, } from 'react-native';
import { styles } from './styles';
import LoginCard from '../../components/LoginCard';
import { ApiServiceFactory } from 'src/services/api';
import { BLUESKY, THREADS, TUMBLR, UNKNOW, X } from 'src/constants/platforms';
import AuthTokenDao, { Credentials, TumblrCredentials } from 'src/dao/AuthTokenDao';
import { useFocusEffect } from '@react-navigation/native';
import LoadingIndicator from 'src/components/LoadingIndicator';

const DEFAULT: Credentials = {
    platform: UNKNOW,
    consumerKey: '',
    consumerSecret: '',
    token: '',
    tokenSecret: '',
    active: false,
    aditional: ''
}

const SettingsScreen = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isTesting, setIsTesting] = useState<string | null>(null);
    const [connections, setConnections] = useState<Credentials[]>([]);

    useFocusEffect(
        useCallback(() => {
            const loadSettings = async () => {
                setIsLoading(true);
                try {
                    setConnections(await AuthTokenDao.getAllCredentials());
                } catch (error) {
                    Alert.alert("Erro", "Não foi possível carregar as configurações salvas.");
                } finally {
                    setIsLoading(false);
                }
            };

            loadSettings();
        }, [])
    );

    const handleSave = async (credentials: Credentials) => {
        try {
            await AuthTokenDao.saveCredentials(credentials);
            Alert.alert('Sucesso!', 'Credenciais foram salvas no banco de dados.');
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível salvar as credenciais.');
            console.error(error as Error, { message: 'Falha ao salvar credenciais.' });
        }
    };

    const handleTestCredentials = async (credentials: Credentials) => {
        setIsTesting(credentials.platform);
        try {
            const service = ApiServiceFactory(credentials.platform);
            const isValid = await service.test(credentials);

            if (isValid) {
                Alert.alert("Sucesso!", `As credenciais são válidas e a conexão com o ${credentials.platform} foi bem-sucedida.`);

                if (credentials.platform === TUMBLR) {
                    const salvado = await AuthTokenDao.getCredentialsForPlatform<TumblrCredentials>(credentials.platform)
                    setConnections(connections.map(c => c.platform === TUMBLR ? {...c, blogs: salvado?.blogs, blogName: salvado?.blogName } : c))
                }
            } else
                Alert.alert("Falha na Conexão", "As credenciais são inválidas. Verifique os dados e tente novamente.");
        } catch (error) {
            console.error(error as Error, { message: "Erro ao testar credenciais" });
            Alert.alert("Erro", "Ocorreu um erro inesperado ao tentar testar as credenciais.");
        } finally {
            setIsTesting(null);
        }
    };

    const handleStatusChange = async (credentials: Credentials) => {
        setConnections(prev =>
            prev.map(conn =>
                conn.platform === credentials.platform ? credentials : conn
            )
        );

        try {
            await AuthTokenDao.updateActiveStatus(credentials);
        } catch (error) {
            Alert.alert("Erro", "Não foi possível atualizar o status da conexão.");
            setConnections(prev =>
                prev.map(conn =>
                    conn.platform === credentials.platform ? { ...credentials, active: !credentials.active } : conn
                )
            );
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <LoadingIndicator visible={isLoading} />

                <Text style={styles.screenTitle}>Configurar Contas</Text>

                <LoginCard
                    credential={connections.find(c => c.platform === TUMBLR) || { ...DEFAULT, platform: TUMBLR }}
                    iconName="logo-tumblr"
                    iconColor="#35465c"
                    onSave={(credentials: Credentials) => handleSave(credentials)}
                    onTest={handleTestCredentials}
                    buttonStyle={{ backgroundColor: '#35465c' }}
                    onStatusChange={(credentials) => handleStatusChange(credentials)}
                    isTesting={isTesting === TUMBLR}
                />

                <LoginCard
                    credential={connections.find(c => c.platform === X) || { ...DEFAULT, platform: X }}
                    iconName="logo-twitter"
                    iconColor="#1DA1F2"
                    onSave={(credentials: Credentials) => handleSave(credentials)}
                    onTest={handleTestCredentials}
                    buttonStyle={{ backgroundColor: '#1DA1F2' }}
                    onStatusChange={(credentials) => handleStatusChange(credentials)}
                    isTesting={isTesting === X}
                />

                <LoginCard
                    credential={connections.find(c => c.platform === THREADS) || { ...DEFAULT, platform: THREADS }}
                    iconName="at-sharp"
                    iconColor="#000000"
                    onSave={(credentials: Credentials) => handleSave(credentials)}
                    onTest={handleTestCredentials}
                    buttonStyle={{ backgroundColor: '#000000' }}
                    onStatusChange={(credentials) => handleStatusChange(credentials)}
                    isTesting={isTesting === THREADS}
                />

                <LoginCard
                    credential={connections.find(c => c.platform === BLUESKY) || { ...DEFAULT, platform: BLUESKY }}
                    iconName="chatbubbles-outline"
                    iconColor="#0288dbff"
                    onSave={(credentials: Credentials) => handleSave(credentials)}
                    onTest={handleTestCredentials}
                    buttonStyle={{ backgroundColor: '#0288dbff' }}
                    onStatusChange={(credentials) => handleStatusChange(credentials)}
                    isTesting={isTesting === THREADS}
                />
            </ScrollView>
        </SafeAreaView>
    );
};

export default SettingsScreen;