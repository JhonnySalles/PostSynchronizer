import React, { useEffect, useState } from 'react';
import { View, Text, StyleProp, ViewStyle, TextStyle, Switch, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getStyles } from './styles';
import { Credentials, TumblrCredentials } from 'src/dao/AuthTokenDao';
import Button from '../Button';
import { TUMBLR } from 'src/constants/platforms';
import DropDownPicker from 'react-native-dropdown-picker';
import { useTheme } from '../../theme/ThemeProvider';
import { DARK, LIGHT } from 'src/constants/themes';

interface LoginCardProps {
  credential: Credentials;
  iconName: string;
  iconColor: string;
  onConsult?: (credentials: Credentials) => void;
  isConsulting?: boolean;
  buttonStyle?: StyleProp<ViewStyle>;
  buttonTextStyle?: StyleProp<TextStyle>;
  onStatusChange?: (credentials: Credentials) => void;
  onCredentialsChange?: (credentials: Credentials) => void;
}

const LoginCard = ({
  credential,
  iconName,
  iconColor,
  onConsult,
  isConsulting = false,
  onStatusChange,
  onCredentialsChange,
}: LoginCardProps) => {
  const [creds, setCreds] = useState<Credentials>(credential);
  const [isOpening, setIsOpening] = useState(false);
  const [blogItems, setBlogItems] = useState<{ label: string; value: string }[]>([]);

  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  useEffect(() => {
    setCreds(credential);
    if (
      credential.platform === TUMBLR &&
      (creds as TumblrCredentials).blogs &&
      (creds as TumblrCredentials).blogs.length > 0
    )
      setBlogItems(
        (creds as TumblrCredentials).blogs.map<{ label: string; value: string }>(b => ({
          label: b.title,
          value: b.name,
        })),
      );
    else setBlogItems([]);
  }, [credential]);

  const handleConsultPress = () => {
    if (onConsult) onConsult(creds);
  };

  return (
    <View style={styles.cardContainer}>
      <View style={styles.header}>
        <Icon name={iconName} size={30} color={iconColor} />
        <Text style={[styles.title, { color: iconColor }]}>{creds.platform}</Text>

        {isConsulting && (
          <View style={styles.activityIndicatorContainer}>
            <ActivityIndicator size={30} color="#007bff" />
          </View>
        )}
      </View>

      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>Ativo para postagem</Text>
        <Switch
          trackColor={{ false: colors.primaryOutherAccent, true: colors.primaryAccent }}
          thumbColor={creds.active ? colors.primary : colors.primaryOuther}
          ios_backgroundColor={colors.inactive}
          onValueChange={() => {
            const credenciais = { ...credential, active: !credential.active };
            setCreds(credenciais);
            if (onStatusChange) onStatusChange(credenciais);
          }}
          value={creds.active}
        />
      </View>

      {creds.platform === TUMBLR && (
        <DropDownPicker
          open={isOpening}
          value={(creds as TumblrCredentials).blogName}
          items={blogItems}
          setOpen={setIsOpening}
          setValue={callback => {
            const credenciais = {
              ...credential,
              blogName: callback((credential as TumblrCredentials).blogName),
              blogs: (credential as TumblrCredentials).blogs?.map(b => ({
                ...b,
                selected: b.name === callback((credential as TumblrCredentials).blogName),
              })),
            };
            setCreds(credenciais);
            // prettier-ignore
            if (onCredentialsChange)
                onCredentialsChange(credenciais);
          }}
          setItems={setBlogItems}
          multiple={false}
          theme={isDark ? DARK : LIGHT}
          style={styles.pickerContainer}
          textStyle={styles.pickerTextStyle}
          placeholderStyle={styles.pickerPlaceholderStyle}
          dropDownContainerStyle={styles.pickerDropDownContainer}
          listItemLabelStyle={styles.pickerListItemLabel}
          placeholder="Selecione um blog para postar"
          listMode="SCROLLVIEW"
          zIndex={3000}
          zIndexInverse={1000}
        />
      )}

      {creds.platform === TUMBLR && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
          <Button
            title={isConsulting ? 'Consultando...' : 'Consultar blogs'}
            variant="secondary"
            onPress={handleConsultPress}
            isLoading={isConsulting}
            disabled={isConsulting}
            style={{ flex: 1, marginRight: 10 }}
          />
        </View>
      )}
    </View>
  );
};

export default LoginCard;
