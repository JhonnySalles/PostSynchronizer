import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleProp, ViewStyle, TextStyle, Switch, ActivityIndicator, } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { styles } from './styles';
import { Credentials, TumblrCredentials } from 'src/dao/AuthTokenDao';
import Button from '../Button';
import { Alert } from 'react-native';
import { BLUESKY, THREADS, TUMBLR, UNKNOW, X } from 'src/constants/platforms';
import { useTwitter } from 'react-native-simple-twitter';
import DropDownPicker from 'react-native-dropdown-picker';

interface LoginCardProps {
    credential: Credentials;
    iconName: string;
    iconColor: string;
    onSave: (credentials: Credentials) => void;
    onTest: (credentials: Credentials) => void;
    isTesting?: boolean;
    buttonStyle?: StyleProp<ViewStyle>;
    buttonTextStyle?: StyleProp<TextStyle>;
    onStatusChange?: (credentials: Credentials) => void;
}

const LoginCard = ({ credential, iconName, iconColor, onSave, onTest, isTesting = false, onStatusChange }: LoginCardProps) => {
    const [creds, setCreds] = useState<Credentials>(credential);
    const [isProcessing, setIsProcessing] = useState(false);
    const [blogItems, setBlogItems] = useState<{ label: string; value: string }[]>([]);

    useEffect(() => {
        setCreds(credential);
        if (credential.platform === TUMBLR && (creds as TumblrCredentials).blogs && (creds as TumblrCredentials).blogs.length > 0)
            setBlogItems((creds as TumblrCredentials).blogs.map<{ label: string; value: string }>(b => ({ label: b.title, value: b.name })));
        else
            setBlogItems([]);
    }, [credential]);

    const handleInputChange = (field: keyof Credentials, value: string) => {
        setCreds(prev => ({ ...prev, [field]: value }));
    };

    const areCredsValid = (): boolean => {
        if (!creds) 
            return false;

        const keys = Object.keys(creds);
        const keysToValidate = keys.filter(key => key !== 'platform' && key !== 'active');

        return keysToValidate.some(key => {
            const value = (creds as any)[key];
            return typeof value === 'string' && value.trim() !== '';
        });
    };

    const handleSavePress = () => {
        if (areCredsValid()) {
            let credenciais = creds
            if (credential.platform === TUMBLR)
                credenciais = { ...credenciais, blogs: (creds as TumblrCredentials).blogs.map(b => ({ ...b, selected: b.name === (creds as TumblrCredentials).blogName })) } as TumblrCredentials
            onSave(credenciais);
        } else
            Alert.alert("Campos Vazios", "Por favor, preencha uma credencial ao menos para salvar.");
    };

    const handleTestPress = () => {
        if (areCredsValid())
            onTest(creds);
        else
            Alert.alert("Campos Vazios", "Por favor, preencha uma credencial ao menos antes de testar.");
    };

    const { twitter, TWModal } = useTwitter({
        onSuccess: async (user, oauth) => {
            console.info(`[X] Login bem-sucedido para o usuário: @${user.screen_name}`);
            try {
                setCreds(prev => ({ ...prev, token: oauth.oauth_token, tokenSecret: oauth.oauth_token_secret, aditional: JSON.stringify({ ...user, token: prev.token, tokenSecret: prev.tokenSecret, }) }))
                Alert.alert("Sucesso!", "Sua conta do X (Twitter) foi conectada.");
            } catch (error) {
                console.error(error as Error, { message: 'Falha ao salvar credenciais do X' });
            }
        },
        onError: (err) => {
            console.error(new Error(JSON.stringify(err)), { message: '[X] Falha no login' });
            Alert.alert("Erro no Login", "Não foi possível conectar sua conta do X.");
        },
    });

    const handleXLogin = async () => {
        try {
            setIsProcessing(true)
            await twitter.setConsumerKey(creds.consumerKey, creds.consumerSecret);
            await twitter.login();
        } catch (error) {
            console.error(error as Error, { message: '[X] Erro ao iniciar o fluxo de login' });
        } finally {
            setIsProcessing(false)
        }
    };

    let placeholderConsumer;
    let placeholderConsumerSecret;
    let placeholderToken;
    let placeholderTokenSecret;

    switch (creds.platform) {
        case X:
            placeholderConsumer = "Consumer Key";
            placeholderConsumerSecret = "Consumer Secret";
            placeholderToken = undefined;
            placeholderTokenSecret = undefined;
            break;
        case TUMBLR:
            placeholderConsumer = "Consumer Key";
            placeholderConsumerSecret = "Consumer Secret";
            placeholderToken = "Token";
            placeholderTokenSecret = "Token Secret";
            break;
        case THREADS:
            placeholderConsumer = "Client ID";
            placeholderConsumerSecret = "Client Secret";
            placeholderToken = undefined;
            placeholderTokenSecret = undefined;
            break;
        case BLUESKY:
            placeholderConsumer = "Identifier";
            placeholderConsumerSecret = "Password";
            placeholderToken = undefined;
            placeholderTokenSecret = undefined;
            break;
        default:
            placeholderConsumer = "Consumer Key";
            placeholderConsumerSecret = "Consumer Secret";
            placeholderToken = "Token";
            placeholderTokenSecret = "Token Secret";
    }

    return (
        <View style={styles.cardContainer}>
            <View style={styles.header}>
                <Icon name={iconName} size={30} color={iconColor} />
                <Text style={[styles.title, { color: iconColor }]}>{creds.platform}</Text>

                {(isTesting || isProcessing) && (
                    <View style={styles.activityIndicatorContainer}>
                        <ActivityIndicator size={30} color="#007bff" />
                    </View>
                )}
            </View>

            <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Ativo para postagem</Text>
                <Switch
                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                    thumbColor={creds.active ? '#f5dd4b' : '#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={() => {
                        const credenciais = { ...credential, active: !credential.active };
                        setCreds(credenciais);
                        if (onStatusChange)
                            onStatusChange(credenciais);
                    }
                    }
                    value={creds.active}
                    disabled={!areCredsValid()}
                />
            </View>

            {creds.platform === X && <TWModal />}

            {placeholderConsumer && <TextInput style={styles.input} placeholder={placeholderConsumer} value={creds.consumerKey} onChangeText={v => handleInputChange('consumerKey', v)} />}
            {placeholderConsumerSecret && <TextInput style={styles.input} placeholder={placeholderConsumerSecret} value={creds.consumerSecret} onChangeText={v => handleInputChange('consumerSecret', v)} />}
            {placeholderToken && <TextInput style={styles.input} placeholder={placeholderToken} value={creds.token} onChangeText={v => handleInputChange('token', v)} editable={creds.platform != X} />}
            {placeholderTokenSecret && <TextInput style={styles.input} placeholder={placeholderTokenSecret} value={creds.tokenSecret} onChangeText={v => handleInputChange('tokenSecret', v)} editable={creds.platform != X} />}
                
            {creds.platform === TUMBLR &&
                <DropDownPicker
                    open={isProcessing}
                    value={(creds as TumblrCredentials).blogName}
                    items={blogItems}
                    setOpen={setIsProcessing}
                    setValue={(callback) => {
                        setCreds(prev => ({ ...prev, blogName: callback((prev as TumblrCredentials).blogName) }));
                    }}
                    setItems={setBlogItems}
                    multiple={false}
                    mode="BADGE"
                    placeholder="Selecione um blog para postar"
                    listMode="SCROLLVIEW"
                    zIndex={3000}
                    zIndexInverse={1000}
                />
            }

            {creds.platform === X && <Button title="Conectar com X (Twitter)" onPress={handleXLogin} disabled={isProcessing} />}

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