import React from 'react';
import { SafeAreaView, ScrollView, Text, Alert, } from 'react-native';
import { styles } from './styles';
import LoginCard from '../../components/LoginCard';
import { getDBConnection } from '../../database';
import api from '../../services/api'; // Usaremos para simular a chamada

const SettingsScreen = () => {
    const handleLogin = async (
        platform: 'tumblr' | 'x' | 'threads',
        username: string,
        password_or_token: string,
    ) => {
        Alert.alert(
            'Conectando...',
            `Tentando autenticar com ${platform} para o usuário ${username}.`,
        );

        try {
            // --- SIMULAÇÃO DE CHAMADA DE API ---
            // Na vida real, você faria uma chamada para sua API ou usaria um SDK
            // para autenticar o usuário e obter um token.
            // Ex: const response = await api.post(`/auth/${platform}`, { username, password });
            console.log(
                `Simulando requisição para ${platform} com usuário: ${username}`,
            );

            // Vamos criar um token falso para fins de demonstração
            const fakeToken = `fake-token-${platform}-${Date.now()}`;
            console.log(`Token falso gerado: ${fakeToken}`);
            // --- FIM DA SIMULAÇÃO ---

            // Salvar o token no banco de dados
            const db = await getDBConnection();
            await db.executeSql(
                // INSERT OR REPLACE irá inserir um novo registro ou atualizar um
                // existente se a chave primária (platform) já existir.
                'INSERT OR REPLACE INTO auth_tokens (platform, username, token) VALUES (?, ?, ?);',
                [platform, username, fakeToken],
            );

            console.log(`Dados para ${platform} salvos no banco de dados.`);
            Alert.alert(
                'Sucesso!',
                `A conta do ${platform} para ${username} foi conectada e salva.`,
            );
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