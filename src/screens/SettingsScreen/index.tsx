import React from 'react';
import { SafeAreaView, ScrollView, Text, Alert, } from 'react-native';
import { styles } from './styles';
import LoginCard from '../../components/LoginCard';
import { ApiServiceFactory } from '../../services/api';
import { PlatformType } from '../../constants/platforms';

const SettingsScreen = () => {
    const handleLogin = async (
        platform: PlatformType,
        username: string,
        password_or_token: string,
    ) => {
        Alert.alert(
            'Conectando...',
            `Tentando autenticar com ${platform} para o usuário ${username}.`,
        );

        try {
            const service = ApiServiceFactory(platform);

            const success = await service.login(username, password_or_token);

            // 4. Trata o resultado
            if (success)
                Alert.alert(
                    'Sucesso!',
                    `A conta do ${platform} para ${username} foi conectada e salva.`,
                );
            else 
                throw new Error('Ocorreu um erro durante o login.');
            
        } catch (error) {
            console.error(`Erro ao conectar com ${platform}:`, error);
            Alert.alert(
                'Erro',
                `Não foi possível conectar a conta do ${platform}. Tente novamente.`,
            );
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.screenTitle}>Conectar Contas</Text>

                <LoginCard
                    platformName="Tumblr"
                    iconName="logo-tumblr"
                    iconColor="#35465c"
                    onLogin={(user, pass) => handleLogin('tumblr', user, pass)}
                    buttonStyle={{ backgroundColor: '#35465c' }}
                />

                <LoginCard
                    platformName="X (Twitter)"
                    iconName="logo-twitter"
                    iconColor="#1DA1F2"
                    onLogin={(user, pass) => handleLogin('x', user, pass)}
                    buttonStyle={{ backgroundColor: '#1DA1F2' }}
                />

                <LoginCard
                    platformName="Threads"
                    // O Ionicons pode não ter um ícone do Threads ainda, usamos um genérico
                    iconName="at-sharp"
                    iconColor="#000000"
                    onLogin={(user, pass) => handleLogin('threads', user, pass)}
                    buttonStyle={{ backgroundColor: '#000000' }}
                />
            </ScrollView>
        </SafeAreaView>
    );
};

export default SettingsScreen;