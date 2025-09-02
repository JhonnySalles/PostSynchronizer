import React, { useState, useCallback } from 'react';
import { SafeAreaView, View, Text, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { getStyles } from './styles';
import { useTheme } from '../../theme/ThemeProvider';

import PostDao, { Post as PostHistoryItem } from '../../dao/PostDao';
import { PostDraftData, RootTabParamList } from '../../navigation/types';
import LoadingIndicator from '../../components/LoadingIndicator';
import Icon from 'react-native-vector-icons/Ionicons';

type HistoryScreenNavigationProp = BottomTabNavigationProp<RootTabParamList, 'History'>;

const HistoryScreen = () => {
    const { colors } = useTheme();
    const styles = getStyles(colors);

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
            id: item.id,
            content: item.content || '',
            tags: item.tags || '',
            images: item.images || [],
        };
        navigation.navigate('Home', { postToEdit });
    };

    const handleDeletePress = (postId: number) => {
        Alert.alert(
            "Confirmar Exclusão",
            "Você tem certeza que deseja deletar este item do histórico? Esta ação não pode ser desfeita.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Deletar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await PostDao.delete(postId);
                            setHistory(prevHistory => prevHistory.filter(post => post.id !== postId));
                        } catch (error) {
                            Alert.alert("Erro", "Não foi possível deletar o item.");
                        }
                    },
                },
            ]
        );
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
                    <View style={styles.headerRight}>
                        <Text style={styles.dateText}>
                            {new Date(item.created_at).toLocaleString('pt-BR')}
                        </Text>
                        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeletePress(item.id)}>
                            <Icon name="trash-outline" size={24} color={colors.delete} />
                        </TouchableOpacity>
                    </View>
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