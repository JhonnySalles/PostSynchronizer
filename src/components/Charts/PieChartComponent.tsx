import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useTheme } from '../../theme/ThemeProvider';
import { SOCIAL_PLATFORMS } from '../../constants/platforms';

interface PieChartData {
  value: number;
  color: string;
  label: string;
  platformName: string;
}

interface PieChartComponentProps {
  data: PieChartData[];
}

const PieChartComponent: React.FC<PieChartComponentProps> = ({ data }) => {
  const { colors } = useTheme();

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  if (total === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
        <Text style={{ color: colors.textSecondary }}>Sem postagens concluídas para exibir</Text>
      </View>
    );
  }

  const getContrastColor = (color: string) => {
    if (!color || !color.startsWith('#')) return '#FFF';
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155 ? '#000' : '#FFF';
  };

  const chartData = data.map(item => {
    const sliceColor = (colors as any)[item.platformName] || item.color;
    return {
      value: item.value,
      color: sliceColor,
      text: `${item.value}`,
      textColor: getContrastColor(sliceColor),
    };
  });

  return (
    <View style={styles.container} testID="pie-chart-container">
      <PieChart
        data={chartData}
        donut
        showText
        radius={120}
        innerRadius={60}
        textSize={14}
        focusOnPress
        innerCircleColor={colors.background}
        centerLabelComponent={() => {
          return (
            <View style={{ justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 22, color: colors.text, fontWeight: 'bold' }}>{total}</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Total</Text>
            </View>
          );
        }}
      />

      <View style={styles.legendContainer}>
        {data.map((item, index) => {
          const percentage = ((item.value / total) * 100).toFixed(0);
          const platformInfo = SOCIAL_PLATFORMS.find(p => p.name === item.platformName);

          return (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.colorBox, { backgroundColor: (colors as any)[item.platformName] || item.color }]} />
              <Text style={[styles.legendText, { color: colors.text }]}>
                {item.platformName === 'unknow' ? 'Desconhecido' : item.platformName}: <Text style={{ fontWeight: 'bold' }}>{item.value} ({percentage}%)</Text>
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    alignItems: 'center',
    width: '100%',
  },
  emptyContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginVertical: 20,
    width: '100%',
  },
  legendContainer: {
    marginTop: 24,
    width: '100%',
    paddingHorizontal: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorBox: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  legendText: {
    fontSize: 14,
  },
});

export default PieChartComponent;
