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

import { getStyles } from './styles';
import { useTheme } from '../../theme/ThemeProvider';
import Button from '../../components/Button';

import PostDao from '../../dao/PostDao';
import { apiService, PostPayload, ProgressUpdate, SinglePostPayload } from '../../services/ApiService';
import ImageProcessingService from '../../services/ImageService';
import { FirebasePostUpdate, firebaseService } from '../../services/FirebaseService';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootTabParamList } from '../../navigation/types';
import { PlatformType, SOCIAL_PLATFORMS, UNKNOW, THREADS, TUMBLR, X, BLUESKY } from '../../constants/platforms';
import AuthTokenDao, { TumblrCredentials } from '../../dao/AuthTokenDao';
import { requestGalleryPermission } from 'src/utils/permissions';
import Logger from 'src/services/LoggerService';
import { Toast } from 'react-native-toast-message/lib/src/Toast';
import { DRAFT, ERROR, IDLE, PENDING, POSTED, PostStatusType, PostType, SUCCESS } from 'src/constants/app';

type Connections = {
  platform: PlatformType;
  active: boolean;
  postStatus: PostStatusType;
};

type SelectedImage = {
  path: string;
  platforms: PlatformType[];
};

type HomeScreenProps = BottomTabScreenProps<RootTabParamList, 'Home'>;

const DEFAULT = {
  platform: UNKNOW,
  active: false,
  postStatus: IDLE as PostStatusType,
} as Connections;

