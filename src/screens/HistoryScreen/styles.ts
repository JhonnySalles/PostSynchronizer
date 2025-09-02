import { StyleSheet } from 'react-native';
import { ColorsType } from 'src/theme/colors';

export const getStyles = (colors: ColorsType) => StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f5f5f5',
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
        color: '#888',
    },
    // Estilos do Card de Histórico
    itemCard: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 15,
        marginVertical: 8,
        marginHorizontal: 16,
        shadowColor: '#000',
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
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    postedBadge: {
        backgroundColor: '#28a745', // Verde
    },
    draftBadge: {
        backgroundColor: '#ffc107', // Amarelo
    },
    dateText: {
        fontSize: 12,
        color: '#888',
        marginRight: 10,
    },
    contentText: {
        fontSize: 15,
        color: '#333',
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
        borderTopColor: '#eee',
    },
    platformsText: {
        fontSize: 12,
        fontStyle: 'italic',
        color: '#666',
    },
    deleteButton: {
        right: 10,
        padding: 5,
    },
});