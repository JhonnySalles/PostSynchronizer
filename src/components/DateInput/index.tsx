import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  TouchableWithoutFeedback,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';

interface DateInputProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
  initialDate?: Date;
  minDate?: Date;
  maxDate?: Date;
  earliestYear?: number;
}

const DateInput: React.FC<DateInputProps> = ({
  visible,
  onClose,
  onSelect,
  initialDate = new Date(),
  minDate,
  maxDate,
  earliestYear = new Date().getFullYear() - 10,
}) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const containerWidth = width * (width > 600 ? 0.5 : 0.85);
  
  const [viewDate, setViewDate] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const [showDirectInput, setShowDirectInput] = useState(false);
  const [directInput, setDirectInput] = useState('');

  useEffect(() => {
    if (visible) {
      setViewDate(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
      setShowDirectInput(false);
      setDirectInput('');
    }
  }, [visible, initialDate]);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const calendarData = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  }, [viewDate]);

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const isSelected = (date: Date) => {
    return (
      date.getDate() === initialDate.getDate() &&
      date.getMonth() === initialDate.getMonth() &&
      date.getFullYear() === initialDate.getFullYear()
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isDisabled = (date: Date) => {
    if (minDate && date < new Date(new Date(minDate).setHours(0,0,0,0))) return true;
    if (maxDate && date > new Date(new Date(maxDate).setHours(23,59,59,999))) return true;
    return false;
  };

  const handleDirectInput = (text: string) => {
    let cleaned = text.replace(/\D/g, '');
    if (cleaned.length > 2) cleaned = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    if (cleaned.length > 4) cleaned = cleaned.slice(0, 5) + '/' + cleaned.slice(5, 9);
    setDirectInput(cleaned);

    if (cleaned.length === 10) {
      const [d, m, y] = cleaned.split('/').map(Number);
      const date = new Date(y, m - 1, d);
      if (!isNaN(date.getTime()) && date.getDate() === d && date.getMonth() === m - 1) {
        setViewDate(new Date(y, m - 1, 1));
        onSelect(date);
        onClose();
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: colors.card, width: containerWidth }]}>
              {/* Restored Header with Arrows and Text */}
              <View style={styles.header}>
                <View style={styles.headerNav}>
                  <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
                    <Icon name="chevron-back" size={24} color={colors.primary} />
                  </TouchableOpacity>
                  
                  <Text style={[styles.monthText, { color: colors.text }]}>
                    {months[viewDate.getMonth()]} {viewDate.getFullYear()}
                  </Text>
                  
                  <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
                    <Icon name="chevron-forward" size={24} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => setShowDirectInput(!showDirectInput)} style={styles.iconButton}>
                  <Icon name={showDirectInput ? "calendar" : "calendar-outline"} size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {showDirectInput && (
                <View style={styles.directInputContainer}>
                  <TextInput
                    style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    placeholder="dd/mm/yyyy"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={directInput}
                    onChangeText={handleDirectInput}
                    maxLength={10}
                  />
                </View>
              )}

              {/* Days of Week */}
              <View style={styles.weekRow}>
                {daysOfWeek.map(day => (
                  <Text key={day} style={[styles.weekDayText, { color: colors.textSecondary, width: (containerWidth - 40) / 7 }]}>
                    {day}
                  </Text>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={styles.grid}>
                {calendarData.map((date, index) => {
                  if (!date) return <View key={`empty-${index}`} style={[styles.dayCell, { width: (containerWidth - 40) / 7 }]} />;
                  
                  const selected = isSelected(date);
                  const today = isToday(date);
                  const disabled = isDisabled(date);
                  
                  return (
                    <TouchableOpacity
                      key={date.toISOString()}
                      style={[
                        styles.dayCell,
                        { width: (containerWidth - 40) / 7 },
                        selected && { backgroundColor: colors.primary, borderRadius: 20 },
                        today && !selected && { borderWidth: 2, borderColor: colors.primary, borderRadius: 20 }
                      ]}
                      disabled={disabled}
                      onPress={() => {
                        onSelect(date);
                        onClose();
                      }}
                    >
                      <Text style={[
                        styles.dayText,
                        { color: disabled ? colors.border : (selected ? '#FFF' : colors.text) },
                        today && !selected && { fontWeight: 'bold' }
                      ]}>
                        {date.getDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={[styles.closeButtonText, { color: colors.primary }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 15,
  },
  navButton: {
    padding: 5,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    minWidth: 140,
    textAlign: 'center',
  },
  iconButton: {
    padding: 8,
  },
  directInputContainer: {
    marginBottom: 15,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    textAlign: 'center',
    fontSize: 16,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekDayText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  dayText: {
    fontSize: 14,
  },
  closeButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  }
});

export default DateInput;
