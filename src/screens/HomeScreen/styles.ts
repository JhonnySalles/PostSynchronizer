import { StyleSheet, Dimensions } from 'react-native';
import { ColorsType } from '../../theme/colors';

const { width } = Dimensions.get('window');

export const getStyles = (colors: ColorsType) => StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    container: {
        flex: 1,
        padding: 15,
    },
    // Seção de Status das Conexões
    statusContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    statusIconWrapper: {
        marginHorizontal: 15,
        alignItems: 'center',
    },
    statusText: {
        fontSize: 12,
        marginTop: 4,
        color: colors.textSecondary,
    },
    // Área de Texto
    textArea: {
        flex: 1, // Ocupa o espaço disponível
        minHeight: 150,
        fontSize: 16,
        textAlignVertical: 'top',
        padding: 10,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        marginBottom: 15,
        color: colors.text,
        backgroundColor: colors.card,
    },
    // Carrossel de Imagens
    attachButton: {
        backgroundColor: '#eef',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 15,
    },
    attachButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#007BFF',
    },
    carouselContainer: {
        height: 120,
        marginBottom: 15,
    },
    imageItem: {
        width: 100,
        height: 100,
        borderRadius: 8,
        marginRight: 10,
    },
    // Ações no Rodapé
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    actionButton: {
        flex: 1,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
    },
    cancelButtonText: {
        color: '#555',
    },
    draftButton: {
        backgroundColor: '#ffc107',
    },
    draftButtonText: {
        color: '#fff',
    },
    postButton: {
        backgroundColor: '#28a745',
    },
    postButtonText: {
        color: '#fff',
    },
    tagsInput: {
        fontSize: 16,
        padding: 10,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        marginBottom: 15,
        color: colors.text,
        backgroundColor: colors.card,
    },
    // Container para as sugestões
    suggestionsContainer: {
        maxHeight: 120, // Limita a altura da lista de sugestões
        backgroundColor: colors.card,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        // Posição absoluta para flutuar sobre o conteúdo
        position: 'absolute',
        left: 15,
        right: 15,
        top: 310, // Ajuste este valor conforme necessário para sua UI
        zIndex: 1, // Garante que fique na frente
    },
    suggestionItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    suggestionText: {
        fontSize: 15,
        color: colors.text,
    },
    imageItemContainer: {
        position: 'relative',
        marginRight: 10,
    },
    editIconOverlay: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: 6,
        borderRadius: 15,
    },
    adjustAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#e9ecef', // Cor sutil do tema
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
    },
    adjustAllButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#495057', // Cor sutil do tema
        marginLeft: 8,
    },

});