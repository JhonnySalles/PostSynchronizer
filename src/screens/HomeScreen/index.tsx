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
  ScrollView,
  Keyboard,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import ImagePicker from 'react-native-image-crop-picker';

import { usePostStore } from '../../store/usePostStore';

import { getStyles } from './styles';
import { useTheme } from '../../theme/ThemeProvider';
import Button from '../../components/Button';

import PostDao from '../../dao/PostDao';
import { apiService, PostPayload, ProgressUpdate, SinglePostPayload } from '../../services/ApiService';
import ImageProcessingService from '../../services/ImageService';
import { firebaseService } from '../../services/FirebaseService';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootTabParamList } from '../../navigation/types';
import { PlatformType, SOCIAL_PLATFORMS, UNKNOW, THREADS, TUMBLR, X, BLUESKY } from '../../constants/platforms';
import AuthTokenDao, { TumblrCredentials } from '../../dao/AuthTokenDao';
import { requestGalleryPermission } from 'src/utils/permissions';
import Logger from 'src/services/LoggerService';
import { Toast } from 'react-native-toast-message/lib/src/Toast';
import { DRAFT, ERROR, IDLE, PENDING, POSTED, PostType, SUCCESS } from 'src/constants/app';

type SelectedImage = {
  path: string;
  platforms: PlatformType[];
};

type HomeScreenProps = BottomTabScreenProps<RootTabParamList, 'Home'>;