const HomeScreen = ({ route, navigation }: HomeScreenProps) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [connections, setConnections] = useState<Connections[]>([
    { ...DEFAULT, platform: TUMBLR },
    { ...DEFAULT, platform: X },
    { ...DEFAULT, platform: BLUESKY },
    { ...DEFAULT, platform: THREADS },
  ]);

  const [postText, setPostText] = useState('');
  const [tagsText, setTagsText] = useState('');

  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isAdjustingImages, setIsAdjustingImages] = useState(false);
  const [imagesProgress, setImagesProgress] = useState(0);

  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [successfulPlatforms, setSuccessfulPlatforms] = useState<PlatformType[]>([]);

  const [isPosting, setIsPosting] = useState(false);
  const [postProgress, setPostProgress] = useState(0);

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeFirebase = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (route.params?.postToEdit) {
      const { id, content, tags, images } = route.params.postToEdit;

      setEditingPostId(id);
      setPostText(content);
      setTagsText(tags);
      setSelectedImages(images as SelectedImage[]);

      navigation.setParams({ postToEdit: undefined });
    }
  }, [route.params, navigation]);

  useFocusEffect(
    useCallback(() => {
      const fetchConnections = async () => {
        try {
          const activePlatforms = await AuthTokenDao.getActivePlatforms();
          const allPlatforms = SOCIAL_PLATFORMS.map(p => p.name);

          const newStatus = allPlatforms.map(platform => ({
            platform,
            active: activePlatforms.includes(platform),
            postStatus: IDLE as PostStatusType,
          }));
          setConnections(newStatus);
        } catch (error: Error | any) {
          Logger.error(error, {
            message: '[Home Screen] Erro ao buscar conexões:',
          });
        }
      };

      fetchConnections();
      setIsPosting(false);
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
    // prettier-ignore
    if (successfulPlatforms.length > 0) 
        setSuccessfulPlatforms([]);
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
    if (successfulPlatforms.length > 0) 
        setSuccessfulPlatforms([]);

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

      setSelectedImages(prevImages => {
        const allImages = [...prevImages, ...newImages];
        return allImages.map((img, index) => {
          const platforms = img.platforms.filter(p => {
            // prettier-ignore
            if ((p === X || p === BLUESKY) && index >= 4)
                return false;

            return true;
          });
          return { ...img, platforms };
        });
      });
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

    if (newPath !== originalPath)
      setSelectedImages(prev => prev.map((img, i) => (i === index ? { ...img, path: newPath } : img)));

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
      setSelectedImages(prev => prev.map((img, i) => ({ ...img, path: newImagePaths[i] })));
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

      setSelectedImages(prev => prev.map(img => (img.path === image.path ? { ...img, path: croppedImage.path } : img)));
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

    const originalUri = selectedImages[index];

    // prettier-ignore
    if (!originalUri || isAdjustingImages) 
        return;

    setSelectedImages(prev => prev.filter(uri => uri !== originalUri));
  };

  const handleFirebaseUpdate = (update: FirebasePostUpdate) => {
    // prettier-ignore
    if (!update) 
        return;

    Logger.info('[Firebase Update] ', JSON.stringify(update));

    const platformsWithStatus = Object.keys(update.data).filter(k => k !== '_summary') as PlatformType[];
    const totalPlatformsToPost = connections.filter(c => c.postStatus !== IDLE).length;

    const newProgress = platformsWithStatus.length / totalPlatformsToPost;
    setPostProgress(newProgress);

    setConnections(prev =>
      prev.map(conn => {
        if (update.data[conn.platform]) {
          return { ...conn, postStatus: update.data[conn.platform].status };
        }
        return conn;
      }),
    );

    if (update.isFinish) {
      setPostProgress(1);

      if (unsubscribeFirebase.current) {
        unsubscribeFirebase.current();
        unsubscribeFirebase.current = null;
      }

      setTimeout(() => {
        setIsPosting(false);
        setConnections(prev => prev.map(c => ({ ...c, postStatus: IDLE as PostStatusType })));
      }, 5000);
    }
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

      setIsPosting(true);
      setPostProgress(0);
      setConnections(prev =>
        prev.map(c => (platformsToPost.includes(c.platform) ? { ...c, postStatus: PENDING as PostStatusType } : c)),
      );

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

      handleCancel();

      unsubscribeFirebase.current = firebaseService.listenForPostUpdates(postId, handleFirebaseUpdate);

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
        setConnections(prev => prev.map(c => ({ ...c, postStatus: IDLE as PostStatusType })));
        setIsPosting(true);
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
        setIsPosting(false);
      };

      const postWithFeedback = async () => {
        setIsPosting(true);
        setPostProgress(0);

        const handleProgressUpdate = (update: ProgressUpdate) => {
          if (update.type === 'progress' && update.progress) {
            setPostProgress(update.progress);
            if (update.platform && update.status) {
              setConnections(prev =>
                prev.map(c => (c.platform === update.platform ? { ...c, postStatus: update.status! } : c)),
              );

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
            setPostProgress(100);

            const finalResults = update.summary!;
            setConnections(prev =>
              prev.map(c => {
                if (finalResults.successful.includes(c.platform))
                  return { ...c, postStatus: SUCCESS as PostStatusType };
                // prettier-ignore
                if (finalResults.failed.includes(c.platform)) 
                    return { ...c, postStatus: ERROR as PostStatusType };
                return c;
              }),
            );

            PostDao.update(postId!, {
              platformsSuccess: finalResults.successful.join(', '),
              status: POSTED as PostType,
            });
            setTimeout(() => {
              setIsPosting(false);
            }, 1000);
          }
        };

        const result = await apiService.postAll(payload, handleProgressUpdate);

        if (!result.success && result.isWebSocket) {
          setIsPosting(false);
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
          setIsPosting(false);
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

      setEditingPostId(postId);

      setIsPosting(true);
      setConnections(prev =>
        prev.map(c => (c.platform === platform ? { ...c, postStatus: PENDING as PostStatusType } : c)),
      );

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
        setConnections(prev =>
          prev.map(c => (c.platform === platform ? { ...c, postStatus: SUCCESS as PostStatusType } : c)),
        );
      } else {
        setConnections(prev =>
          prev.map(c => (c.platform === platform ? { ...c, postStatus: ERROR as PostStatusType } : c)),
        );
        Toast.show({
          type: 'error',
          text1: 'Falha ao enviar postagem',
          text2: result.message,
          position: 'top',
          visibilityTime: 4000,
        });
      }

      setIsPosting(false);
    } catch (error: any) {
      Logger.error(error, { message: `[Single Post Flow] Erro ao postar em ${platform}` });
      setConnections(prev =>
        prev.map(c => (c.platform === platform ? { ...c, postStatus: ERROR as PostStatusType } : c)),
      );
      Toast.show({ type: 'error', text1: `Falha ao enviar (${platform})`, text2: error.message });
    }
  };

  const handleToggleImagePlatform = (imageIndex: number, platform: PlatformType) => {
    setSelectedImages(prevImages => {
      const newImages = [...prevImages];
      const image = newImages[imageIndex];
      const platformIndex = image.platforms.indexOf(platform);

      // prettier-ignore
      if (platformIndex > -1) 
        image.platforms.splice(platformIndex, 1);
      else 
        image.platforms.push(platform);

      return newImages;
    });
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
