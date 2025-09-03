import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, Alert, FlatList, Image, ScrollView, Keyboard, } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import ImagePicker from 'react-native-image-crop-picker';

import { getStyles } from './styles';
import { useTheme } from '../../theme/ThemeProvider';
import Button from '../../components/Button';

import PostDao from '../../dao/PostDao';
import { ApiServiceFactory } from '../../services/api';
import ImageProcessingService from '../../services/ImageService';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootTabParamList } from '../../navigation/types';
import { BLUESKY, PlatformType, SOCIAL_PLATFORMS, THREADS, TUMBLR, UNKNOW, X } from '../../constants/platforms';
import AuthTokenDao from '../../dao/AuthTokenDao';
import { PostData } from 'src/services/api/IApiService';
import { requestGalleryPermission } from 'src/utils/permissions';
import Logger from 'src/services/LoggerService';

type Connections = {
    platform: PlatformType;
    active: boolean;
    error: boolean;
};

type HomeScreenProps = BottomTabScreenProps<RootTabParamList, 'Home'>;

const DEFAULT = {
    platform: UNKNOW,
    active: false,
    error: false
}

const HomeScreen = ({ route, navigation }: HomeScreenProps) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const [connections, setConnections] = useState<Connections[]>([{ ...DEFAULT, platform: TUMBLR }, { ...DEFAULT, platform: X }, { ...DEFAULT, platform: THREADS },]);
    const [activePlatforms, setActivePlatforms] = useState<PlatformType[]>([]);
    const [postText, setPostText] = useState('');
    const [tagsText, setTagsText] = useState('');

    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [isAdjustingImages, setIsAdjustingImages] = useState(false);
    const [progress, setProgress] = useState(0);

    const [editingPostId, setEditingPostId] = useState<number | null>(null);
    const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
    const [isPosting, setIsPosting] = useState(false);
    const [successfulPlatforms, setSuccessfulPlatforms] = useState<PlatformType[]>([]);

    const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (route.params?.postToEdit) {
            const { id, content, tags, images } = route.params.postToEdit;

            setEditingPostId(id);
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
                    const newConnectionStatus = connections.map(cnn => ({ ...cnn, active: cnn.platform in activePlatforms, error: false }))
                    setConnections(newConnectionStatus);
                    setActivePlatforms(activePlatforms);
                } catch (e: Error | any) {
                    Logger.error(e, { message: 'Erro ao buscar conexões:' });
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
        } catch (e: Error | any) {
            Logger.error(e, { message: 'Falha ao buscar sugestões de tags na tela.' });
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

    const handleImagePicker = async () => {
        const hasPermission = await requestGalleryPermission();
        if (!hasPermission) {
            Alert.alert("Permissão Negada", "Você precisa conceder permissão para acessar a galeria de imagens.");
            return;
        }

        const images = await ImagePicker.openPicker({
            multiple: true,
            mediaType: 'photo',
        });
        const imagePaths = images.map(img => img.path);
        setSelectedImages(prev => [...prev, ...imagePaths]);
    };

    const handleAdjustSingleImage = async (index: number) => {
        if (isAdjustingImages)
            return;

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
                        try {
                            setProgress(0);
                            const newImageUris = await ImageProcessingService.processImageList(selectedImages, (p) => setProgress(p));
                            setSelectedImages(newImageUris);
                        } catch (e: Error | any) {
                            Alert.alert("Erro", "Ocorreu uma falha durante o processamento das imagens.");
                        } finally {
                            setIsAdjustingImages(false);
                        }
                    },
                },
            ]
        );
    };

    const handleImageClick = async (uri: string) => {
        if (!uri)
            return;

        try {
            const croppedImage = await ImagePicker.openCropper({
                path: uri,
                mediaType: 'photo',
                cropping: true,
                compressImageMaxWidth: 1000,
                compressImageMaxHeight: 1000,
                compressImageQuality: 0.8,
                forceJpg: true,
            });

            setSelectedImages(prevImages => prevImages.map(img => (img === uri ? croppedImage.path : img)));
        } catch (e: Error | any) {
            Logger.error(e, { message: 'Erro ao recortar imagem existente:' });
        }
    };

    const handleRemoveImage = (index: number) => {
        if (isAdjustingImages)
            return;

        const originalUri = selectedImages[index];
        if (!originalUri || isAdjustingImages)
            return;

        setSelectedImages(prev => prev.filter(uri => uri !== originalUri));
    };

    const handleCancel = () => {
        setEditingPostId(null);
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
            const draftData = {
                content: postText,
                images: selectedImages,
                status: 'draft' as const,
                tags: tagsText,
            };

            if (editingPostId) {
                await PostDao.update(editingPostId, draftData);
                Alert.alert('Sucesso!', 'Seu rascunho foi atualizado.');
            } else {
                await PostDao.create(draftData);
                Alert.alert('Sucesso!', 'Seu rascunho foi salvo.');
            }
            handleCancel();
        } catch (e: Error | any) {
            Logger.error(e, { message: 'Não foi possível salvar o rascunho.' });
            Alert.alert('Erro', 'Não foi possível salvar o rascunho.');
        }
    };

    const handlePost = async () => {
        const connectedPlatforms = connections
            .filter(conn => conn.active)
            .map(conn => conn.platform);

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
            const platformsToTry = activePlatforms.filter(p => !connectedPlatforms.includes(p as PlatformType));

            let idPost = editingPostId;
            const postData = {
                content: postText,
                images: selectedImages,
                status: 'posted' as const,
                platformsSend: platformsToTry.join(', '),
                platformsSuccess: "",
                tags: tagsText,
            };

            if (editingPostId)
                await PostDao.update(editingPostId, postData);
            else
                idPost = await PostDao.create(postData);

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
                Logger.info('[Post Flow] Iniciando postagem no Tumblr para obter URLs...');
                try {
                    const tumblrService = ApiServiceFactory(TUMBLR);
                    const resultPost = await tumblrService.post(originalPostData);
                    if (resultPost.imagesUrl && resultPost.imagesUrl.length > 0)
                        originalPostData.imagesUrl = resultPost.imagesUrl;

                    successfulPlatforms.push(TUMBLR);
                } catch (e: Error | any) {
                    Logger.error(e, { message: 'Erro ao postar:' });
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
                    Logger.warn(`Falha ao postar em ${platform}:`, result.status === 'rejected' ? result.reason : 'retornou false');
                }
            });

            const allSuccessful = [...successfulPlatforms, ...newlySuccessful];
            setSuccessfulPlatforms(allSuccessful);

            if (failedPlatforms.length === 0) {
                postData.platformsSuccess = successfulPlatforms.join(', '),
                    await PostDao.update(idPost!, postData);
                Alert.alert('Sucesso!', `Postagem enviada para: ${allSuccessful.join(', ')}`);
                handleCancel();
            } else
                Alert.alert(
                    'Postagem Parcial',
                    `Sucesso em: ${newlySuccessful.join(', ') || 'Nenhuma'}\n\nFalha em: ${failedPlatforms.join(', ')}\n\nClique em "Postar" novamente para tentar enviar para as plataformas restantes.`
                );

        } catch (e: Error | any) {
            Logger.error(e, { message: 'Erro ao postar:' });
            Alert.alert('Erro', 'Ocorreu um erro ao processar sua postagem.');
        } finally {
            setIsPosting(false);
        }
    };

    const renderImageItem = ({ item, index }: { item: string; index: number }) => (
        <TouchableOpacity onPress={() => handleImageClick(item)} style={styles.imageItemContainer}>
            <Image source={{ uri: item }} style={styles.imageItem} />
            <TouchableOpacity
                style={styles.editIconOverlay}
                onPress={() => handleAdjustSingleImage(index)}
                disabled={isAdjustingImages}
            >
                <Icon name="crop-outline" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.removeIconOverlay}
                onPress={() => handleRemoveImage(index)}
                disabled={isAdjustingImages}
            >
                <Icon name="close-circle" size={24} color="red" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const getIconColor = (platform: PlatformType): string => {
        const connection = connections.find(c => c.platform === platform);
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
                    {activePlatforms.map(platform => {
                        const platformInfo = SOCIAL_PLATFORMS.find(p => p.name === platform);
                        if (!platformInfo)
                            return null;

                        return (
                            <View key={platformInfo.name} style={styles.statusIconWrapper}>
                                <Icon
                                    name={platformInfo.icon}
                                    size={30}
                                    color={getIconColor(platformInfo.name)}
                                />
                                <Text style={styles.statusText}>{platformInfo.name}</Text>
                            </View>
                        );
                    })}
                </View>

                <TextInput
                    style={styles.textArea}
                    placeholder="O que você deseja postar?"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    value={postText}
                    onChangeText={handleTextChange}
                />

                <View style={styles.countersContainer}>
                    {activePlatforms.map(platform => {
                        const platformInfo = SOCIAL_PLATFORMS.find(p => p.name === platform);
                        if (!platformInfo)
                            return null;

                        const limit = platformInfo.limits || 0;
                        const remaining = limit - postText.length;

                        return (
                            <View
                                key={platform}
                                style={[
                                    styles.counterCard,
                                    remaining < 0 && styles.counterCardError
                                ]}
                            >
                                <Icon name={platformInfo.icon} size={16} style={styles.counterIcon} />
                                <Text
                                    style={styles.counterText}
                                >
                                    {remaining}
                                </Text>
                            </View>
                        );
                    })}
                </View>

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
                    textStyle={styles.attachButtonText}
                    icon={'image-outline'}
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

                        {isAdjustingImages && (
                            <View style={styles.progressContainer}>
                                <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
                            </View>
                        )}
                        <Button
                            title={'Corrigir Bordas de Todas Imagens'}
                            onPress={handleAdjustAllImages}
                            style={styles.adjustButton}
                            textStyle={styles.adjustButtonText}
                            disabled={isAdjustingImages}
                            icon='crop-outline'
                        />
                    </>
                )}

                <View style={styles.actionsContainer}>
                    <Button
                        title={'Cancelar'}
                        onPress={handleCancel}
                        style={[styles.actionButton, styles.cancelButton]}
                        textStyle={styles.cancelButtonText}
                    />

                    <Button
                        title={'Rascunho'}
                        onPress={handleSaveDraft}
                        style={[styles.actionButton, styles.draftButton]}
                        textStyle={styles.draftButtonText}
                    />

                    <Button
                        title={'Postar'}
                        onPress={handlePost}
                        style={[styles.actionButton, styles.postButton]}
                        textStyle={styles.postButtonText}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default HomeScreen;