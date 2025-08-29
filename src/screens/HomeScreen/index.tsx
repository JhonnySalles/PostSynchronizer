import React, { useState, useCallback } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, Alert, FlatList, Image, ScrollView, } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';

import { getStyles } from './styles';
import { useTheme } from '../../theme/ThemeProvider';
import { getDBConnection } from '../../database';

type ConnectionStatus = {
    tumblr: boolean;
    x: boolean;
    threads: boolean;
};

const SOCIAL_PLATFORMS = [
    { name: 'tumblr', icon: 'logo-tumblr' },
    { name: 'x', icon: 'logo-twitter' },
    { name: 'threads', icon: 'at-sharp' },
] as const; // 'as const' para tipagem forte

const HomeScreen = () => {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const [connections, setConnections] = useState<ConnectionStatus>({ tumblr: false, x: false, threads: false, });
    const [postText, setPostText] = useState('');
    const [selectedImages, setSelectedImages] = useState<string[]>([]);

    // useFocusEffect é executado toda vez que a tela entra em foco.
    // Isso garante que o status da conexão seja sempre atualizado.
    useFocusEffect(
        useCallback(() => {
            const fetchConnections = async () => {
                try {
                    const db = await getDBConnection();
                    const results = await db.executeSql('SELECT platform FROM auth_tokens');
                    const activeConnections: Partial<ConnectionStatus> = {};

                    results.forEach(result => {
                        for (let i = 0; i < result.rows.length; i++) {
                            const platform = result.rows.item(i).platform;
                            if (platform in connections) {
                                activeConnections[platform as keyof ConnectionStatus] = true;
                            }
                        }
                    });
                    // Atualiza o estado com as conexões ativas
                    setConnections(prev => ({ ...prev, ...activeConnections }));
                } catch (error) {
                    console.error('Erro ao buscar conexões:', error);
                }
            };

            fetchConnections();
        }, [])
    );

    const handleImagePicker = () => {
        launchImageLibrary({ mediaType: 'photo', selectionLimit: 0 }, response => {
            if (response.didCancel) {
                console.log('Usuário cancelou a seleção de imagem');
            } else if (response.errorCode) {
                Alert.alert('Erro', `Erro ao selecionar imagem: ${response.errorMessage}`);
            } else if (response.assets) {
                const uris = response.assets.map(asset => asset.uri || '').filter(uri => uri);
                setSelectedImages(prevImages => [...prevImages, ...uris]);
            }
        });
    };

    const handleCancel = () => {
        setPostText('');
        setSelectedImages([]);
        Alert.alert('Cancelado', 'O conteúdo da sua postagem foi limpo.');
    };

    const handleSaveDraft = async () => {
        if (!postText.trim() && selectedImages.length === 0) {
            Alert.alert('Rascunho Vazio', 'Escreva algo ou adicione uma imagem para salvar.');
            return;
        }

        try {
            const db = await getDBConnection();
            const imagesJson = JSON.stringify(selectedImages);

            await db.executeSql(
                'INSERT INTO posts (content, images, status) VALUES (?, ?, ?)',
                [postText, imagesJson, 'draft']
            );

            Alert.alert('Sucesso!', 'Seu rascunho foi salvo.');
            handleCancel();
        } catch (error) {
            console.error('Erro ao salvar rascunho:', error);
            Alert.alert('Erro', 'Não foi possível salvar o rascunho.');
        }
    };

    const handlePost = async () => {
        const connectedPlatforms = Object.entries(connections)
            .filter(([, isConnected]) => isConnected)
            .map(([platform]) => platform);

        if (connectedPlatforms.length === 0) {
            Alert.alert('Nenhuma Conta Conectada', 'Vá para as Configurações para conectar suas contas primeiro.');
            return;
        }

        if (!postText.trim() && selectedImages.length === 0) {
            Alert.alert('Conteúdo Vazio', 'Escreva algo ou anexe uma imagem para postar.');
            return;
        }

        try {
            // 1. Salva o post no histórico do banco de dados local
            const db = await getDBConnection();
            const imagesJson = JSON.stringify(selectedImages);
            const platformsStr = connectedPlatforms.join(', ');

            await db.executeSql(
                'INSERT INTO posts (content, images, status, platforms) VALUES (?, ?, ?, ?)',
                [postText, imagesJson, 'posted', platformsStr]
            );

            // 2. Lógica para postar nas redes sociais (simulação)
            Alert.alert(
                'Postagem Enviada!',
                `Sua postagem foi registrada no histórico e enviada para: ${platformsStr}`,
            );
            // Aqui você chamaria os serviços de API para cada plataforma

            handleCancel(); // Limpa o formulário após postar
        } catch (error) {
            console.error('Erro ao postar e salvar no histórico:', error);
            Alert.alert('Erro', 'Ocorreu um erro ao processar sua postagem.');
        }
    };


    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container}>
                <View style={styles.statusContainer}>
                    {SOCIAL_PLATFORMS.map(platform => (
                        <View key={platform.name} style={styles.statusIconWrapper}>
                            <Icon
                                name={platform.icon}
                                size={30}
                                color={connections[platform.name] ? '#28a745' : '#dc3545'} // Verde se conectado, vermelho se não
                            />
                            <Text style={styles.statusText}>{platform.name}</Text>
                        </View>
                    ))}
                </View>

                <TextInput
                    style={styles.textArea}
                    placeholder="O que você está pensando?"
                    multiline
                    value={postText}
                    onChangeText={setPostText}
                />

                <TouchableOpacity style={styles.attachButton} onPress={handleImagePicker}>
                    <Text style={styles.attachButtonText}>Anexar Imagens</Text>
                </TouchableOpacity>

                {selectedImages.length > 0 && (
                    <View style={styles.carouselContainer}>
                        <FlatList
                            data={selectedImages}
                            renderItem={({ item }) => <Image source={{ uri: item }} style={styles.imageItem} />}
                            keyExtractor={(item, index) => `${item}-${index}`}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                        />
                    </View>
                )}

                <View style={styles.actionsContainer}>
                    <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={handleCancel}>
                        <Text style={[styles.actionButtonText, styles.cancelButtonText]}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.draftButton]} onPress={handleSaveDraft}>
                        <Text style={[styles.actionButtonText, styles.draftButtonText]}>Rascunho</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.postButton]} onPress={handlePost}>
                        <Text style={[styles.actionButtonText, styles.postButtonText]}>Postar</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default HomeScreen;