import React, { useState } from 'react';
import { SafeAreaView, ScrollView, Text, Alert, } from 'react-native';
import { styles } from './styles';
import LoginCard from '../../components/LoginCard';
import AuthTokenDao, { Credentials } from 'src/dao/AuthTokenDao';
import { ApiServiceFactory } from 'src/services/api';
import { THREADS, TUMBLR, X } from 'src/constants/platforms';

const SettingsScreen = () => {
    const [isTesting, setIsTesting] = useState(false);

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

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.screenTitle}>Conectar Contas</Text>

                <LoginCard
                    platform={TUMBLR}
                    iconName="logo-tumblr"
                    iconColor="#35465c"
                    onSave={(credentials: Credentials) => handleSave(credentials)}
                    onTest={handleTestCredentials}
                    buttonStyle={{ backgroundColor: '#35465c' }}
                />

                <LoginCard
                    platform={X}
                    iconName="logo-twitter"
                    iconColor="#1DA1F2"
                    onSave={(credentials: Credentials) => handleSave(credentials)}
                    onTest={handleTestCredentials}
                    buttonStyle={{ backgroundColor: '#1DA1F2' }}
                />

                <LoginCard
                    platform={THREADS}
                    iconName="at-sharp"
                    iconColor="#000000"
                    onSave={(credentials: Credentials) => handleSave(credentials)}
                    onTest={handleTestCredentials}
                    buttonStyle={{ backgroundColor: '#000000' }}
                />
            </ScrollView>
        </SafeAreaView>
    );
};

export default SettingsScreen;