import { StyleSheet, Platform } from 'react-native';
import { ColorsType } from '../../theme/colors';

export const getStyles = (colors: ColorsType) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
      ...Platform.select({
        windows: {
          marginTop: 10,
          marginBottom: 10,
        },
        default: {

        }
      })
    },
    container: {
      flex: 1,
      ...Platform.select({
        windows: {
          marginStart: 16,
          marginEnd: 16,
        },
        default: {
          paddingHorizontal: 16,
        }
      })
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
      marginLeft: 0,
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
      height: 250,
      marginBottom: 5,
      marginTop: 15,
    },
    imageItem: {
      width: 250,
      height: 250,
      borderRadius: 8,
      marginRight: 10,
    },
    // Ações no Rodapé
    actionsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
      ...Platform.select({
        windows: {
          marginStart: 16,
          marginEnd: 16,
        },
        default: {
          paddingHorizontal: 16,
        }
      })
    },
    actionButton: {
      flex: 1,
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginHorizontal: 5,
      ...Platform.select({
        windows: {
          marginStart: 16,
          marginEnd: 16,
        },
        default: {
          paddingHorizontal: 16,
        }
      })
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
      textAlign: 'center',
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
      maxHeight: 160,
      backgroundColor: colors.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      position: 'absolute',
      left: 15,
      right: 15,
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
      left: -5,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      padding: 6,
      borderRadius: 15,
      zIndex: 2,
    },
    removeIconOverlay: {
      position: 'absolute',
      top: 5,
      right: 5,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 6,
      borderRadius: 15,
      zIndex: 2,
    },
    platformIconsOverlay: {
      position: 'absolute',
      bottom: 5,
      left: 5,
      backgroundColor: 'rgba(255, 255, 255, 0.6)',
      borderRadius: 8,
      paddingVertical: 3,
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 2,
      ...Platform.select({
        windows: {
          marginStart: 5,
          marginEnd: 5,
        },
        default: {
          paddingHorizontal: 5,
        }
      })
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
      marginLeft: 8,
      marginTop: 5,
      ...Platform.select({
        windows: {
          marginStart: 8,
          marginEnd: 8,
        },
        default: {
          paddingHorizontal: 8,
        }
      })
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
