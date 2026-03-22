import { Platform } from 'react-native';

import { pickerService as nativePicker } from './PickerService.Mobile';
import { pickerService as windowsPicker } from './PickerService.Windows';

export const pickerService = Platform.OS === 'windows' ? windowsPicker : nativePicker;
export type { PickerImage, PickerOptions } from './PickerService.Mobile';
