import React, { useState, useCallback } from 'react';
import { SafeAreaView, View, Text, FlatList, Image, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { styles } from './styles';
import PostDao, { Post as PostHistoryItem } from '../../dao/PostDao';
import { PostDraftData, RootTabParamList } from '../../navigation/types';
import LoadingIndicator from '../../components/LoadingIndicator'; 

type HistoryScreenNavigationProp = BottomTabNavigationProp<RootTabParamList, 'History'>;

const HistoryScreen = () => {
    const [history, setHistory] = useState<PostHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const navigation = useNavigation<HistoryScreenNavigationProp>();

    useFocusEffect(
        useCallback(() => {
            const fetchHistory = async () => {
                setIsLoading(true);
                try {
                    const items = await PostDao.getAll();
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

    const handleItemPress = (item: PostHistoryItem) => {
        const postToEdit: PostDraftData = {
            content: item.content || '',
            tags: item.tags || '',
            images: item.images || [],
        };
        navigation.navigate('Home', { postToEdit });
    };

    const renderItem = ({ item }: { item: PostHistoryItem }) => (
        <TouchableOpacity onPress={() => handleItemPress(item)}>
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

                <View style={styles.footer}>
                    {item.tags && (
                        <Text style={styles.platformsText}>Tags: {item.tags}</Text>
                    )}
                    {item.status === 'posted' && item.platforms && (
                        <Text style={styles.platformsText}>Publicado em: {item.platforms}</Text>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <LoadingIndicator visible={isLoading} text="Carregando histórico..." />
            
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