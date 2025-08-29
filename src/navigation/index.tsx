import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';

import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HistoryScreen from '../screens/HistoryScreen';

import { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

const AppNavigator = () => {
    return (
        <Tab.Navigator
            initialRouteName="Home" // Define a tela inicial
            screenOptions={({ route }) => ({
                headerShown: true,
                tabBarActiveTintColor: 'tomato',
                tabBarInactiveTintColor: 'gray',
                tabBarStyle: { backgroundColor: '#ffffff' },
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName = '';

                    if (route.name === 'Home') {
                        iconName = focused ? 'create' : 'create-outline';
                    } else if (route.name === 'History') { // Lógica do ícone para a nova tela
                        iconName = focused ? 'time' : 'time-outline';
                    } else if (route.name === 'Settings') {
                        iconName = focused ? 'settings' : 'settings-outline';
                    }

                    return <Icon name={iconName} size={size} color={color} />;
                },
            })}>
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{ title: 'Postar' }} // Mudei o título para ser mais descritivo
            />
            <Tab.Screen
                name="History"
                component={HistoryScreen}
                options={{ title: 'Histórico' }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: 'Configurações' }}
            />
        </Tab.Navigator>
    );
};

export default AppNavigator;