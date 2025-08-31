import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleProp, ViewStyle, TextStyle, Switch, ActivityIndicator, } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { styles } from './styles';
import { Credentials, TumblrCredentials } from 'src/dao/AuthTokenDao';
import Button from '../Button';
import { Alert } from 'react-native';
import { TUMBLR } from 'src/constants/platforms';

interface LoginCardProps {
    credential: Credentials;
    iconName: string;
    iconColor: string;
    onSave: (credentials: Credentials) => void;
    onTest: (credentials: Credentials) => void;
    isTesting?: boolean;
    buttonStyle?: StyleProp<ViewStyle>;
    buttonTextStyle?: StyleProp<TextStyle>;
    isActive?: boolean;
    onStatusChange?: (credentials: Credentials) => void;
}

const LoginCard = ({ credential, iconName, iconColor, onSave, onTest, isTesting = false, isActive = false, onStatusChange }: LoginCardProps) => {
    const [creds, setCreds] = useState<Credentials>(credential);

    useEffect(() => {
        setCreds(credential);
    }, [credential]);

    const handleInputChange = (field: keyof Credentials, value: string) => {
        setCreds(prev => ({ ...prev, [field]: value }));
    };

    const handleBlogNameChange = (value: string) => {
        if (creds.platform === TUMBLR) { }
            setCreds(prev => ({ ...prev, blogName: value, aditional: value }));
    };

    const areCredsValid = () => Object.values(creds).find(val => val.trim() !== '');

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
                <Text style={[styles.title, { color: iconColor }]}>{creds.platform}</Text>

                {isTesting && (
                <View style={styles.activityIndicatorContainer}>
                    <ActivityIndicator size={30} color="#007bff" /> 
                </View>
                )}
            </View>

            <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Ativo para postagem</Text>
                <Switch
                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                    thumbColor={isActive ? '#f5dd4b' : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={() => {
                            const credenciais = { ...credential, active: !credential.active };
                            setCreds(credenciais);
                            if (onStatusChange)
                                onStatusChange(credenciais);
                        }
                    }
                    value={isActive}
                />
            </View>

            <TextInput style={styles.input} placeholder="Consumer Key" value={creds.consumerKey} onChangeText={v => handleInputChange('consumerKey', v)} />
            <TextInput style={styles.input} placeholder="Consumer Secret" value={creds.consumerSecret} onChangeText={v => handleInputChange('consumerSecret', v)} />
            <TextInput style={styles.input} placeholder="Token" value={creds.token} onChangeText={v => handleInputChange('token', v)} />
            <TextInput style={styles.input} placeholder="Token Secret" value={creds.tokenSecret} onChangeText={v => handleInputChange('tokenSecret', v)} />
            {creds.platform === TUMBLR && <TextInput style={styles.input} placeholder="Blog Name" value={(creds as TumblrCredentials).blogName} onChangeText={v => handleBlogNameChange(v)} />}
            
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