import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from 'src/theme/ThemeProvider';
import {
  OPENROUTER_API_KEY,
  OPENROUTER_DEFAULT_MODEL_KEY,
} from 'src/constants/app';
import { openRouterService, OpenRouterModel } from 'src/services/OpenRouterService';
import { fileService } from 'src/services/FileService';
import { getMimeType } from 'src/utils/util';
import ModelSelector from 'src/components/ModelSelector';
import Logger from 'src/services/LoggerService';
import { usePostStore } from 'src/store/usePostStore';
import { RootTabParamList } from 'src/navigation/types';
import { getStyles } from './styles';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  model?: string;
  content: string;
  timestamp: Date;
}

export interface OpenRouterChatProps {
  visible?: boolean;
  onClose?: () => void;
  initialPrompt?: string;
}

const OpenRouterChatScreen: React.FC<OpenRouterChatProps> = ({
  initialPrompt: propInitialPrompt,
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation<any>();
  let routeParams: { initialPrompt?: string } | undefined;
  try {
    const route = useRoute<RouteProp<RootTabParamList, 'OpenRouterChat'>>();
    routeParams = route.params;
  } catch {
    routeParams = undefined;
  }

  const { postText, tagsText, connections, selectedImages } = usePostStore();

  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const scrollViewRef = useRef<ScrollView>(null);
  const initialPromptProcessed = useRef(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsInitializing(true);
    try {
      const savedApiKey = await AsyncStorage.getItem(OPENROUTER_API_KEY);
      if (savedApiKey) {
        setApiKey(savedApiKey);
      }

      const savedModel = await AsyncStorage.getItem(OPENROUTER_DEFAULT_MODEL_KEY);
      const availableModels = await openRouterService.getFreeModels();
      setModels(availableModels);

      let activeModelId = '';
      if (savedModel) {
        activeModelId = savedModel;
      } else if (availableModels.length > 0) {
        activeModelId = availableModels[0].id;
      }
      setSelectedModel(activeModelId);

      // Se veio um prompt inicial via prop ou rota, dispara automaticamente
      const initialPrompt = propInitialPrompt || routeParams?.initialPrompt;
      if (initialPrompt && !initialPromptProcessed.current) {
        initialPromptProcessed.current = true;
        handleSendMessage(initialPrompt, savedApiKey || '', activeModelId);
      }
    } catch (error) {
      Logger.error(error as Error, { message: '[OpenRouterChatScreen] Erro ao carregar configurações.' });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleCopy = (text: string) => {
    Clipboard.setString(text);
    Toast.show({
      type: 'success',
      text1: 'Copiado para a área de transferência!',
      text2: 'Toque longo no campo de texto para colar a sugestão.',
      position: 'top',
      visibilityTime: 3000,
    });
  };

  const handleSendMessage = async (customPrompt?: string, overrideKey?: string, overrideModel?: string) => {
    const promptToSend = (customPrompt || inputText).trim();
    if (!promptToSend) return;

    const currentKey = overrideKey || apiKey;
    const currentModel = overrideModel || selectedModel;

    if (!currentKey || !currentKey.trim()) {
      Alert.alert(
        'Chave da API Necessária',
        'Por favor, cadastre sua chave gratuita da API do OpenRouter na tela de Configurações para continuar.',
        [{ text: 'Entendi' }],
      );
      return;
    }

    if (!currentModel) {
      Alert.alert('Modelo Não Selecionado', 'Selecione um modelo da lista para gerar a sugestão.');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: promptToSend,
      timestamp: new Date(),
    };

    setHistory(prev => [...prev, userMessage]);
    if (!customPrompt) {
      setInputText('');
    }

    setIsLoading(true);

    try {
      // Prepara imagens em Base64 se houver
      let imagesPayload: Array<{ base64Data: string; mimeType: string }> = [];
      if (selectedImages && selectedImages.length > 0) {
        imagesPayload = await Promise.all(
          selectedImages.map(async img => {
            const base64Data = await fileService.readFileBase64(img.path);
            const mimeType = getMimeType(img.path);
            return { base64Data, mimeType };
          }),
        );
      }

      const responseText = await openRouterService.generateSuggestion({
        apiKey: currentKey,
        model: currentModel,
        prompt: promptToSend,
        images: imagesPayload,
      });

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        model: currentModel,
        content: responseText,
        timestamp: new Date(),
      };

      setHistory(prev => [...prev, assistantMessage]);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } catch (error: any) {
      Logger.error(error, { message: '[OpenRouterChatScreen] Erro ao gerar sugestão.' });
      Alert.alert('Falha na Geração', error.message || 'Não foi possível obter resposta da IA.');
    } finally {
      setIsLoading(false);
    }
  };

  const activePlatforms = connections.filter(c => c.active).map(c => c.platform);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Custom Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              testID="openrouter-chat-back-button"
            >
              <Icon name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Sugestões (IA)</Text>
          </View>
        </View>

        {/* Model Selector Bar */}
        <View style={styles.selectorSection}>
          <Text style={styles.selectorLabel}>Modelo Ativo:</Text>
          <View style={styles.modelSelectorWrapper}>
            <ModelSelector
              models={models}
              selectedModelId={selectedModel}
              onSelectModel={setSelectedModel}
              disabled={isLoading}
            />
          </View>
        </View>

        {/* Info Badge Bar */}
        <View style={styles.infoBar}>
          <View style={styles.infoItem}>
            <Icon name="images-outline" size={16} color={colors.primary} />
            <Text style={styles.infoText}>
              {selectedImages.length} {selectedImages.length === 1 ? 'imagem' : 'imagens'}
            </Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <Icon name="share-social-outline" size={16} color={colors.secondary} />
            <Text style={styles.infoText}>
              {activePlatforms.length > 0 ? activePlatforms.join(', ') : 'Nenhuma rede'}
            </Text>
          </View>
        </View>

        {/* Chat / Responses History */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatList}
          contentContainerStyle={styles.chatListContent}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {isInitializing ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.emptyText, { marginTop: 12 }]}>
                Carregando modelos do OpenRouter...
              </Text>
            </View>
          ) : history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="chatbubbles-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5 }} />
              <Text style={styles.emptyTitle}>Como posso te ajudar hoje?</Text>
              <Text style={styles.emptyText}>
                Digite um prompt no campo abaixo ou escolha uma das opções do menu para gerar sugestões de postagem.
              </Text>
            </View>
          ) : (
            history.map(item => {
              if (item.role === 'user') {
                return (
                  <View key={item.id} style={styles.userMessageBubble}>
                    <Text style={styles.userMessageText}>{item.content}</Text>
                  </View>
                );
              }

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.responseCard}
                  activeOpacity={0.7}
                  onPress={() => handleCopy(item.content)}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <Icon name="logo-electron" size={16} color={colors.primary} />
                      <Text style={styles.cardModelName} numberOfLines={1}>
                        {item.model}
                      </Text>
                    </View>
                    <View style={styles.cardHeaderRight}>
                      <Text style={styles.cardTime}>
                        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <TouchableOpacity
                        style={styles.copyIconBtn}
                        onPress={() => handleCopy(item.content)}
                      >
                        <Icon name="copy-outline" size={14} color={colors.primary} />
                        <Text style={styles.copyBtnText}>Copiar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.responseText}>{item.content}</Text>
                  <Text style={styles.clickHint}>
                    👆 Toque no card para copiar o texto
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
          {isLoading && (
            <View style={[styles.emptyContainer, { paddingVertical: 16 }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.emptyText, { marginTop: 8 }]}>Gerando resposta com IA...</Text>
            </View>
          )}
        </ScrollView>

        {/* Input Section */}
        <View style={styles.inputSection}>
          <TextInput
            style={styles.textInput}
            placeholder="Digite sua dúvida ou prompt para a IA..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim() || isLoading}
            testID="openrouter-chat-send-button"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Icon name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default OpenRouterChatScreen;
