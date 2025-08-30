import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleProp, ViewStyle, TextStyle, } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { styles } from './styles';
import { Credentials, TumblrCredentials } from 'src/dao/AuthTokenDao';
import Button from '../Button';
import { Alert } from 'react-native';
import { PlatformType, TUMBLR, UNKNOW } from 'src/constants/platforms';

interface LoginCardProps {
    platform: PlatformType;
    iconName: string;
    iconColor: string;
    onSave: (credentials: Credentials) => void;
    onTest: (credentials: Credentials) => void;
    isTesting?: boolean;
    buttonStyle?: StyleProp<ViewStyle>;
    buttonTextStyle?: StyleProp<TextStyle>;
}

const LoginCard = ({ platform, iconName, iconColor, onSave, onTest, isTesting = false }: LoginCardProps) => {
    const [creds, setCreds] = useState<Credentials>({
       platform: platform, consumerKey: '', consumerSecret: '', token: '', tokenSecret: '', aditional: '', actived: false,
    });

    const handleInputChange = (field: keyof Credentials, value: string) => {
        setCreds(prev => ({ ...prev, [field]: value }));
    };

    const handleBlogNameChange = (value: string) => {
        if (creds.platform === TUMBLR) {}
            setCreds(prev => ({ ...prev, blogName: value, aditional: value }));
    };

    const areCredsValid = () => Object.values(creds).every(val => val.trim() !== '');

    const handleSavePress = () => {
        if (areCredsValid())
            onSave(creds);
        else
            Alert.alert("Campos Vazios", "Por favor, preencha todas as credenciais para salvar.");

    };

    const handleTestPress = () => {
        if (areCredsValid())
            onTest(creds);
        else
            Alert.alert("Campos Vazios", "Por favor, preencha todas as credenciais antes de testar.");
    };

    return (
        <View style={styles.cardContainer}>
            <View style={styles.header}>
                <Icon name={iconName} size={30} color={iconColor} />
                <Text style={[styles.title, { color: iconColor }]}>{platform}</Text>
            </View>

            {creds.platform === TUMBLR && <TextInput style={styles.input} placeholder="Blog Name" value={(creds as TumblrCredentials).blogName} onChangeText={v => handleBlogNameChange(v)} />}
            <TextInput style={styles.input} placeholder="Consumer Key" value={creds.consumerKey} onChangeText={v => handleInputChange('consumerKey', v)} />
            <TextInput style={styles.input} placeholder="Consumer Secret" value={creds.consumerSecret} onChangeText={v => handleInputChange('consumerSecret', v)} />
            <TextInput style={styles.input} placeholder="Token" value={creds.token} onChangeText={v => handleInputChange('token', v)} />
            <TextInput style={styles.input} placeholder="Token Secret" value={creds.tokenSecret} onChangeText={v => handleInputChange('tokenSecret', v)} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <Button
                    title={isTesting ? 'Testando...' : 'Testar'}
                    variant="secondary"
                    onPress={handleTestPress}
                    isLoading={isTesting}
                    disabled={isTesting}
                    style={{ flex: 1, marginRight: 10 }}
                />
                <Button
                    title="Salvar"
                    onPress={handleSavePress}
                    disabled={isTesting}
                    style={{ flex: 1 }}
                />
            </View>
        </View>
    );
};

export default LoginCard;