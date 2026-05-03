import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTheme } from '../../theme/ThemeProvider';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

interface LineChartData {
  value: number;
  label: string;
}

interface LineChartComponentProps {
  data: LineChartData[];
}

const LineChartComponent: React.FC<LineChartComponentProps> = ({ data }) => {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  
  // Largura reservada para os números do eixo Y
  const Y_AXIS_WIDTH = 35;
  // Margens laterais (16 de cada lado)
  const SCREEN_PADDING = 32;
  // Espaço disponível para o desenho das linhas
  const availableWidth = width - SCREEN_PADDING - Y_AXIS_WIDTH;

  // Estado para controlar o zoom (espaçamento entre pontos)
  const [currentSpacing, setCurrentSpacing] = useState(60);
  const baseSpacing = useRef(60);

  // Atualiza o espaçamento quando os dados mudam (ex: novo filtro de data)
  useEffect(() => {
    const newMin = data.length > 1 ? availableWidth / (data.length - 1) : availableWidth;
    const initial = Math.max(60, newMin);
    setCurrentSpacing(initial);
    baseSpacing.current = initial;
  }, [data.length, availableWidth]);

  // Gesto de Pinça (Pinch) para Zoom
  const pinchGesture = Gesture.Pinch()
    .runOnJS(true)
    .onUpdate((event) => {
      const newSpacing = baseSpacing.current * event.scale;
      // Recalcula o mínimo para garantir que não fique menor que a tela
      const currentMin = data.length > 1 ? availableWidth / (data.length - 1) : availableWidth;
      const cappedSpacing = Math.max(currentMin, Math.min(250, newSpacing));
      setCurrentSpacing(cappedSpacing);
    })
    .onEnd((event) => {
      const currentMin = data.length > 1 ? availableWidth / (data.length - 1) : availableWidth;
      const finalSpacing = baseSpacing.current * event.scale;
      baseSpacing.current = Math.max(currentMin, Math.min(250, finalSpacing));
      setCurrentSpacing(baseSpacing.current);
    });

  // Se não houver dados, exibe um placeholder amigável
  if (data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
        <Text style={{ color: colors.textSecondary }}>Sem dados para o período selecionado</Text>
      </View>
    );
  }

  return (
    <GestureDetector gesture={pinchGesture}>
      <View 
        collapsable={false}
        style={[styles.container, { width: width - SCREEN_PADDING }]}
      >
        <LineChart
          areaChart
          data={data}
          height={200}
          width={availableWidth}
          yAxisLabelWidth={Y_AXIS_WIDTH}
          spacing={currentSpacing}
          initialSpacing={20}
          endSpacing={20}
          color={colors.primary}
          dataPointsColor={isDark ? '#FFF' : '#000'}
          thickness={3}
          startFillColor={colors.primary}
          endFillColor="transparent"
          startOpacity={0.9}
          endOpacity={0}
          gradientDirection="vertical"
          noOfSections={4}
          yAxisColor={colors.border}
          yAxisIndicesColor={colors.border}
          yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
          xAxisColor={colors.border}
          xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
          rulesColor={colors.border}
          rulesType="dashed"
          dashWidth={5}
          dashGap={3}
          disableScroll={false}
          showScrollIndicator={true}
          nestedScrollEnabled={true}
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
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    borderRadius: 12,
    overflow: 'hidden', // Garante que nada saia das bordas arredondadas se houver
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
