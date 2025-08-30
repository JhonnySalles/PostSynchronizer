import React from 'react';
import { TouchableOpacity, Text, StyleProp, ViewStyle, TextStyle, ActivityIndicator, } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { getStyles } from './styles';


interface ButtonProps {
    title: string;
    onPress: () => void;
    icon?: string;
    variant?: 'primary' | 'secondary' | 'destructive';
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    disabled?: boolean;
    isLoading?: boolean;
}

const Button = ({ title, onPress, icon, variant = 'primary', style, textStyle, disabled = false, isLoading = false, }: ButtonProps) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const containerStyle = [
        styles.baseContainer,
        styles[`${variant}Container`],
        (disabled || isLoading) && styles.disabledContainer,
        style,
    ];

    const contentTextStyle = [
        styles.baseText,
        styles[`${variant}Text`],
        textStyle,
    ];

    return (
        <TouchableOpacity
            style={containerStyle}
            onPress={onPress}
            disabled={disabled || isLoading}
            activeOpacity={0.8}
        >
            {icon && <Icon name={icon} size={22} color={variant === 'primary' || variant === 'destructive' ? '#fff' : colors.primary} />}
            {isLoading ? (
                <ActivityIndicator color={variant === 'primary' || variant === 'destructive' ? '#fff' : colors.primary} />
            ) : (
                <Text style={contentTextStyle}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

export default Button;