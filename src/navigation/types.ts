// Este tipo define as rotas disponíveis no seu Tab Navigator
// e os parâmetros que cada uma pode receber.
// 'undefined' significa que a rota não recebe nenhum parâmetro.
export type RootTabParamList = {
    Home: { postToEdit?: PostDraftData } | undefined;
    History: undefined;
    Settings: undefined;
};

export interface PostDraftData {
    content: string;
    tags: string;
    images: string[];
}

