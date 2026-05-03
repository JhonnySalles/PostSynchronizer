import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../theme/ThemeProvider';

export const getStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors.text,
  },
  filterContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 1000, // Necessário para o Dropdown
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  dateButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateButtonLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  dateButtonValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 40,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderRadius: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  chartLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
    textAlign: 'center',
  }
});
