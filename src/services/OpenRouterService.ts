import axios from 'axios';
import Logger from './LoggerService';

export interface OpenRouterModel {
  id: string;
  name: string;
  isVision: boolean;
  contextLength?: number;
}

const FALLBACK_FREE_MODELS: OpenRouterModel[] = [
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Google: Gemini 2.0 Flash (Free)', isVision: true },
  { id: 'google/gemini-2.0-flash-thinking-exp:free', name: 'Google: Gemini 2.0 Flash Thinking (Free)', isVision: true },
  { id: 'meta-llama/llama-3.2-11b-vision-instruct:free', name: 'Meta: Llama 3.2 11B Vision (Free)', isVision: true },
  { id: 'qwen/qwen-2-vl-72b-instruct:free', name: 'Qwen: Qwen 2 VL 72B (Free)', isVision: true },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Meta: Llama 3.3 70B Instruct (Free)', isVision: false },
  { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek: R1 (Free)', isVision: false },
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral: Mistral 7B Instruct (Free)', isVision: false },
];

export class OpenRouterService {
  private apiUrl = 'https://openrouter.ai/api/v1';

  /**
   * Obtém a lista de modelos gratuitos do OpenRouter, priorizando modelos com visão
   */
  async getFreeModels(): Promise<OpenRouterModel[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/models`, {
        timeout: 10000,
      });

      const models: any[] = response.data?.data || [];
      if (!Array.isArray(models) || models.length === 0) {
        return FALLBACK_FREE_MODELS;
      }

      // Filtra apenas modelos gratuitos (pricing 0 ou id com :free)
      const freeModels = models.filter(m => {
        const isFreePricing =
          (m.pricing?.prompt === '0' || parseFloat(m.pricing?.prompt || '0') === 0) &&
          (m.pricing?.completion === '0' || parseFloat(m.pricing?.completion || '0') === 0);
        const isFreeId = typeof m.id === 'string' && m.id.endsWith(':free');
        return isFreePricing || isFreeId;
      });

      if (freeModels.length === 0) {
        return FALLBACK_FREE_MODELS;
      }

      const formatted: OpenRouterModel[] = freeModels.map(m => {
        const modality = m.architecture?.modality?.toLowerCase() || '';
        const desc = (m.description || '').toLowerCase();
        const idLower = (m.id || '').toLowerCase();
        const isVision =
          modality.includes('image') ||
          modality.includes('multimodal') ||
          desc.includes('vision') ||
          desc.includes('multimodal') ||
          idLower.includes('vision') ||
          idLower.includes('vl') ||
          idLower.includes('gemini') ||
          idLower.includes('flash');

        return {
          id: m.id,
          name: m.name ? `${m.name}${isVision ? ' 👁️' : ''}` : m.id,
          isVision,
          contextLength: m.context_length,
        };
      });

      // Ordena: modelos de visão primeiro, depois por nome
      formatted.sort((a, b) => {
        if (a.isVision && !b.isVision) return -1;
        if (!a.isVision && b.isVision) return 1;
        return a.name.localeCompare(b.name);
      });

      return formatted;
    } catch (error) {
      Logger.warn('[OpenRouterService] Falha ao listar modelos do OpenRouter, usando fallback.', error);
      return FALLBACK_FREE_MODELS;
    }
  }

  /**
   * Envia o prompt e imagens para gerar sugestão usando o modelo escolhido
   */
  async generateSuggestion(params: {
    apiKey: string;
    model: string;
    prompt: string;
    images?: Array<{ base64Data: string; mimeType: string }>;
  }): Promise<string> {
    const { apiKey, model, prompt, images = [] } = params;

    if (!apiKey || !apiKey.trim()) {
      throw new Error('Chave de API do OpenRouter não configurada. Configure nas Configurações.');
    }

    if (!model || !model.trim()) {
      throw new Error('Nenhum modelo selecionado para o OpenRouter.');
    }

    const content: any[] = [{ type: 'text', text: prompt }];

    if (images && images.length > 0) {
      for (const img of images) {
        content.push({
          type: 'image_url',
          image_url: {
            url: img.base64Data.startsWith('data:')
              ? img.base64Data
              : `data:${img.mimeType || 'image/jpeg'};base64,${img.base64Data}`,
          },
        });
      }
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/chat/completions`,
        {
          model: model.trim(),
          messages: [
            {
              role: 'user',
              content: images.length > 0 ? content : prompt,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey.trim()}`,
            'HTTP-Referer': 'https://postsynchronizer.app',
            'X-Title': 'PostSynchronizer',
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        },
      );

      const messageContent = response.data?.choices?.[0]?.message?.content;
      if (!messageContent) {
        throw new Error('A IA não retornou nenhum texto de sugestão.');
      }

      return typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent);
    } catch (error: any) {
      const apiErrorMessage =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        'Erro desconhecido ao comunicar com o OpenRouter.';
      Logger.error(error as Error, { message: `[OpenRouterService] ${apiErrorMessage}` });
      throw new Error(apiErrorMessage);
    }
  }
}

export const openRouterService = new OpenRouterService();
