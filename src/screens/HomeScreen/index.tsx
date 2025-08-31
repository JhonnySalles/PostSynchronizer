import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, Alert, FlatList, Image, ScrollView, Keyboard, } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';

import { getStyles } from './styles';
import { useTheme } from '../../theme/ThemeProvider';
import Button from '../../components/Button';

import PostDao from '../../dao/PostDao';
import { ApiServiceFactory } from '../../services/api';
import ImageProcessingService from '../../services/ImageService';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootTabParamList } from '../../navigation/types';
import { PlatformType, THREADS, TUMBLR, UNKNOW, X } from '../../constants/platforms';
import AuthTokenDao from '../../dao/AuthTokenDao';
import { PostData } from 'src/services/api/IApiService';

type Connections = {
    platfom: PlatformType;
    active: boolean;
    error: boolean;
};

const SOCIAL_PLATFORMS = [
    { name: TUMBLR, icon: 'logo-tumblr' },
    { name: X, icon: 'logo-twitter' },
    { name: THREADS, icon: 'at-sharp' },
] as const;

type HomeScreenProps = BottomTabScreenProps<RootTabParamList, 'Home'>;


const DEFAULT = {
    platfom: UNKNOW,
    active: false,
    error: false
}

const HomeScreen = ({ route, navigation }: HomeScreenProps) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const [connections, setConnections] = useState<Connections[]>([{ ...DEFAULT, platfom: TUMBLR }, { ...DEFAULT, platfom: X }, { ...DEFAULT, platfom: THREADS },]);
    const [postText, setPostText] = useState('');
    const [tagsText, setTagsText] = useState('');
    const [selectedImages, setSelectedImages] = useState<string[]>([]);

    const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
    const [isPosting, setIsPosting] = useState(false);
    const [isAdjustingImages, setIsAdjustingImages] = useState(false);
    const [successfulPlatforms, setSuccessfulPlatforms] = useState<PlatformType[]>([]);

    const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (route.params?.postToEdit) {
            const { content, tags, images } = route.params.postToEdit;

            setPostText(content);
            setTagsText(tags);
            setSelectedImages(images);

            navigation.setParams({ postToEdit: undefined });
        }
    }, [route.params, navigation]);

    useFocusEffect(
        useCallback(() => {
            const fetchConnections = async () => {
                try {
                    const activePlatforms = await AuthTokenDao.getActivePlatforms();
                    const newConnectionStatus = connections.map(cnn => ({ ...cnn, active: cnn.platfom in activePlatforms, error: false }))
                    setConnections(newConnectionStatus);
                } catch (error) {
                    console.error('Erro ao buscar conexões:', error);
                }
            };

            fetchConnections();
        }, [])
    );

    const handleTextChange = (text: string) => {
        setPostText(text);
        if (successfulPlatforms.length > 0)
            setSuccessfulPlatforms([]);
    };

    const fetchTagSuggestions = async (query: string) => {
        try {
            const suggestions = await PostDao.getTagSuggestions(query);
            setTagSuggestions(suggestions);
        } catch (error) {
            console.error("Falha ao buscar sugestões de tags na tela.");
        }
    };

    const handleTagsChange = (text: string) => {
        setTagsText(text);
        if (successfulPlatforms.length > 0)
            setSuccessfulPlatforms([]);

        if (debounceTimeout.current)
            clearTimeout(debounceTimeout.current);

        debounceTimeout.current = setTimeout(() => {
            fetchTagSuggestions(text);
        }, 500);
    };

    const handleSelectSuggestion = (tag: string) => {
        setTagsText(tag + ', ');
        setTagSuggestions([]);
        Keyboard.dismiss();
    };

    const handleImagePicker = () => {
        launchImageLibrary({ mediaType: 'photo', selectionLimit: 0 }, response => {
            if (response.didCancel)
                console.log('Usuário cancelou a seleção de imagem');
            else if (response.errorCode)
                Alert.alert('Erro', `Erro ao selecionar imagem: ${response.errorMessage}`);
            else if (response.assets) {
                const uris = response.assets.map(asset => asset.uri || '').filter(uri => uri);
                setSelectedImages(prevImages => [...prevImages, ...uris]);
            }
        });
    };

    const handleAdjustSingleImage = async (index: number) => {
        const originalUri = selectedImages[index];
        if (!originalUri || isAdjustingImages)
            return;

        setIsAdjustingImages(true);
        const newUri = await ImageProcessingService.processImage(originalUri);

        if (newUri !== originalUri) {
            const newImages = [...selectedImages];
            newImages[index] = newUri;
            setSelectedImages(newImages);
        }
        setIsAdjustingImages(false);
    };


    const handleAdjustAllImages = async () => {
        if (isAdjustingImages)
            return;

        Alert.alert(
            "Ajustar Todas as Imagens",
            "O processamento automático será aplicado em cada imagem, uma por uma. Isso pode levar um momento.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Continuar",
                    onPress: async () => {
                        setIsAdjustingImages(true);
                        const newImageUris = await ImageProcessingService.processImageList(selectedImages);
                        setSelectedImages(newImageUris);
                        setIsAdjustingImages(false);
                    },
                },
            ]
        );
    };

    const handleCancel = () => {
        setPostText('');
        setSelectedImages([]);
        setSuccessfulPlatforms([]);
    };

    const handleSaveDraft = async () => {
        if (!postText.trim() && selectedImages.length === 0) {
            Alert.alert('Rascunho Vazio', 'Escreva algo ou adicione uma imagem para salvar.');
            return;
        }

        try {
            await PostDao.create({
                content: postText,
                images: selectedImages,
                status: 'draft',
                tags: tagsText,
            });

            Alert.alert('Sucesso!', 'Seu rascunho foi salvo.');
            handleCancel();
        } catch (error) {
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
            setIsPosting(true);
            const platformsToTry = connectedPlatforms.filter(p => !successfulPlatforms.includes(p as PlatformType));

            if (platformsToTry.length === 0) {
                Alert.alert("Tudo Certo!", "Esta postagem já foi enviada para todas as suas contas conectadas.");
                setIsPosting(false);
                return;
            }

            const originalPostData: PostData = {
                text: postText,
                images: selectedImages,
                tags: tagsText.split(',').map(t => t.trim()).filter(t => t),
            };

            const needsTumblrFirst = connectedPlatforms.includes(TUMBLR) && connectedPlatforms.includes(THREADS);
            const successfulPlatforms: PlatformType[] = [];

            if (needsTumblrFirst) {
                console.info('[Post Flow] Iniciando postagem no Tumblr para obter URLs...');
                try {
                    const tumblrService = ApiServiceFactory(TUMBLR);
                    const resultPost = await tumblrService.post(originalPostData);
                    if (resultPost.imagesUrl && resultPost.imagesUrl.length > 0)
                        originalPostData.imagesUrl = resultPost.imagesUrl;

                    successfulPlatforms.push(TUMBLR);
                } catch (error) {
                }
            }

            const postPromises = platformsToTry.filter(p => !successfulPlatforms.includes(p as PlatformType)).map(platform => {
                const service = ApiServiceFactory(platform as PlatformType);
                return service.post({
                    text: postText,
                    images: selectedImages,
                    tags: tagsText.split(',').map(t => t.trim()).filter(t => t),
                });
            });

            const results = await Promise.allSettled(postPromises);

            const newlySuccessful: PlatformType[] = [];
            const failedPlatforms: PlatformType[] = [];

            results.forEach((result, index) => {
                const platform = platformsToTry[index];
                if (result.status === 'fulfilled' && result.value.sucess === true)
                    newlySuccessful.push(platform as PlatformType);
                else {
                    failedPlatforms.push(platform as PlatformType);
                    console.error(`Falha ao postar em ${platform}:`, result.status === 'rejected' ? result.reason : 'retornou false');
                }
            });

            const allSuccessful = [...successfulPlatforms, ...newlySuccessful];
            setSuccessfulPlatforms(allSuccessful);

            if (failedPlatforms.length === 0) {
                Alert.alert('Sucesso!', `Postagem enviada para: ${allSuccessful.join(', ')}`);
                await PostDao.create({ content: postText, images: selectedImages, status: 'posted', platforms: allSuccessful.join(', '), tags: tagsText, });
                handleCancel();
            } else
                Alert.alert(
                    'Postagem Parcial',
                    `Sucesso em: ${newlySuccessful.join(', ') || 'Nenhuma'}\n\nFalha em: ${failedPlatforms.join(', ')}\n\nClique em "Postar" novamente para tentar enviar para as plataformas restantes.`
                );

        } catch (error) {
            console.error('Erro ao postar:', error);
            Alert.alert('Erro', 'Ocorreu um erro ao processar sua postagem.');
        } finally {
            setIsPosting(false);
        }
    };

    const renderImageItem = ({ item, index }: { item: string; index: number }) => (
        <View style={styles.imageItemContainer}>
            <Image source={{ uri: item }} style={styles.imageItem} />
            <TouchableOpacity
                style={styles.editIconOverlay}
                onPress={() => handleAdjustSingleImage(index)}
                disabled={isAdjustingImages}
            >
                <Icon name="crop-outline" size={18} color="#fff" />
            </TouchableOpacity>
        </View>
    );

    const getIconColor = (platform: PlatformType): string => {
        const connection = connections.find(c => c.platfom === platform);
        if (!connection)
            return colors.inactive;

        if (connection.error)
            return colors.error;
        else if (connection.active)
            return colors.success;
        else
            return colors.inactive;
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
                                color={getIconColor(platform.name)}
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
                    onChangeText={handleTextChange}
                />

                <TextInput
                    style={styles.tagsInput}
                    placeholder="Adicione tags separadas por vírgula"
                    placeholderTextColor={colors.textSecondary}
                    value={tagsText}
                    onChangeText={handleTagsChange}
                />

                {tagSuggestions.length > 0 && (

                    <View style={styles.suggestionsContainer}>
                        <FlatList
                            data={tagSuggestions}
                            keyExtractor={(item, index) => item + index}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.suggestionItem}
                                    onPress={() => handleSelectSuggestion(item)}
                                >
                                    <Text style={styles.suggestionText}>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                )}


                <Button
                    title={'Anexar Imagens'}
                    onPress={handleImagePicker}
                    style={styles.attachButton}
                />

                {selectedImages.length > 0 && (
                    <>
                        <View style={styles.carouselContainer}>
                            <FlatList
                                data={selectedImages}
                                renderItem={renderImageItem}
                                keyExtractor={(item, index) => `${item}-${index}`}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                            />
                        </View>

                        <Button
                            title={'Corrigir Bordas de Todas Imagens'}
                            onPress={handleAdjustAllImages}
                            style={styles.adjustAllButtonText}
                            icon='scan-outline'
                        />
                    </>
                )}

                <View style={styles.actionsContainer}>
                    <Button
                        title={'Cancelar'}
                        onPress={handleCancel}
                        style={[styles.actionButton, styles.cancelButton]}
                    />

                    <Button
                        title={'Rascunho'}
                        onPress={handleSaveDraft}
                        style={[styles.actionButton, styles.draftButton]}
                    />

                    <Button
                        title={'Postar'}
                        onPress={handlePost}
                        style={[styles.actionButton, styles.postButton]}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default HomeScreen;