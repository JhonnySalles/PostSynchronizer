import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { palette, ColorsType } from './colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logger from 'src/services/LoggerService';

export type ThemeMode = 'system' | 'light' | 'dark';
const THEME_STORAGE_KEY = '@app:themeMode';

interface ThemeContextType {
    isDark: boolean;
    colors: ColorsType;
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextType>({
    isDark: false,
    colors: palette.light,
    themeMode: 'system',
    setThemeMode: () => { },
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const systemScheme = Appearance.getColorScheme() || 'light';
    const [themeMode, setThemeMode] = useState<ThemeMode>('system');

    useEffect(() => {
        const loadThemePreference = async () => {
            try {
                const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
                if (savedMode)
                    setThemeMode(savedMode);
            } catch (error) {
                Logger.error(error as Error, { message: 'Falha ao carregar preferência de tema' });
            }
        };
        loadThemePreference();
    }, []);

    useEffect(() => {
        const subscription = Appearance.addChangeListener(({ colorScheme }) => {
            if (themeMode === 'system')
                setThemeMode('system');
        });
        return () => subscription.remove();
    }, [themeMode]);

    const handleSetThemeMode = async (mode: ThemeMode) => {
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
            setThemeMode(mode);

            let newScheme: ColorSchemeName;
            if (mode === 'dark')
                newScheme = 'dark';
            else if (mode === 'light')
                newScheme = 'light';
            else
                newScheme = null;
            
            Appearance.setColorScheme(newScheme);
            Logger.info(`[ThemeProvider] Tema do app definido para: ${mode}. Esquema nativo: ${newScheme}`);
        } catch (error) {
            Logger.error(error as Error, { message: 'Falha ao salvar preferência de tema' });
        }
    };

    const isDark = themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');
    const currentColors = isDark ? palette.dark : palette.light;

    const themeValue = {
        isDark,
        colors: currentColors,
        themeMode,
        setThemeMode: handleSetThemeMode,
    };

    return (
        <ThemeContext.Provider value={themeValue}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);