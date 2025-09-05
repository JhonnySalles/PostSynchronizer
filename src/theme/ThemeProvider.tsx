import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { palette, ColorsType } from './colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logger from 'src/services/LoggerService';
import { SYSTEM, LIGHT, DARK } from 'src/constants/themes';

export type ThemeMode = typeof SYSTEM | typeof LIGHT | typeof DARK;
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
    themeMode: SYSTEM,
    setThemeMode: () => { },
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const systemScheme = Appearance.getColorScheme() || LIGHT;
    const [themeMode, setThemeMode] = useState<ThemeMode>(SYSTEM);

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
            if (themeMode === SYSTEM)
                setThemeMode(SYSTEM);
        });
        return () => subscription.remove();
    }, [themeMode]);

    const handleSetThemeMode = async (mode: ThemeMode) => {
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
            setThemeMode(mode);

            let newScheme: ColorSchemeName;
            if (mode === DARK)
                newScheme = DARK;
            else if (mode === LIGHT)
                newScheme = LIGHT;
            else
                newScheme = null;
            
            Appearance.setColorScheme(newScheme);
            Logger.info(`[ThemeProvider] Tema do app definido para: ${mode}. Esquema nativo: ${newScheme}`);
        } catch (error) {
            Logger.error(error as Error, { message: 'Falha ao salvar preferência de tema' });
        }
    };

    const isDark = themeMode === DARK || (themeMode === SYSTEM && systemScheme === DARK);
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