const HomeScreen = ({ route, navigation }: HomeScreenProps) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

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
    resetPosting,
  } = usePostStore();

  const [isAdjustingImages, setIsAdjustingImages] = useState(false);
  const [imagesProgress, setImagesProgress] = useState(0);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeFirebase = useRef<(() => void) | null>(null);

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
      resetPosting();
    }, []),
  );

  useEffect(() => {
    return () => {
      // prettier-ignore
      if (debounceTimeout.current)
        clearTimeout(debounceTimeout.current);

      // prettier-ignore
      if (unsubscribeFirebase.current)
        unsubscribeFirebase.current();
    };
  }, []);

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

  const handleTagsChange = (text: string) => {
    setTagsText(text);

    // prettier-ignore
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
      Alert.alert('Permissão Negada', 'Você precisa conceder permissão para acessar a galeria de imagens.');
      return;
    }

    try {
      const images = await ImagePicker.openPicker({
        multiple: true,
        mediaType: 'photo',
        maxFiles: 50,
        selectionLimit: 50,
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
        Logger.error(error, { message: '[Home Screen] Erro ao selecionar imagem existente:', });
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
      const croppedImage = await ImagePicker.openCropper({
        path: image.path,
        mediaType: 'photo',
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
        Logger.error(error, { message: '[Home Screen] Erro ao recortar imagem existente:', });
    }
  };

  const handleRemoveImage = (index: number) => {
    // prettier-ignore
    if (isAdjustingImages) 
        return;
    removeImage(index);
  };

  const handleFirebaseFinish = () => {
    if (unsubscribeFirebase.current) {
      unsubscribeFirebase.current();
      unsubscribeFirebase.current = null;
    }
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
    const connectedPlatforms = connections.filter(conn => conn.active).map(conn => conn.platform);

    if (connectedPlatforms.length === 0) {
      Alert.alert('Nenhuma Conta Conectada', 'Vá para as Configurações para conectar suas contas primeiro.');
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

      const platformsToPost = connections.filter(c => c.active).map(c => c.platform);
      const sortedPlatformsToPost: PlatformType[] = platformsToPost.filter(p => p !== THREADS);
      // prettier-ignore
      if (platformsToPost.includes(THREADS)) 
        sortedPlatformsToPost.push(THREADS);

      startPosting(platformsToPost);

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

      clearForm();

      unsubscribeFirebase.current = firebaseService.listenForPostUpdates(postId, handleFirebaseFinish);

      const tumblrCreds = await AuthTokenDao.getCredentialsForPlatform<TumblrCredentials>(TUMBLR);
      const payload: PostPayload = {
        postId,
        platforms: sortedPlatformsToPost,
        text: currentPostText,
        images: currentSelectedImages,
        tags: currentTagsText
          .split(',')
          .map(t => t.trim())
          .filter(t => t),
        platformOptions: {
          tumblr: {
            blogName: tumblrCreds?.blogName || '',
          },
        },
      };

      const postWithoutFeedback = async () => {
        startPosting(platformsToPost);
        const result = await apiService.postAll(payload, () => {}, { forceNoWebSocket: true });
        // prettier-ignore
        if (result.success) {
          Toast.show({
            type: 'success',
            text1: 'Sucesso!',
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
        resetPosting();
        resetPostStatus();
      };

      const postWithFeedback = async () => {
        const handleProgressUpdate = (update: ProgressUpdate) => {
          if (update.type === 'progress' && update.progress) {
            updatePostProgress({ progress: update.progress });
            if (update.platform && update.status) {
              updatePostProgress({ platform: update.platform as PlatformType, status: update.status });

              if (update.status === 'error')
                Toast.show({
                  type: 'error',
                  text1: `Falha na postagem (${update.platform})`,
                  text2: update.error || 'Falha ao enviar postagem.',
                  position: 'top',
                  visibilityTime: 4000,
                });
            }
          } else if (update.type === 'summary') {
            Logger.info('[Post Flow] Sumário final recebido:', update.summary);
            const finalResults = update.summary! as { successful: PlatformType[]; failed: PlatformType[] };
            finishPosting(finalResults);

            PostDao.update(postId!, {
              platformsSuccess: finalResults.successful.join(', '),
              status: POSTED as PostType,
            });
            resetPosting();
            resetPostStatus();
          }
        };

        const result = await apiService.postAll(payload, handleProgressUpdate);

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
          if (unsubscribeFirebase.current) {
            unsubscribeFirebase.current();
            unsubscribeFirebase.current = null;
          }

          Toast.show({
            type: 'error',
            text1: 'Falha ao enviar postagem',
            text2: result.message,
            position: 'top',
            visibilityTime: 4000,
          });
          resetPosting();
          resetPostStatus();
        } else {
          Toast.show({
            type: 'success',
            text1: 'Processo Finalizado',
            text2: 'Postagem enviada com sucesso em breve estará disponível nas redes sociais.',
            position: 'top',
            visibilityTime: 4000,
          });
        }
      };

      await postWithFeedback();
    } catch (error: Error | any) {
      Logger.error(error, { message: '[Post Flow] Erro ao postar:' });
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: 'Ocorreu um erro ao processar sua postagem.',
        position: 'top',
        visibilityTime: 4000,
      });

      if (unsubscribeFirebase.current) {
        unsubscribeFirebase.current();
        unsubscribeFirebase.current = null;
      }
    }
  };

  const handlePostToSingle = async (platform: PlatformType) => {
    if (!connections.find(c => c.platform === platform && c.active)) {
      Alert.alert('Conta Inativa', `Ative a conta de ${platform} nas configurações.`);
      return;
    }

    if (!postText.trim() && selectedImages.length === 0) {
      Alert.alert('Conteúdo Vazio', 'Escreva algo ou anexe uma imagem para postar.');
      return;
    }

    if (platform === X || platform === BLUESKY) {
      const twitterImageCount = selectedImages.filter(img => img.platforms.includes(X)).length;
      const blueskyImageCount = selectedImages.filter(img => img.platforms.includes(BLUESKY)).length;
      if (twitterImageCount > 4 || blueskyImageCount > 4) {
        Alert.alert('Limite de Imagens Excedido', 'X (Twitter) e Bluesky aceitam no máximo 4 imagens.');
        return;
      }
    }

    Toast.show({ type: 'info', text1: 'Enviando...', text2: `Preparando post para ${platform}.` });

    // Salva o post como rascunho antes de enviar
    const draftData = {
      content: postText,
      images: selectedImages,
      status: DRAFT as PostType,
      tags: tagsText,
      platformsSend: platform,
    };

    try {
      let postId = editingPostId;
      // prettier-ignore
      if (postId) 
        await PostDao.update(postId, draftData);
      else 
        postId = await PostDao.create(draftData);

      usePostStore.setState({ editingPostId: postId });

      startPosting([platform]);

      let blogName = null;
      if (platform === TUMBLR) {
        const tumblrCreds = await AuthTokenDao.getCredentialsForPlatform<TumblrCredentials>(TUMBLR);
        blogName = tumblrCreds?.blogName || null;
      }

      const payload: SinglePostPayload = {
        platform,
        text: postText,
        images: [...selectedImages],
        tags: tagsText
          .split(',')
          .map(t => t.trim())
          .filter(t => t),
        blogName: blogName,
      };

      const result = await apiService.postSingle(platform, payload);
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Sucesso!',
          text2: `Post enviado com sucesso para ${platform}.`,
          position: 'top',
          visibilityTime: 4000,
        });
        PostDao.update(postId!, { platformsSuccess: platform, status: POSTED as PostType });
        updatePostProgress({ platform, status: SUCCESS });
      } else {
        updatePostProgress({ platform, status: ERROR });
        Toast.show({
          type: 'error',
          text1: 'Falha ao enviar postagem',
          text2: result.message,
          position: 'top',
          visibilityTime: 4000,
        });
      }

      resetPosting();
      resetPostStatus();
    } catch (error: any) {
      Logger.error(error, { message: `[Single Post Flow] Erro ao postar em ${platform}` });
      updatePostProgress({ platform, status: ERROR });
      Toast.show({ type: 'error', text1: `Falha ao enviar (${platform})`, text2: error.message });
    }
  };

  const handleToggleImagePlatform = (imageIndex: number, platform: PlatformType) => {
    toggleImagePlatform(imageIndex, platform);
  };

  const renderImageItem = ({ item, index }: { item: SelectedImage; index: number }) => (
    <TouchableOpacity onPress={() => handleImageClick(item)} style={styles.imageItemContainer}>
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
        onLongPress={() => handlePostToSingle(platformInfo.name)}
        delayLongPress={500}
      >
        <Icon name={platformInfo.icon} size={30} color={getIconColor(platformInfo.name)} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
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
                      .split(',')
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

        <TextInput
          style={styles.tagsInput}
          placeholder="Adicione tags separadas por vírgula"
          placeholderTextColor={colors.textSecondary}
          value={tagsText}
          onChangeText={handleTagsChange}
          onBlur={() => setTagSuggestions([])}
        />

        {tagSuggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={tagSuggestions}
              keyExtractor={(item, index) => item + index}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.suggestionItem} onPress={() => handleSelectSuggestion(item)}>
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
                keyExtractor={(item, index) => `${item.path}-${index}`}
                horizontal
                showsHorizontalScrollIndicator={false}
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
          disabled={isPosting}
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
          disabled={isPosting}
        />
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;
