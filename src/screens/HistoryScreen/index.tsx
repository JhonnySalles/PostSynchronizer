import React, { useState, useCallback } from 'react';
import { SafeAreaView, View, Text, FlatList, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getDBConnection } from '../../database';
import { styles } from './styles';

interface PostHistoryItem {
    id: number;
    content: string;
    images: string[]; // Já virá como array
    status: 'draft' | 'posted';
    platforms?: string;
    created_at: string;
}

const HistoryScreen = () => {
    const [history, setHistory] = useState<PostHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            const fetchHistory = async () => {
                setIsLoading(true);
                try {
                    const db = await getDBConnection();
                    const results = await db.executeSql(
                        'SELECT * FROM posts ORDER BY created_at DESC'
                    );

                    const items: PostHistoryItem[] = [];
                    results.forEach(result => {
                        for (let i = 0; i < result.rows.length; i++) {
                            const row = result.rows.item(i);
                            items.push({
                                ...row,
                                images: JSON.parse(row.images || '[]'), // Converte a string JSON de volta para array
                            });
                        }
                    });
                    setHistory(items);
                } catch (error) {
                    console.error('Erro ao buscar histórico:', error);
                } finally {
                    setIsLoading(false);
                }
            };

            fetchHistory();
        }, [])
    );

    const renderItem = ({ item }: { item: PostHistoryItem }) => (
        <View style={styles.itemCard}>
            <View style={styles.header}>
                <View style={[
                    styles.statusBadge,
                    item.status === 'posted' ? styles.postedBadge : styles.draftBadge
                ]}>
                    <Text style={styles.statusText}>{item.status === 'posted' ? 'Postado' : 'Rascunho'}</Text>
                </View>
                <Text style={styles.dateText}>
                    {new Date(item.created_at).toLocaleString('pt-BR')}
                </Text>
            </View>

            {item.content ? <Text style={styles.contentText}>{item.content}</Text> : null}

            {item.images.length > 0 && (
                <FlatList
                    data={item.images}
                    renderItem={({ item: uri }) => <Image source={{ uri }} style={styles.imageThumbnail} />}
                    keyExtractor={(uri, index) => uri + index}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                />
            )}

            {item.status === 'posted' && item.platforms && (
                <View style={styles.footer}>
                    <Text style={styles.platformsText}>Publicado em: {item.platforms}</Text>
                </View>
            )}
        </View>
    );

    if (isLoading) {
        return <View style={styles.emptyContainer}><Text>Carregando histórico...</Text></View>;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            {history.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Nenhuma postagem ou rascunho encontrado.</Text>
                </View>
            ) : (
                <FlatList
                    data={history}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    style={styles.container}
                />
            )}
        </SafeAreaView>
    );
};

export default HistoryScreen;