import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  FlatList,
  Image,
  Keyboard,
  AppState,
  AppStateStatus,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { pickerService } from '../../services/PickerService.windows';

import { usePostStore } from '../../store/usePostStore';

import { getStyles } from './styles';
import { useTheme } from '../../theme/ThemeProvider';
import Button from '../../components/Button';

import PostDao from '../../dao/PostDao';
import { apiService, PostPayload, ProgressUpdate, SinglePostPayload } from '../../services/ApiService';
import ImageProcessingService from '../../services/ImageService.windows';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootTabParamList } from '../../navigation/types';
import { PlatformType, SOCIAL_PLATFORMS, UNKNOW, THREADS, TUMBLR, X, BLUESKY } from '../../constants/platforms';
import AuthTokenDao, { TumblrCredentials } from '../../dao/AuthTokenDao';
import { requestGalleryPermission } from 'src/utils/permissions';
import Logger from 'src/services/LoggerService';
import { Toast } from 'react-native-toast-message/lib/src/Toast';
import { DRAFT, ERROR, IDLE, PENDING, POSTED, PostType, SUCCESS } from 'src/constants/app';
import { formatarData } from 'src/utils/util';

type SelectedImage = {
  path: string;
  platforms: PlatformType[];
};

type HomeScreenProps = BottomTabScreenProps<RootTabParamList, 'Home'>;

const TAG_SEPARADOR = ';';
const TAG_REMOVE_LAST_SEPARATOR_REGEX = /;$/;
const TAG_REMOVE_SPACE_REGEX = /^;\s*/;
const TWITTER_DAILY_POST_LIMIT = 15;

