import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleProp, ViewStyle, TextStyle, } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { styles } from './styles';

interface LoginCardProps {
    platformName: string;
    iconName: string;
    iconColor: string;
    onLogin: (username: string, password_or_token: string) => void;
    buttonStyle?: StyleProp<ViewStyle>;
    buttonTextStyle?: StyleProp<TextStyle>;
}

const LoginCard = ({ platformName, iconName, iconColor, onLogin, buttonStyle, buttonTextStyle, }: LoginCardProps) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handlePress = () => {
        if (username.trim() && password.trim()) {
            onLogin(username, password);
        }
    };

    return (
        <View style={styles.cardContainer}>
            <View style={styles.header}>
                <Icon name={iconName} size={30} color={iconColor} />
                <Text style={[styles.title, { color: iconColor }]}>{platformName}</Text>
            </View>

            <TextInput
                style={styles.input}
                placeholder="Usuário ou E-mail"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                keyboardType="email-address"
            />

            <TextInput
                style={styles.input}
                placeholder="Senha ou Token de Acesso"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TouchableOpacity
                style={[styles.button, buttonStyle]}
                onPress={handlePress}>
                <Text style={[styles.buttonText, buttonTextStyle]}>Conectar</Text>
            </TouchableOpacity>
        </View>
    );
};

export default LoginCard;