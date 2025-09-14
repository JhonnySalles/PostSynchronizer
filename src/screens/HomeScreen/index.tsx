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
import { apiService, PostPayload, ProgressUpdate } from '../../services/ApiService';
import ImageProcessingService from '../../services/ImageService';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootTabParamList } from '../../navigation/types';
import { PlatformType, SOCIAL_PLATFORMS, UNKNOW, THREADS, TUMBLR, X, BLUESKY } from '../../constants/platforms';
import AuthTokenDao, { TumblrCredentials } from '../../dao/AuthTokenDao';
import { requestGalleryPermission } from 'src/utils/permissions';
import Logger from 'src/services/LoggerService';

type Connections = {
  platform: PlatformType;
  active: boolean;
  postStatus: 'idle' | 'pending' | 'success' | 'error';
};

type SelectedImage = {
  path: string;
  platforms: PlatformType[];
};

type HomeScreenProps = BottomTabScreenProps<RootTabParamList, 'Home'>;

const DEFAULT = {
  platform: UNKNOW,
  active: false,
  postStatus: 'idle',
} as Connections;

const HomeScreen = ({ route, navigation }: HomeScreenProps) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [connections, setConnections] = useState<Connections[]>([
    { ...DEFAULT, platform: TUMBLR },
    { ...DEFAULT, platform: X },
    { ...DEFAULT, platform: THREADS },
    { ...DEFAULT, platform: BLUESKY },
  ]);
  const [activePlatforms, setActivePlatforms] = useState<PlatformType[]>([]);
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
  const [postingPlatforms, setPostingPlatforms] = useState<PlatformType[]>([]);
  const [postResults, setPostResults] = useState<Record<PlatformType, 'success' | 'error'>>(
    {} as Record<PlatformType, 'success' | 'error'>,
  );

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

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
            postStatus: 'idle' as const,
          }));
          setConnections(newStatus);
        } catch (e: Error | any) {
          Logger.error(e, {
            message: '[Home Screen] Erro ao buscar conexões:',
          });
        }
      };

      fetchConnections();
    }, []),
  );

  const getActivePlatforms = () => connections.filter(c => c.active).map(c => c.platform);

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
    } catch (e: Error | any) {
      Logger.error(e, {
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

    const images = await ImagePicker.openPicker({
      multiple: true,
      mediaType: 'photo',
      maxFiles: 50,
      selectionLimit: 50,
    });

    const newImages: SelectedImage[] = images.map(img => ({
      path: img.path,
      platforms: activePlatforms,
    }));

    const imagePaths = images.map(img => img.path);
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

    Alert.alert(
      'Ajustar Todas as Imagens',
      'O processamento automático será aplicado em cada imagem, uma por uma. Isso pode levar um momento.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          onPress: async () => {
            setIsAdjustingImages(true);
            try {
              setImagesProgress(0);
              const imagePaths = selectedImages.map(img => img.path);
              const newImagePaths = await ImageProcessingService.processImageList(imagePaths, p =>
                setImagesProgress(p),
              );
              setSelectedImages(prev => prev.map((img, i) => ({ ...img, path: newImagePaths[i] })));
            } catch (e: Error | any) {
              Alert.alert('Erro', 'Ocorreu uma falha durante o processamento das imagens.');
            } finally {
              setIsAdjustingImages(false);
            }
          },
        },
      ],
    );
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
    } catch (e: Error | any) {
      Logger.error(e, {
        message: '[Home Screen] Erro ao recortar imagem existente:',
      });
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
      Logger.error(e, {
        message: '[Home Screen] Não foi possível salvar o rascunho.',
      });
      Alert.alert('Erro', 'Não foi possível salvar o rascunho.');
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

      setIsPosting(true);
      setPostProgress(0);
      setConnections(prev =>
        prev.map(c => (platformsToPost.includes(c.platform) ? { ...c, postStatus: 'pending' } : c)),
      );

      const postForDb = {
        content: currentPostText,
        images: currentSelectedImages,
        status: 'posted' as const,
        tags: currentTagsText,
      };

      let postId = editingPostId;
      // prettier-ignore
      if (postId)
        await PostDao.update(postId, postForDb);
      else
        postId = await PostDao.create(postForDb);

      handleCancel();

      const tumblrCreds = await AuthTokenDao.getCredentialsForPlatform<TumblrCredentials>(TUMBLR);
      const payload: PostPayload = {
        platforms: platformsToPost,
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
        setConnections(prev => prev.map(c => ({ ...c, postStatus: 'idle' })));
        setIsPosting(true);
        const result = await apiService.post(payload, () => {}, { forceNoWebSocket: true });
        // prettier-ignore
        if (result.success)
          Alert.alert('Sucesso', 'Postagem enviada para o servidor. Verifique o resultado nas redes sociais.');
        else 
          Alert.alert('Erro', `Falha ao enviar postagem: ${result.message}`);
        setIsPosting(false);
      };

      const postWithFeedback = async () => {
        setIsPosting(true);
        setPostProgress(0);
        setPostResults({} as Record<PlatformType, 'success' | 'error'>);

        const handleProgressUpdate = (update: ProgressUpdate) => {
          if (update.type === 'progress' && update.progress) {
            setPostProgress(update.progress);
            if (update.platform && update.status) {
              setConnections(prev =>
                prev.map(c => (c.platform === update.platform ? { ...c, postStatus: update.status! } : c)),
              );
            }
          } else if (update.type === 'summary') {
            Logger.info('[Post Flow] Sumário final recebido:', update.summary);
            setPostProgress(100);

            const finalResults = update.summary!;
            setConnections(prev =>
              prev.map(c => {
                if (finalResults.successful.includes(c.platform)) return { ...c, postStatus: 'success' };
                if (finalResults.failed.includes(c.platform)) return { ...c, postStatus: 'error' };
                return c;
              }),
            );

            setTimeout(() => {
              setIsPosting(false);
              setConnections(prev => prev.map(c => ({ ...c, postStatus: 'idle' })));
            }, 1000);
          }
        };

        const result = await apiService.post(payload, handleProgressUpdate);

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
          Alert.alert('Erro', `Falha ao enviar postagem: ${result.message}`);
          setIsPosting(false);
        } else {
          Alert.alert(
            'Processo Finalizado',
            'Postagem enviada com sucesso em breve estará disponível nas redes sociais.',
          );
        }
      };

      await postWithFeedback();
    } catch (e: Error | any) {
      Logger.error(e, { message: '[Post Flow] Erro ao postar:' });
      Alert.alert('Erro', 'Ocorreu um erro ao processar sua postagem.');
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
        <Icon name="crop-outline" size={18} color={colors.card} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.removeIconOverlay}
        onPress={() => handleRemoveImage(index)}
        disabled={isAdjustingImages}
      >
        <Icon name="close-circle" size={24} color={colors.cancel} />
      </TouchableOpacity>

      <View style={styles.platformIconsOverlay}>
        {activePlatforms.map(platform => {
          const platformInfo = SOCIAL_PLATFORMS.find(p => p.name === platform);
          // prettier-ignore
          if (!platformInfo) 
            return null;

          const isSelected = item.platforms.includes(platform);
          const iconColor = isSelected ? getPlatformColor(platform) : colors.inactive;

          return (
            <TouchableOpacity
              key={platform}
              onPress={() => handleToggleImagePlatform(index, platform)}
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
        return colors.tumblr;
      case X:
        return colors.twitter;
      case THREADS:
        return colors.threads;
      case BLUESKY:
        return colors.bluesky;
      default:
        return colors.inactive;
    }
  };

  const getIconColor = (platform: PlatformType): string => {
    const connection = connections.find(c => c.platform === platform);
    // prettier-ignore
    if (!connection) 
        return colors.inactive;

    switch (connection.postStatus) {
      case 'pending':
        return colors.tertiary;
      case 'success':
        return colors.secondary;
      case 'error':
        return colors.error;
      case 'idle':
      default:
        return connection.active ? colors.primary : colors.inactive;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.statusContainer}>
          {SOCIAL_PLATFORMS.map(platformInfo => {
            const connection = connections.find(c => c.platform === platformInfo.name);
            return (
              <View key={platformInfo.name} style={styles.statusIconWrapper}>
                <Icon name={platformInfo.icon} size={30} color={getIconColor(platformInfo.name)} />
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
            // prettier-ignore
            if (!platformInfo) 
                return null;

            const limit = platformInfo.limits || 0;
            const remaining = limit - postText.length;

            return (
              <View key={platform} style={[styles.counterCard, remaining < 0 && styles.counterCardError]}>
                <Icon name={platformInfo.icon} size={16} style={styles.counterIcon} />
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
