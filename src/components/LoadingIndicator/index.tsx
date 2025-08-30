import React from 'react';
import { Modal, View, Text, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { getStyles } from './styles';

interface LoadingIndicatorProps {
    visible: boolean;
    text?: string;
}

const LoadingIndicator = ({ visible, text = 'Carregando...' }: LoadingIndicatorProps) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    return (
        <Modal
            transparent={true}
            animationType="fade"
            visible={visible}
            onRequestClose={() => { }}
        >
            <View style={styles.modalBackground}>
                <View style={styles.activityIndicatorWrapper}>
                    <ActivityIndicator
                        animating={visible}
                        size="large"
                        color={colors.primary}
                        style={styles.indicator}
                    />
                    <Text style={styles.text}>{text}</Text>
                </View>
            </View>
        </Modal>
    );
};

export default LoadingIndicator;