const HomeScreen = ({ route, navigation }: HomeScreenProps) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const appState = useRef(AppState.currentState);

  const {
    postText,
    tagsText,
    selectedImages,
    editingPostId,
    connections,
    isPosting,
    postProgress,

    // Ações
    setPostText,
    setTagsText,
    addImages,
    toggleImagePlatform,
    removeImage,
    clearForm,
    startPosting,
    updatePostProgress,
    finishPosting,
    mergeConnections,
    resetPostStatus,
    setSelectedImages,
  } = usePostStore();

  const [awaitPosting, setAwaitPosting] = useState(false);
  const [disabledPlatforms, setDisabledPlatforms] = useState<PlatformType[]>([]);
  const [isAdjustingImages, setIsAdjustingImages] = useState(false);
  const [imagesProgress, setImagesProgress] = useState(0);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [tagCursor, setTagCursor] = useState({ start: 0, end: 0 });
  const [tagInputLayout, setTagInputLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(
    null,
  );

  const tagSuggestionTimeout = useRef<NodeJS.Timeout | null>(null);
  const tagCloseTimeout = useRef<NodeJS.Timeout | null>(null);
  const tagCleanupTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        apiService.startHealthCheckLoop();
      } else if (nextAppState.match(/inactive|background/)) {
        apiService.stopHealthCheckLoop();
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    apiService.startHealthCheckLoop();
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (route.params?.postToEdit) {
      const { id, content, tags, images } = route.params.postToEdit;

      usePostStore.setState({
        editingPostId: id,
        postText: content,
        tagsText: tags,
        selectedImages: images as SelectedImage[],
      });

      navigation.setParams({ postToEdit: undefined });
    }
  }, [route.params, navigation]);

  useFocusEffect(
    useCallback(() => {
      const fetchConnections = async () => {
        try {
          const activePlatforms = await AuthTokenDao.getActivePlatforms();
          const allPlatforms = SOCIAL_PLATFORMS.map(p => p.name);
          mergeConnections(allPlatforms, activePlatforms);
        } catch (error: Error | any) {
          Logger.error(error, {
            message: '[Home Screen] Erro ao buscar conexões:',
          });
        }
      };

      fetchConnections();
      setAwaitPosting(false);
    }, []),
  );

  useEffect(() => {
    return () => {
      // prettier-ignore
      if (tagSuggestionTimeout.current)
        clearTimeout(tagSuggestionTimeout.current);

      // prettier-ignore
      if (tagCleanupTimeout.current)
        clearTimeout(tagCleanupTimeout.current);

      // prettier-ignore
      if (tagCloseTimeout.current)
        clearTimeout(tagCloseTimeout.current);
    };
  }, []);

  const handleToggleDisable = (platform: PlatformType) => {
    const connection = connections.find(c => c.platform === platform);

    // prettier-ignore
    if (!connection || !connection.active) 
        return;

    setDisabledPlatforms(prev => {
      // prettier-ignore
      if (prev.includes(platform))
        return prev.filter(p => p !== platform);
      else
        return [...prev, platform];
    });
  };

  const handleTextChange = (text: string) => {
    setPostText(text);
  };

  const fetchTagSuggestions = async (query: string) => {
    try {
      const suggestions = await PostDao.getTagSuggestions(query);
      setTagSuggestions(suggestions);
    } catch (error: Error | any) {
      Logger.error(error, {
        message: '[Home Screen] Falha ao buscar sugestões de tags na tela.',
      });
    }
  };

  const handleTagsFocus = () => {
    // prettier-ignore
    if (tagCleanupTimeout.current)
      clearTimeout(tagCleanupTimeout.current);

    // prettier-ignore
    if (tagCloseTimeout.current)
      clearTimeout(tagCloseTimeout.current);
  };

  const handleTagsChange = (text: string) => {
    setTagsText(text);

    // prettier-ignore
    if (tagSuggestionTimeout.current) 
        clearTimeout(tagSuggestionTimeout.current);

    tagSuggestionTimeout.current = setTimeout(() => {
      const cursorPosition = tagCursor.start;
      const lastCommaIndex = text.lastIndexOf(TAG_SEPARADOR, cursorPosition - 1);
      const startIndex = lastCommaIndex === -1 ? 0 : lastCommaIndex + 1;
      let nextCommaIndex = text.indexOf(TAG_SEPARADOR, cursorPosition);
      // prettier-ignore
      if (nextCommaIndex === -1) 
        nextCommaIndex = text.length;

      const currentTag = text.substring(startIndex, nextCommaIndex).trim();

      // prettier-ignore
      if (currentTag) 
        fetchTagSuggestions(currentTag);
      else 
        setTagSuggestions([]);
    }, 500);
  };

  const handleTagsBlur = () => {
    // prettier-ignore
    if (tagCleanupTimeout.current)
      clearTimeout(tagCleanupTimeout.current);

    // prettier-ignore
    if (tagCloseTimeout.current)
      clearTimeout(tagCloseTimeout.current);

    tagCleanupTimeout.current = setTimeout(() => {
      const currentTags = usePostStore.getState().tagsText;
      const cleanedTags = currentTags.trim().replace(TAG_REMOVE_LAST_SEPARATOR_REGEX, '').trim();
      // prettier-ignore
      if (cleanedTags !== currentTags)
        setTagsText(cleanedTags);
    }, 3000);

    tagCloseTimeout.current = setTimeout(() => {
      setTagSuggestions([]);
    }, 1000);
  };

  const handleSelectSuggestion = (tag: string) => {
    const currentTags = tagsText;
    const cursorPosition = tagCursor.start;

    const lastCommaIndex = currentTags.lastIndexOf(TAG_SEPARADOR, cursorPosition - 1);
    const startIndex = lastCommaIndex === -1 ? 0 : lastCommaIndex + 1;

    let nextCommaIndex = currentTags.indexOf(TAG_SEPARADOR, cursorPosition);
    // prettier-ignore
    if (nextCommaIndex === -1)
      nextCommaIndex = currentTags.length;

    const textBefore = currentTags.substring(0, startIndex);
    const textAfter = currentTags.substring(nextCommaIndex);

    const trailingSpace = textAfter.length > 0 ? '' : TAG_SEPARADOR + ' ';
    const newTagsText = `${textBefore.trim()} ${tag}${trailingSpace}${textAfter.trim()}`
      .trim()
      .replace(TAG_REMOVE_SPACE_REGEX, '');

    setTagsText(newTagsText);
    setTagSuggestions([]);
    Keyboard.dismiss();
  };

  const handleImagePicker = async () => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) {
      Alert.alert('Permissão Negada', 'Você precisa conceder permissão para acessar a galeria de imagens.');
      return;
    }

    try {
      const images = await pickerService.openPicker({
        multiple: true,
        mediaType: 'photo',
        maxFiles: 50,
      });

      const activePlatforms = connections.filter(c => c.active).map(c => c.platform);
      const newImages: SelectedImage[] = images.map(img => ({
        path: img.path,
        platforms: activePlatforms,
      }));

      addImages(newImages, activePlatforms);
    } catch (error: Error | any) {
      // prettier-ignore
      if (error.message === 'User cancelled image selection')
        Logger.info('[Home Screen] Usuário cancelou a seleção de imagem.');
      else
        Logger.error(error, { message: '[Home Screen] Erro ao selecionar imagem existente:' });
    }
  };

  const handleAdjustSingleImage = async (index: number) => {
    // prettier-ignore
    if (isAdjustingImages) 
        return;

    const originalPath = selectedImages[index]?.path;
    // prettier-ignore
    if (!originalPath || isAdjustingImages) 
        return;

    setIsAdjustingImages(true);
    const newPath = await ImageProcessingService.processImage(originalPath);

    if (newPath !== originalPath) {
      const currentImages = usePostStore.getState().selectedImages;
      const updatedImages = currentImages.map((img, i) => (i === index ? { ...img, path: newPath } : img));
      usePostStore.setState({ selectedImages: updatedImages });
    }

    setIsAdjustingImages(false);
  };

  const handleAdjustAllImages = async () => {
    // prettier-ignore
    if (isAdjustingImages) 
        return;

    setIsAdjustingImages(true);
    try {
      setImagesProgress(0);
      const imagePaths = selectedImages.map(img => img.path);
      const newImagePaths = await ImageProcessingService.processImageList(imagePaths, p => setImagesProgress(p));
      const currentImages = usePostStore.getState().selectedImages;
      const updatedImages = currentImages.map((img, i) => ({ ...img, path: newImagePaths[i] }));
      usePostStore.setState({ selectedImages: updatedImages });
    } catch (error: Error | any) {
      Logger.error(error, {
        message: '[Home Screen] Ocorreu uma falha durante o processamento das imagens.',
      });
      Alert.alert('Erro', 'Ocorreu uma falha durante o processamento das imagens.');
    } finally {
      setIsAdjustingImages(false);
    }
  };

  const handleImageClick = async (image: SelectedImage) => {
    // prettier-ignore
    if (!image.path) 
        return;

    try {
      const croppedImage = await pickerService.openCropper({
        path: image.path,
        cropping: true,
        compressImageMaxWidth: 1000,
        compressImageMaxHeight: 1000,
        compressImageQuality: 0.8,
        forceJpg: true,
      });

      const currentImages = usePostStore.getState().selectedImages;
      const updatedImages = currentImages.map(img =>
        img.path === image.path ? { ...img, path: croppedImage.path } : img,
      );
      usePostStore.setState({ selectedImages: updatedImages });
    } catch (error: Error | any) {
      // prettier-ignore
      if (error.message === 'User cancelled image selection')
        Logger.info('[Home Screen] Usuário cancelou a recorte de imagem.');
      else
        Logger.error(error, { message: '[Home Screen] Erro ao recortar imagem existente:' });
    }
  };

  const handleRemoveImage = (index: number) => {
    // prettier-ignore
    if (isAdjustingImages) 
        return;
    removeImage(index);
  };

  const handleCancel = () => {
    clearForm();
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
        status: DRAFT as PostType,
        tags: tagsText,
      };

      let message = '';
      if (editingPostId) {
        await PostDao.update(editingPostId, draftData);
        message = 'Seu rascunho foi atualizado.';
      } else {
        await PostDao.create(draftData);
        message = 'Seu rascunho foi salvo.';
      }

      Toast.show({
        type: 'success',
        text1: 'Sucesso!',
        text2: message,
        position: 'top',
        visibilityTime: 4000,
      });
      handleCancel();
    } catch (error: Error | any) {
      Logger.error(error, {
        message: '[Home Screen] Não foi possível salvar o rascunho.',
      });
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Não foi possível salvar o rascunho.',
        position: 'top',
        visibilityTime: 4000,
      });
    }
  };

  const handlePost = async () => {
    const platformsToPost = connections
      .filter(conn => conn.active && !disabledPlatforms.includes(conn.platform))
      .map(conn => conn.platform);

    if (platformsToPost.length === 0) {
      // prettier-ignore
      if (!connections.find(c => c.active))
        Alert.alert('Nenhuma Conta Conectada', 'Vá para as Configurações para conectar suas contas primeiro.');
      else
        Alert.alert('Nenhuma Conta Conectada', 'É necessário selecionar pelo menos uma conta para postar.');
      return;
    }

    if (!postText.trim() && selectedImages.length === 0) {
      Alert.alert('Conteúdo Vazio', 'Escreva algo ou anexe uma imagem para postar.');
      return;
    }

    const twitterImageCount = selectedImages.filter(img => img.platforms.includes(X)).length;
    const blueskyImageCount = selectedImages.filter(img => img.platforms.includes(BLUESKY)).length;

    if (twitterImageCount > 4 || blueskyImageCount > 4) {
      let errorMsg = '';

      // prettier-ignore
      if (twitterImageCount > 4) 
        errorMsg += 'O X (Twitter) aceita no máximo 4 imagens.\n';

      // prettier-ignore
      if (blueskyImageCount > 4) 
        errorMsg += 'O Bluesky aceita no máximo 4 imagens.';

      Alert.alert('Limite de Imagens Excedido', errorMsg);
      return;
    }

    try {
      const currentPostText = postText;
      const currentTagsText = tagsText;
      const currentSelectedImages = [...selectedImages];

      let platformsSend: PlatformType[] = [...platformsToPost];
      let twitterRateLimited = false;

      if (platformsSend.includes(X)) {
        try {
          const now = new Date();
          const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          if ((await PostDao.platformSuccessCount(X, startDate)) >= TWITTER_DAILY_POST_LIMIT) {
            platformsSend = platformsToPost.filter(p => p !== X);
            twitterRateLimited = true;

            if (platformsSend.length === 0) {
              Alert.alert(
                'Postagem Cancelada',
                'A única plataforma selecionada (Twitter) está com o limite de postagens atingido. Tente novamente mais tarde.',
              );
              return;
            }
          }
        } catch (error: Error | any) {
          Logger.error(error, { message: '[Home Screen] Erro ao verificar o limite de postagens do Twitter.' });
        }
      }

      setAwaitPosting(true);

      const draftData = {
        content: currentPostText,
        images: currentSelectedImages,
        status: DRAFT as PostType,
        tags: currentTagsText,
        platformsSend: platformsToPost.join(', '),
        pending: true,
      };

      let postId = editingPostId;
      // prettier-ignore
      if (postId)
        await PostDao.update(postId, draftData);
      else
        postId = await PostDao.create(draftData);
      startPosting(postId, platformsToPost);

      clearForm();

      if (twitterRateLimited) {
        updatePostProgress(postId, { platform: X, status: ERROR });
        Toast.show({
          type: 'error',
          text1: 'Falha no Twitter',
          text2: 'Limite de postagens do Twitter atingido (15 posts por 24h).',
          position: 'top',
          visibilityTime: 4000,
        });
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      const tumblrCreds = await AuthTokenDao.getCredentialsForPlatform<TumblrCredentials>(TUMBLR);
      const payload: PostPayload = {
        postId,
        platforms: platformsSend,
        text: currentPostText,
        images: currentSelectedImages,
        tags: currentTagsText
          .split(TAG_SEPARADOR)
          .map(t => t.trim())
          .filter(t => t)
          .filter(Boolean),
        platformOptions: {
          tumblr: {
            blogName: tumblrCreds?.blogName || '',
          },
        },
      };

      const postWithoutFeedback = async () => {
        setAwaitPosting(false);
        startPosting(postId, platformsToPost);
        const result = await apiService.postAll(payload, () => {}, { forceNoWebSocket: true });
        // prettier-ignore
        if (result.success) {
          Toast.show({
            type: 'success',
            text1: 'Processo Finalizado',
            text2: 'Postagem enviada para o servidor. Verifique o resultado nas redes sociais.',
            position: 'top',
            visibilityTime: 4000,
          });

          PostDao.update(postId!, { platformsSuccess: UNKNOW, status: POSTED as PostType });
        } else 
          Toast.show({
            type: 'error',
            text1: 'Falha ao enviar postagem',
            text2: result.message,
            position: 'top',
            visibilityTime: 4000,
          });
        resetPostStatus();
      };

      const postWithFeedback = async () => {
        const handleProgressUpdate = (update: ProgressUpdate) => {
          if (update.type === 'progress' && update.progress) {
            updatePostProgress(update.postId, { progress: update.progress });
            if (update.platform && update.status) {
              updatePostProgress(update.postId, { platform: update.platform as PlatformType, status: update.status });

              switch (update.status) {
                case 'error':
                  Toast.show({
                    type: 'error',
                    text1: `Falha na postagem (${update.platform})`,
                    text2: update.error || 'Falha ao enviar postagem.',
                    position: 'top',
                    visibilityTime: 4000,
                  });
                  break;
                case 'scheduled':
                  Toast.show({
                    type: 'info',
                    text1: `Postagem agendada (${update.platform})`,
                    text2: `Postagem agendada para ${formatarData(update.publishTime)}.`,
                    position: 'top',
                    visibilityTime: 4000,
                  });
                  break;
                default:
              }
            }
          } else if (update.type === 'summary') {
            Logger.info('[Post Flow] Sumário final recebido:', JSON.stringify(update));
            const finalResults = update.summary! as { successful: PlatformType[]; failed: PlatformType[] };
            finishPosting(update.postId, finalResults);

            if (update.postId) {
              const id = Number.parseInt(update.postId, 10);
              if (!isNaN(id))
                PostDao.update(id, {
                  platformsSuccess: finalResults.successful.join(', '),
                  status: POSTED as PostType,
                });
            }

            resetPostStatus();
          }
        };

        const result = await apiService.postAll(payload, handleProgressUpdate);
        setAwaitPosting(false);
        if (!result.success && result.isWebSocket) {
          resetPostStatus();
          Alert.alert(
            'Servidor de Progresso Indisponível',
            'Não foi possível conectar para receber o feedback em tempo real. Deseja continuar com o envio mesmo assim?',
            [
              { text: 'Não', style: 'cancel' },
              { text: 'Sim, continuar', onPress: () => postWithoutFeedback() },
            ],
          );
        } else if (!result.success) {
          Toast.show({
            type: 'error',
            text1: 'Falha ao enviar postagem',
            text2: result.message,
            position: 'top',
            visibilityTime: 4000,
          });
          resetPostStatus();
        } else {
          Toast.show({
            type: 'success',
            text1: 'Processo Finalizado',
            text2: 'Postagem enviada com sucesso em breve estará disponível nas redes sociais.',
            position: 'top',
            visibilityTime: 4000,
          });
          PostDao.update(postId!, { platformsSuccess: UNKNOW, status: POSTED as PostType });
        }
      };

      await postWithFeedback();
    } catch (error: Error | any) {
      Logger.error(error, { message: '[Post Flow] Erro ao postar:' });
      setAwaitPosting(false);
      Toast.show({
        type: 'error',
        text1: 'Falha ao enviar postagem',
        text2: 'Ocorreu um erro ao processar sua postagem.',
        position: 'top',
        visibilityTime: 4000,
      });
    }
  };

  const handlePostToSingle = async (platform: PlatformType) => {
    if (!connections.find(c => c.platform === platform && c.active)) {
      Alert.alert('Conta Inativa', `Ative a conta de ${platform} nas configurações.`);
      return;
    }

    const images = selectedImages.filter(
      img => !img.platforms || img.platforms.length === 0 || img.platforms.includes(platform),
    );

    if (!postText.trim() && images.length === 0) {
      Alert.alert('Conteúdo Vazio', 'Escreva algo ou anexe uma imagem para postar.');
      return;
    }

    if ((platform === X || platform === BLUESKY) && images.length > 4) {
      Alert.alert('Limite de Imagens Excedido', 'X (Twitter) e Bluesky aceitam no máximo 4 imagens.');
      return;
    }

    Toast.show({ type: 'info', text1: 'Enviando...', text2: `Preparando post para ${platform}.` });

    const draftData = {
      content: postText,
      images: selectedImages,
      status: DRAFT as PostType,
      tags: tagsText,
      platformsSend: platform,
    };

    let postId = editingPostId;
    try {
      setAwaitPosting(true);
      // prettier-ignore
      if (postId) 
        await PostDao.update(postId, draftData);
      else 
        postId = await PostDao.create(draftData);

      usePostStore.setState({ editingPostId: postId });

      startPosting(postId, [platform]);

      let blogName = null;
      if (platform === TUMBLR) {
        const tumblrCreds = await AuthTokenDao.getCredentialsForPlatform<TumblrCredentials>(TUMBLR);
        blogName = tumblrCreds?.blogName || null;
      }

      const payload: SinglePostPayload = {
        platform,
        text: postText,
        images: images,
        tags: tagsText
          .split(TAG_SEPARADOR)
          .map(t => t.trim())
          .filter(t => t)
          .filter(Boolean),
        blogName: blogName,
      };

      const result = await apiService.postSingle(platform, payload);
      if (result.success) {
        Toast.show({
          type: result.scheduled ? 'info' : 'success',
          text1: result.scheduled ? `Postagem agendada (${platform})` : `Postagem enviada (${platform})`,
          text2: result.scheduled ? result.message : `Postagem enviada com sucesso para ${platform}.`,
          position: 'top',
          visibilityTime: 4000,
        });
        PostDao.update(postId!, { platformsSuccess: platform, status: POSTED as PostType });
        updatePostProgress(postId, { platform, status: SUCCESS });
      } else {
        updatePostProgress(postId, { platform, status: ERROR });
        Toast.show({
          type: 'error',
          text1: `Falha na postagem (${platform})`,
          text2: result.message || 'Falha ao enviar postagem para a plataforma.',
          position: 'top',
          visibilityTime: 4000,
        });
      }
      setAwaitPosting(false);
      resetPostStatus();
    } catch (error: any) {
      Logger.error(error, { message: `[Single Post Flow] Erro ao postar em ${platform}` });
      setAwaitPosting(false);
      updatePostProgress(postId, { platform, status: ERROR });
      Toast.show({
        type: 'error',
        text1: `Falha na postagem (${platform})`,
        text2: error.message || 'Falha ao enviar postagem para a plataforma.',
      });
    }
  };

  const handleToggleImagePlatform = (imageIndex: number, platform: PlatformType) => {
    toggleImagePlatform(imageIndex, platform);
  };

  const renderImageItem = ({ item, index }: { item: SelectedImage; index: number }) => {
    return (
      <TouchableOpacity
        onPress={() => handleImageClick(item)}
        style={[styles.imageItemContainer]}
      >
        <Image source={{ uri: item.path }} style={styles.imageItem} />
        <TouchableOpacity
          style={styles.editIconOverlay}
          onPress={() => handleAdjustSingleImage(index)}
          disabled={isAdjustingImages}
        >
          <Icon name="crop-outline" size={20} color={colors.iconOverlay} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeIconOverlay}
          onPress={() => handleRemoveImage(index)}
          disabled={isAdjustingImages}
        >
          <Icon name="close-circle" size={20} color={colors.cancel} />
        </TouchableOpacity>

        <View style={styles.platformIconsOverlay}>
          {connections
            .filter(c => c.active)
            .map(connection => {
              const platformInfo = SOCIAL_PLATFORMS.find(p => p.name === connection.platform);
              // prettier-ignore
              if (!platformInfo) 
              return null;

              const isSelected = item.platforms.includes(connection.platform);
              const iconColor = isSelected ? getPlatformColor(connection.platform) : '#505050';
              return (
                <TouchableOpacity
                  key={connection.platform}
                  onPress={() => handleToggleImagePlatform(index, connection.platform)}
                  style={styles.platformIconWrapper}
                >
                  <Icon name={platformInfo.icon} size={22} color={iconColor} />
                </TouchableOpacity>
              );
            })}
        </View>
      </TouchableOpacity>
    );
  };

  const getPlatformColor = (platform: PlatformType): string => {
    switch (platform) {
      case TUMBLR:
        return '#3a5477ff';
      case X:
        return '#1DA1F2';
      case THREADS:
        return '#000000';
      case BLUESKY:
        return '#0288dbff';
      default:
        return '#505050';
    }
  };

  const getIconColor = (platform: PlatformType): string => {
    const connection = connections.find(c => c.platform === platform);
    // prettier-ignore
    if (!connection) 
        return colors.inactive;

    // prettier-ignore
    if (disabledPlatforms.includes(platform))
      return colors.disabledPlatform;

    switch (connection.postStatus) {
      case PENDING:
        return colors.tertiary;
      case SUCCESS:
        return colors.secondary;
      case ERROR:
        return colors.error;
      case IDLE:
      default:
        return connection.active ? colors.primary : colors.inactive;
    }
  };

  const renderStatusIcon = (platformInfo: (typeof SOCIAL_PLATFORMS)[number]) => {
    return (
      <TouchableOpacity
        key={platformInfo.name}
        style={styles.statusIconWrapper}
        onPress={() => handleToggleDisable(platformInfo.name)}
        onLongPress={() => handlePostToSingle(platformInfo.name)}
        delayLongPress={500}
      >
        <Icon name={platformInfo.icon} size={30} color={getIconColor(platformInfo.name)} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} nestedScrollEnabled={true}>
        <View style={styles.statusContainer}>{SOCIAL_PLATFORMS.map(renderStatusIcon)}</View>

        <TextInput
          style={styles.textArea}
          placeholder="O que você deseja postar?"
          placeholderTextColor={colors.textSecondary}
          multiline
          value={postText}
          onChangeText={handleTextChange}
        />

        <View style={styles.countersContainer}>
          {SOCIAL_PLATFORMS.map(platform => {
            const platformInfo = connections.find(c => c.platform === platform.name);
            // prettier-ignore
            if (!platformInfo || !platformInfo.active) 
              return null;

            const limit = platform.limits || 0;
            let tagsLimit = 0;
            if (tagsText && tagsText.trim().length > 0)
              switch (platform.name) {
                case X:
                case BLUESKY:
                  tagsLimit =
                    tagsText
                      .trim()
                      .split(';')
                      .filter(tag => tag.trim())
                      .map(tag => `#${tag.replace(/ /g, '')}`)
                      .join(' ').length + (postText.length > 0 ? 1 : 0);
                  break;
              }

            const remaining = limit - postText.length - tagsLimit;

            return (
              <View key={platform.name} style={[styles.counterCard, remaining < 0 && styles.counterCardError]}>
                <Icon name={platform.icon} size={16} style={styles.counterIcon} />
                <Text style={styles.counterText}>{remaining}</Text>
              </View>
            );
          })}
        </View>

        <View style={{borderTopWidth: 1, borderTopColor: colors.border, marginBottom: 15 }}/>

        <TextInput
          style={styles.tagsInput}
          placeholder="Adicione tags separadas por ponto e vírgula (;)"
          placeholderTextColor={colors.textSecondary}
          value={tagsText}
          onSelectionChange={e => setTagCursor(e.nativeEvent.selection)}
          onFocus={handleTagsFocus}
          onChangeText={handleTagsChange}
          onBlur={handleTagsBlur}
          onLayout={event => setTagInputLayout(event.nativeEvent.layout)}
        />

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
                keyExtractor={(item, index) => `${item.path}-${index}`}
                horizontal
                showsHorizontalScrollIndicator={true}
              />
            </View>

            {isAdjustingImages && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${imagesProgress * 100}%` }]} />
              </View>
            )}
            <Button
              title={'Corrigir Bordas de Todas Imagens'}
              onPress={handleAdjustAllImages}
              style={styles.adjustButton}
              textStyle={styles.adjustButtonText}
              disabled={isAdjustingImages}
              icon="crop-outline"
            />
          </>
        )}
      </ScrollView>

      {tagSuggestions.length > 0 && tagInputLayout && (
        <View
          style={{
            top: tagInputLayout.y + tagInputLayout.height,
            width: tagInputLayout.width,
            zIndex: 10,
            ...styles.suggestionsContainer,
          }}
        >
          <FlatList
            data={tagSuggestions}
            keyExtractor={(item, index) => item + index}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.suggestionItem} onPress={() => handleSelectSuggestion(item)}>
                <Text style={styles.suggestionText}>{item}</Text>
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          />
        </View>
      )}

      {isPosting && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${postProgress}%` }]} />
        </View>
      )}
      <View style={styles.actionsContainer}>
        <Button
          title={'Cancelar'}
          onPress={handleCancel}
          style={[styles.actionButton, styles.cancelButton]}
          textStyle={styles.cancelButtonText}
          disabled={awaitPosting}
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
          disabled={awaitPosting}
        />
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;
