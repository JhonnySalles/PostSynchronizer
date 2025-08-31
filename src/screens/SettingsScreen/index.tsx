import React, { useState } from 'react';
import { SafeAreaView, ScrollView, Text, Alert, } from 'react-native';
import { styles } from './styles';
import LoginCard from '../../components/LoginCard';
import { ApiServiceFactory } from 'src/services/api';
import { THREADS, TUMBLR, UNKNOW, X } from 'src/constants/platforms';
import AuthTokenDao, { Credentials } from 'src/dao/AuthTokenDao';

const DEFAULT : Credentials = {
    platform: UNKNOW,
    consumerKey: '',
    consumerSecret: '',
    token: '',
    tokenSecret: '',
    actived: false,
    aditional: ''
}

const SettingsScreen = () => {
    const [isTesting, setIsTesting] = useState(false);
    const [connections, setConnections] = useState<Credentials[]>([]);

    const handleSave = async (credentials: Credentials) => {
        Alert.alert('Salvando...', 'Gravando credenciais do Tumblr.');
        try {
            await AuthTokenDao.saveCredentials('tumblr', credentials);
            Alert.alert('Sucesso!', 'Credenciais do Tumblr foram salvas no banco de dados.');
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível salvar as credenciais.');
            console.error(error as Error, { message: 'Falha ao salvar creds do Tumblr' });
        }
    };

    const handleTestCredentials = async (credentials: Credentials) => {
        setIsTesting(true);
        try {
            const tumblrService = ApiServiceFactory('tumblr');
            const isValid = await tumblrService.test(credentials);

            if (isValid)
                Alert.alert("Sucesso!", "As credenciais são válidas e a conexão com o Tumblr foi bem-sucedida.");
            else
                Alert.alert("Falha na Conexão", "As credenciais são inválidas. Verifique os dados e tente novamente.");
        } catch (error) {
            console.error(error as Error, { message: "Erro ao testar credenciais do Tumblr" });
            Alert.alert("Erro", "Ocorreu um erro inesperado ao tentar testar as credenciais.");
        } finally {
            setIsTesting(false);
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
                    conn.platform === credentials.platform ? { ...credentials, actived: !credentials.actived } : conn
                )
            );
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.screenTitle}>Configurar Contas</Text>

                <LoginCard
                    credential={connections.find(c => c.platform === TUMBLR) || {...DEFAULT, platform: TUMBLR}}
                    iconName="logo-tumblr"
                    iconColor="#35465c"
                    onSave={(credentials: Credentials) => handleSave(credentials)}
                    onTest={handleTestCredentials}
                    buttonStyle={{ backgroundColor: '#35465c' }}
                    isActive={connections.find(c => c.platform === TUMBLR)?.actived || false}
                    onStatusChange={(credentials) => handleStatusChange(credentials)}
                />

                <LoginCard
                    credential={connections.find(c => c.platform === X) || {...DEFAULT, platform: X}}
                    iconName="logo-twitter"
                    iconColor="#1DA1F2"
                    onSave={(credentials: Credentials) => handleSave(credentials)}
                    onTest={handleTestCredentials}
                    buttonStyle={{ backgroundColor: '#1DA1F2' }}
                    isActive={connections.find(c => c.platform === X)?.actived || false}
                    onStatusChange={(credentials) => handleStatusChange(credentials)}
                />

                <LoginCard
                    credential={connections.find(c => c.platform === THREADS) || {...DEFAULT, platform: THREADS}}
                    iconName="at-sharp"
                    iconColor="#000000"
                    onSave={(credentials: Credentials) => handleSave(credentials)}
                    onTest={handleTestCredentials}
                    buttonStyle={{ backgroundColor: '#000000' }}
                    isActive={connections.find(c => c.platform === THREADS)?.actived || false}
                    onStatusChange={(credentials) => handleStatusChange(credentials)}
                />
            </ScrollView>
        </SafeAreaView>
    );
};

export default SettingsScreen;