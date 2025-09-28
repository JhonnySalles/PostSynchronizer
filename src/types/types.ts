import { PostStatusType } from 'src/constants/app';
import { PlatformType } from 'src/constants/platforms';

/**
 * Representa o estado de conexão de uma plataforma na UI.
 */
export type ConnectionStatus = {
  platform: PlatformType;
  active: boolean;
  postStatus: PostStatusType;
};

/**
 * Representa uma imagem selecionada pelo usuário, incluindo
 * as plataformas para as quais ela deve ser postada.
 */
export type SelectedImage = {
  path: string;
  platforms: PlatformType[];
};

/**
 * O tipo de dado recebido pelo listener de progresso do Firebase.
 * Inclui o status de cada plataforma e um sumário final opcional.
 */
export type FirebasePostUpdate = {
  isFinish: boolean;
  data: Record<PlatformType, { status: 'success' | 'error'; error?: string }>;
  summary?: {
    successful: PlatformType[];
    failed: PlatformType[];
  };
};
