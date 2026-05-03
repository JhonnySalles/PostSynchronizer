import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';

interface CustomDatePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
  initialDate?: Date;
  minDate?: Date;
  maxDate?: Date;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  visible,
  onClose,
  onSelect,
  initialDate = new Date(),
  minDate,
  maxDate,
}) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const containerWidth = width * (width > 600 ? 0.5 : 0.85); // Adaptação para telas grandes
  const [viewDate, setViewDate] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const calendarData = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    // Empty slots for days of previous month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    
    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
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

  const isDisabled = (date: Date) => {
    if (minDate && date < new Date(minDate.setHours(0,0,0,0))) return true;
    if (maxDate && date > new Date(maxDate.setHours(23,59,59,999))) return true;
    return false;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: colors.card, width: containerWidth }]}>
              {/* Header */}
              <View style={styles.header}>
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
                  const disabled = isDisabled(date);
                  
                  return (
                    <TouchableOpacity
                      key={date.toISOString()}
                      style={[
                        styles.dayCell,
                        { width: (containerWidth - 40) / 7 },
                        selected && { backgroundColor: colors.primary, borderRadius: 20 }
                      ]}
                      disabled={disabled}
                      onPress={() => {
                        onSelect(date);
                        onClose();
                      }}
                    >
                      <Text style={[
                        styles.dayText,
                        { color: disabled ? colors.border : (selected ? '#FFF' : colors.text) }
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
  navButton: {
    padding: 5,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
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

export default CustomDatePicker;
