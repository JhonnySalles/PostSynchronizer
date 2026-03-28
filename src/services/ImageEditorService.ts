import { Platform } from 'react-native';

import { imageEditorService as mobileEditor } from './ImageEditorService.Mobile';
// @ts-expect-error - Selective import
import { imageEditorService as windowsEditor } from './ImageEditorService.Windows';

export const imageEditorService = Platform.OS === 'windows' ? windowsEditor : mobileEditor;
