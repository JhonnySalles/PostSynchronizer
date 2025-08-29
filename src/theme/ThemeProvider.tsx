import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { Appearance } from 'react-native';
import { palette, ColorsType } from './colors';

interface ThemeContextType {
    isDark: boolean;
    colors: ColorsType;
}

export const ThemeContext = createContext<ThemeContextType>({
    isDark: false,
    colors: palette.light,
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const colorScheme = Appearance.getColorScheme();

    const [isDark, setIsDark] = useState(colorScheme === 'dark');

    useEffect(() => {
        const subscription = Appearance.addChangeListener(({ colorScheme: newColorScheme }) => {
            setIsDark(newColorScheme === 'dark');
        });

        return () => subscription.remove();
    }, []);

    const currentColors = isDark ? palette.dark : palette.light;

    const themeValue = {
        isDark,
        colors: currentColors,
    };

    return (
        <ThemeContext.Provider value={themeValue}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);