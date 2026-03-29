import { StyleSheet, Platform } from 'react-native';
import { ColorsType } from 'src/theme/colors';

export const getStyles = (colors: ColorsType) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 18,
      color: colors.textSecondary,
    },
    // Estilos do Card de Histórico
    itemCard: {
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: 15,
      marginVertical: 8,
      marginHorizontal: 16,
      shadowColor: colors.shadown,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusBadge: {
      ...Platform.select({
        windows: {
          marginStart: 10,
          marginEnd: 10,
          padding: 6,
          borderRadius: 16,
        },
        default: {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 12,
        }
      })
    },
    statusText: {
      color: colors.text,
      fontWeight: 'bold',
      fontSize: 12,
    },
    postedBadge: {
      backgroundColor: colors.secondary,
    },
    draftBadge: {
      backgroundColor: colors.tertiary,
    },
    dateText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginRight: 10,
    },
    contentText: {
      fontSize: 15,
      color: colors.text,
      marginBottom: 10,
    },
    imageThumbnail: {
      width: 60,
      height: 60,
      borderRadius: 8,
      marginRight: 10,
    },
    footer: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    footerIconsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 8,
    },
    footerIcon: {
      marginHorizontal: 8,
    },
    platformsText: {
      fontSize: 12,
      fontStyle: 'italic',
      color: colors.textSecondary,
    },
    deleteButton: {
      right: 10,
      padding: 5,
    },
    searchContainer: {
      paddingBottom: 5,
      paddingTop: 10,
      paddingLeft: 15,
      paddingRight: 15,
      backgroundColor: colors.background,
      zIndex: 10,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background || '#f0f0f0',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      ...Platform.select({
        windows: {
          marginStart: 12,
          marginEnd: 12,
          paddingLeft: 10,
        },
        default: {
          paddingHorizontal: 12,
        }
      })
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
      height: '100%',
    },
    suggestionsListContainer: {
      position: 'absolute',
      top: 51,
      left: 16,
      right: 16,
      backgroundColor: colors.card,
      borderRadius: 8,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      zIndex: 20,
      maxHeight: 200,
      borderWidth: 1,
      borderColor: colors.border,
    },
    suggestionItem: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    suggestionText: {
      color: colors.text,
      fontSize: 14,
    },
  });
