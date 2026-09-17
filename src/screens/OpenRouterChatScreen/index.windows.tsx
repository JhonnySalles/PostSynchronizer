import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { useTheme } from 'src/theme/ThemeProvider';
import {
  OPENROUTER_API_KEY,
  OPENROUTER_DEFAULT_MODEL_KEY,
} from 'src/constants/app';
import { openRouterService, OpenRouterModel } from 'src/services/OpenRouterService';
import { fileService } from 'src/services/FileService';
import { getMimeType } from 'src/utils/util';
import ModelSelector from 'src/components/ModelSelector';
import ConfirmPopup from 'src/components/ConfirmPopup';
import Logger from 'src/services/LoggerService';
import { usePostStore } from 'src/store/usePostStore';
import { useChatStore, ChatMessage } from 'src/store/useChatStore';
import { getStyles } from './styles';

interface OpenRouterChatWindowsProps {
  visible?: boolean;
  onClose?: () => void;
  initialPrompt?: string;
}

const OpenRouterChatScreen: React.FC<OpenRouterChatWindowsProps> = ({
  visible = true,
  onClose,
  initialPrompt,
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const { connections, selectedImages } = usePostStore();
  const { history, inputText, addMessage, setInputText, clearChat } = useChatStore();

  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showApiKeyPopup, setShowApiKeyPopup] = useState(false);
  const [showModelPopup, setShowModelPopup] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  useEffect(() => {
    if (visible && initialPrompt) {
      setInputText(initialPrompt);
    }
  }, [visible, initialPrompt]);

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
    } catch (error) {
      Logger.error(error as Error, { message: '[OpenRouterChatScreen.windows] Erro ao carregar configurações.' });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleCopy = (text: string) => {
    Clipboard.setString(text);
    Toast.show({
      type: 'success',
      text1: 'Copiado para a área de transferência!',
      text2: 'Cole a sugestão no seu post.',
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
      setShowApiKeyPopup(true);
      return;
    }

    if (!currentModel) {
      setShowModelPopup(true);
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: promptToSend,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    if (!customPrompt) {
      setInputText('');
    }

    setIsLoading(true);

    try {
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

      addMessage(assistantMessage);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } catch (error: any) {
      Logger.error(error, { message: '[OpenRouterChatScreen.windows] Erro ao gerar sugestão.' });
      Alert.alert('Falha na Geração', error.message || 'Não foi possível obter resposta da IA.');
    } finally {
      setIsLoading(false);
    }
  };

  const activePlatforms = connections.filter(c => c.active).map(c => c.platform);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalOverlay}>
        <View style={styles.windowsPopupContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Icon name="sparkles" size={22} color={colors.primary} />
              <Text style={styles.headerTitle}>Sugestões com IA (OpenRouter)</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {history.length > 0 && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setShowClearConfirm(true)}
                  testID="openrouter-chat-clear-button-windows"
                >
                  <Icon name="trash-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
              {onClose && (
                <TouchableOpacity onPress={onClose} style={styles.backButton}>
                  <Icon name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              )}
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

          {/* Chat List */}
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
                  Digite um prompt abaixo ou envie uma mensagem para obter ideias e sugestões otimizadas para suas redes sociais.
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
                          {item.timestamp instanceof Date
                            ? item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                      👆 Clique para copiar
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
              testID="openrouter-chat-send-button-windows"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Icon name="send" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Popup: Limpar Histórico */}
        <ConfirmPopup
          visible={showClearConfirm}
          title="Limpar Conversas"
          message="Deseja apagar o histórico de mensagens desta sessão?"
          confirmLabel="Limpar"
          cancelLabel="Cancelar"
          onConfirm={() => {
            clearChat();
            setShowClearConfirm(false);
          }}
          onCancel={() => setShowClearConfirm(false)}
        />

        {/* Popup: Chave da API Necessária */}
        <ConfirmPopup
          visible={showApiKeyPopup}
          title="Chave da API Necessária"
          message="Por favor, cadastre sua chave gratuita da API do OpenRouter na tela de Configurações para continuar gerando sugestões com IA."
          confirmLabel="Entendi"
          singleButton
          onConfirm={() => setShowApiKeyPopup(false)}
        />

        {/* Popup: Modelo Não Selecionado */}
        <ConfirmPopup
          visible={showModelPopup}
          title="Modelo Não Selecionado"
          message="Selecione um modelo da lista no topo da tela para gerar a sugestão."
          confirmLabel="Entendi"
          singleButton
          onConfirm={() => setShowModelPopup(false)}
        />
      </SafeAreaView>
    </Modal>
  );
};

export default OpenRouterChatScreen;
