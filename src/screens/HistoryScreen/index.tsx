import React, { useState, useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import Clipboard from '@react-native-clipboard/clipboard';
import { Toast } from 'react-native-toast-message/lib/src/Toast';
import { shareService } from '../../services/ShareService';
import { fileService } from '../../services/FileService';

import { getStyles } from './styles';
import { useTheme } from '../../theme/ThemeProvider';

import PostDao, { Post as PostHistoryItem } from '../../dao/PostDao';
import { PostDraftData, RootTabParamList } from '../../navigation/types';
import LoadingIndicator from '../../components/LoadingIndicator';
import Icon from 'react-native-vector-icons/Ionicons';
import Logger from 'src/services/LoggerService';
import { requestReadPermission } from 'src/utils/permissions';
import { getMimeType } from 'src/utils/util';
import { SOCIAL_PLATFORMS } from 'src/constants/platforms';

type HistoryScreenNavigationProp = BottomTabNavigationProp<RootTabParamList, 'History'>;

const TAG_SEPARATOR = ';';
const FILTER_REGEX = /\b(tag|status|data):(?:"([^"]*)"|([^"\s]+))/gi;

const HistoryScreen = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [history, setHistory] = useState<PostHistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<PostHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const navigation = useNavigation<HistoryScreenNavigationProp>();

  useFocusEffect(
    useCallback(() => {
      const fetchHistory = async () => {
        setIsLoading(true);
        try {
          const items = await PostDao.getAll();
          setHistory(items);
        } catch (error: Error | any) {
          Logger.error(error, { message: '[History Screen] Erro ao buscar histórico:' });
        } finally {
          setIsLoading(false);
        }
      };

      fetchHistory();
    }, []),
  );

  useEffect(() => {
    let result = history;
    let contentSearch = query;
    const activeFilters: { key: string; value: string }[] = [];

    contentSearch = query.replace(FILTER_REGEX, (match, key, quotedValue, unquotedValue) => {
      const value = quotedValue || unquotedValue;
      activeFilters.push({ key: key.toLowerCase(), value: value.toLowerCase() });
      return '';
    });

    contentSearch = contentSearch.replace(/\s+/g, ' ').trim().toLowerCase();

    // prettier-ignore
    if (contentSearch) 
        result = result.filter(item => item.content?.toLowerCase().includes(contentSearch));

    if (activeFilters.length > 0) {
      result = result.filter(item => {
        return activeFilters.every(filter => {
          // prettier-ignore
          if (filter.key === 'tag')
            return item.tags?.toLowerCase().includes(filter.value);

          if (filter.key === 'status') {
            const itemStatus = item.status === 'posted' ? 'postado' : 'rascunho';
            return itemStatus.includes(filter.value) || item.status.includes(filter.value);
          }

          if (filter.key === 'data') {
            const itemDate = new Date(item.created_at).toLocaleDateString('pt-BR');
            return itemDate.includes(filter.value);
          }

          return true;
        });
      });
    }

    setFilteredHistory(result);
  }, [history, query]);

  const updateSuggestions = (text: string) => {
    setQuery(text);

    const tokens = text.split(/\s+/);
    const currentToken = tokens[tokens.length - 1].toLowerCase();

    if (!currentToken) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    let newSuggestions: string[] = [];
    const prefixes = ['tag:', 'status:', 'data:'];

    // prettier-ignore
    if (!currentToken.includes(':')) {
      const matchingPrefixes = prefixes.filter(p => p.startsWith(currentToken));
      if (matchingPrefixes.length > 0) 
        newSuggestions = matchingPrefixes;
    } else {
      const [prefix, rawValue] = currentToken.split(':');
      const value = rawValue ? rawValue.replace(/^"/, '') : '';

      if (prefix === 'tag') {
        const allTags = new Set<string>();
        history.forEach(h => {
          if (h.tags)
            h.tags.split(TAG_SEPARATOR).forEach(t => allTags.add(t.trim().toLowerCase()));
        });
        newSuggestions = Array.from(allTags)
          .filter(t => t.includes(value))
          .map(t => `tag:"${t}"`);
      } else if (prefix === 'status')
        newSuggestions = ['status:"postado"', 'status:"rascunho"'].filter(s => s.includes(value) || s.includes(`"${value}`),);
      else if (prefix === 'data') {
        const allDates = new Set<string>();
        history.forEach(h => {
          if (h.created_at) {
            const dateFormatted = new Date(h.created_at).toLocaleDateString('pt-BR');
            allDates.add(dateFormatted);
          }
        });
        newSuggestions = Array.from(allDates)
          .filter(d => d.includes(value))
          .map(d => `data:"${d}"`);
      }
    }

    setSuggestions(newSuggestions.slice(0, 5));
    setShowSuggestions(newSuggestions.length > 0);
  };

  const handleSuggestionPress = (suggestion: string) => {
    const tokens = query.split(/\s+/);
    tokens.pop();
    tokens.push(suggestion);

    let newQuery = tokens.join(' ');
    // prettier-ignore
    if (!suggestion.endsWith(':')) 
        newQuery = newQuery + ' ';

    setQuery(newQuery);
    setShowSuggestions(false);
  };

  const handleItemPress = (item: PostHistoryItem) => {
    const postToEdit: PostDraftData = {
      id: item.id,
      content: item.content || '',
      tags: item.tags || '',
      images: item.images || [],
    };
    navigation.navigate('Home', { postToEdit });
  };

  const handleDeletePress = (postId: number) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Você tem certeza que deseja deletar este item do histórico? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            try {
              await PostDao.delete(postId);
              setHistory(prevHistory => prevHistory.filter(post => post.id !== postId));
            } catch (error: Error | any) {
              Logger.error(error, { message: '[History Screen] Não foi possível deletar o item.' });
              Alert.alert('Erro', 'Não foi possível deletar o item.');
            }
          },
        },
      ],
    );
  };

  const handleCopyTags = (tags: string) => {
    if (tags && tags.trim().length > 0) {
      Clipboard.setString(tags);
      Toast.show({
        type: 'success',
        text1: 'Copiado!',
        text2: 'As tags foram copiadas para a área de transferência.',
        position: 'top',
      });
    }
  };

  const handleSharePost = async (item: PostHistoryItem) => {
    const hasPermission = await requestReadPermission();
    if (!hasPermission) {
      Alert.alert('Permissão necessária', 'É preciso permitir o acesso às imagens para compartilhar.');
      return;
    }

    try {
      let formattedTags = '';

      if (item.tags) {
        formattedTags = item.tags
          .split(TAG_SEPARATOR)
          .map(tag => tag.trim())
          .filter(Boolean)
          .map(tag =>
            tag
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(''),
          )
          .map(tag => `#${tag}`)
          .join(' ');
      }

      // prettier-ignore
      const message = item.tags && formattedTags ? `${item.content || ''}\n\n${formattedTags}`.trim() : item.content || '';

      Clipboard.setString(message);
      Toast.show({
        type: 'success',
        text1: 'Copiado!',
        text2: 'O texto da mensagem foi copiadas para a área de transferência.',
        position: 'top',
      });

      const imageFilenames: string[] = [];
      const base64Images =
        item.images && item.images.length > 0
          ? await Promise.all(
              item.images.map(async image => {
                const filename = image.path.split('/').pop() || 'image.jpg';
                imageFilenames.push(filename);

                const base64Data = await fileService.readFileBase64(image.path);
                const mimeType = getMimeType(image.path);
                return `data:${mimeType};base64,${base64Data}`;
              }),
            )
          : undefined;

      const options = base64Images
        ? {
            title: 'Compartilhar Post',
            message: message,
            urls: base64Images as string[],
            filenames: imageFilenames,
            type: 'image/*',
            failOnCancel: false,
          }
        : {
            title: 'Compartilhar Post',
            message: message,
            failOnCancel: false,
          };

      await shareService.open(options as any);
    } catch (error: Error | any) {
      Logger.error(error, { message: '[History Screen] Erro ao compartilhar post.' });
      Alert.alert(
        'Erro ao Compartilhar',
        `Não foi possível iniciar o compartilhamento. Detalhes: ${error.message || 'Erro desconhecido.'}`,
      );
    }
  };

  const renderItem = ({ item }: { item: PostHistoryItem }) => {
    const platformsToSend = item.platformsSend?.split(',').map(p => p.trim()) || [];
    const platformsWithSuccess = item.platformsSuccess?.split(',').map(p => p.trim()) || [];

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => handleItemPress(item)}
        onLongPress={() => handleSharePost(item)}
        delayLongPress={500}
      >
        <View style={styles.header}>
          <View style={[styles.statusBadge, item.status === 'posted' ? styles.postedBadge : styles.draftBadge]}>
            <Text style={styles.statusText}>{item.status === 'posted' ? 'Postado' : 'Rascunho'}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.dateText}>{new Date(item.created_at).toLocaleString('pt-BR')}</Text>
            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeletePress(item.id)}>
              <Icon name="trash-outline" size={24} color={colors.delete} />
            </TouchableOpacity>
          </View>
        </View>

        {item.content ? <Text style={styles.contentText}>{item.content}</Text> : null}

        {item.images.length > 0 && (
          <FlatList
            data={item.images}
            renderItem={({ item: { path } }) => <Image source={{ uri: path }} style={styles.imageThumbnail} />}
            keyExtractor={(image, index) => image.path + '-' + index}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={() => handleCopyTags(item.tags || '')}
          onPress={() => {}}
          delayLongPress={200}
        >
          <View style={styles.footer}>
            {item.tags && <Text style={styles.platformsText}>Tags: {item.tags}</Text>}
            {
              <View style={styles.footerIconsContainer}>
                {platformsToSend.map(platformName => {
                  const platformInfo = SOCIAL_PLATFORMS.find(p => p.name === platformName);
                  // prettier-ignore
                  if (!platformInfo) 
                    return null;

                  const wasSuccessful = platformsWithSuccess.includes(platformName);
                  return (
                    <Icon
                      key={platformName}
                      name={platformInfo.icon}
                      size={22}
                      color={wasSuccessful ? colors.success : colors.error}
                      style={styles.footerIcon}
                    />
                  );
                })}
              </View>
            }
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon name="search-outline" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder='Busca... (Ex: "noticia" tag:"news" status:"postado")'
              placeholderTextColor={colors.textSecondary}
              value={query}
              onChangeText={updateSuggestions}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setQuery('');
                  setShowSuggestions(false);
                }}
              >
                <Icon name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsListContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={item => item}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.suggestionItem} onPress={() => handleSuggestionPress(item)}>
                <Text style={styles.suggestionText}>
                  {item.includes(':') ? (
                    <>
                      {item.split(':')[0]}:<Text style={{ fontWeight: 'bold' }}>{item.split(':')[1]}</Text>
                    </>
                  ) : (
                    item
                  )}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <LoadingIndicator visible={isLoading} text="Carregando histórico..." />

      {filteredHistory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nenhuma postagem ou rascunho encontrado.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 80 }}
          onScroll={() => setShowSuggestions(false)}
        />
      )}
    </SafeAreaView>
  );
};

export default HistoryScreen;
