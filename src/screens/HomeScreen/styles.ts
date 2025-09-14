import { StyleSheet, Dimensions } from 'react-native';
import { ColorsType } from '../../theme/colors';

const { width } = Dimensions.get('window');

export const getStyles = (colors: ColorsType) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: 16,
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
      flex: 1,
      minHeight: 150,
      fontSize: 16,
      textAlignVertical: 'top',
      padding: 10,
      borderRadius: 8,
      marginBottom: 15,
      color: colors.text,
      backgroundColor: colors.background,
    },
    // Carrossel de Imagens
    attachButton: {
      backgroundColor: colors.primary,
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginBottom: 15,
    },
    attachButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    carouselContainer: {
      height: 200,
      marginBottom: 5,
      marginTop: 15,
    },
    imageItem: {
      width: 200,
      height: 200,
      borderRadius: 8,
      marginRight: 10,
    },
    // Ações no Rodapé
    actionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
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
      backgroundColor: colors.cancel,
    },
    cancelButtonText: {
      color: colors.textPrimary,
    },
    draftButton: {
      backgroundColor: colors.tertiary,
    },
    draftButtonText: {
      color: colors.textPrimary,
    },
    postButton: {
      backgroundColor: colors.secondary,
    },
    postButtonText: {
      color: colors.textPrimary,
    },
    tagsInput: {
      fontSize: 16,
      padding: 10,
      marginBottom: 15,
      color: colors.text,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    // Container para as sugestões
    suggestionsContainer: {
      maxHeight: 120,
      backgroundColor: colors.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      position: 'absolute',
      left: 15,
      right: 15,
      top: 310,
      zIndex: 1,
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
      top: 5,
      left: 40,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      padding: 6,
      borderRadius: 15,
      zIndex: 2,
    },
    removeIconOverlay: {
      position: 'absolute',
      top: 5,
      right: 5,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      padding: 6,
      borderRadius: 15,
      zIndex: 2,
    },
    platformIconsOverlay: {
      position: 'absolute',
      bottom: 5,
      left: 5,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      borderRadius: 8,
      paddingHorizontal: 5,
      paddingVertical: 3,
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 2,
    },
    platformIconWrapper: {
      marginHorizontal: 4,
    },
    adjustButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      padding: 10,
      borderRadius: 8,
      marginBottom: 15,
      marginStart: 40,
      marginEnd: 40,
    },
    adjustButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginLeft: 8,
    },
    progressContainer: {
      height: 4,
      backgroundColor: colors.background,
      borderRadius: 4,
      marginTop: 10,
      marginBottom: 5,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 4,
    },
    countersContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      marginBottom: 15,
      flexWrap: 'wrap',
    },
    counterCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 20,
      paddingVertical: 4,
      paddingHorizontal: 8,
      marginLeft: 8,
      marginTop: 5,
    },
    counterCardError: {
      backgroundColor: colors.error,
    },
    counterText: {
      marginLeft: 5,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    counterIcon: {
      color: colors.textPrimary,
    },
  });
