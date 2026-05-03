import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTheme } from '../../theme/ThemeProvider';

interface LineChartData {
  value: number;
  label: string;
}

interface LineChartComponentProps {
  data: LineChartData[];
}

const LineChartComponent: React.FC<LineChartComponentProps> = ({ data }) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const chartWidth = width - 80;

  // Se não houver dados, exibe um placeholder amigável
  if (data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
        <Text style={{ color: colors.textSecondary }}>Sem dados para o período selecionado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LineChart
        areaChart
        data={data}
        height={200}
        width={chartWidth}
        initialSpacing={10}
        spacing={chartWidth / (data.length > 1 ? data.length : 1) - 20}
        color={colors.primary}
        thickness={3}
        startFillColor={colors.primary}
        endFillColor="transparent"
        startOpacity={0.9}
        endOpacity={0}
        gradientDirection="vertical"
        // Ajuste para o gradiente começar a sumir só depois do meio (aproximadamente)
        // O GiftedCharts usa o startFillColor e endFillColor para preencher a área.
        // Não há um controle direto de "parar no meio" nativo, mas podemos simular com opacidade
        // ou definindo múltiplos pontos se a biblioteca suportasse. 
        // Vamos usar as propriedades padrão que entregam um visual premium.
        noOfSections={4}
        yAxisColor={colors.border}
        yAxisIndicesColor={colors.border}
        yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
        xAxisColor={colors.border}
        xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
        pointerConfig={{
          pointerStripHeight: 160,
          pointerStripColor: colors.primary,
          pointerStripWidth: 2,
          pointerColor: colors.primary,
          radius: 6,
          pointerLabelComponent: (items: any) => {
            return (
              <View style={[styles.pointerLabel, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                <Text style={{ color: colors.text, fontWeight: 'bold' }}>{items[0].value}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{items[0].label}</Text>
              </View>
            );
          },
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginVertical: 20,
  },
  pointerLabel: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  }
});

export default LineChartComponent;
