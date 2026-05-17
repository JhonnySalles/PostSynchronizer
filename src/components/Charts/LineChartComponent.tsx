import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTheme } from '../../theme/ThemeProvider';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface LineChartData {
  value: number;
  label: string;
}

interface ChartDataLevel {
  data: LineChartData[];
  label: string; // "Diário" | "Semanal" | "Mensal"
}

interface LineChartComponentProps {
  levels: ChartDataLevel[];
}

const MIN_SPACING = 35; // Distância mínima legível entre pontos
const ZOOM_STEP = 15; // Incremento de zoom para os botões de conveniência

const LineChartComponent: React.FC<LineChartComponentProps> = ({ levels }) => {
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

  // Estado para desativação dinâmica do scroll
  const [isScrollDisabled, setIsScrollDisabled] = useState(false);

  // 1. Seleciona dinamicamente o nível de agregação ativo com base no espaçamento e limite seguro do Canvas
  const activeLevel = useMemo(() => {
    if (!levels || levels.length === 0) return null;

    // Procura o nível mais detalhado (índices menores) que cabe no Canvas seguro de 2200px
    const MAX_SAFE_WIDTH = 2200;
    for (const level of levels) {
      const totalWidth = level.data.length * currentSpacing;
      if (totalWidth <= MAX_SAFE_WIDTH) {
        return level;
      }
    }
    // Caso contrário, retorna o último nível disponível (menos detalhado, ex: Mensal)
    return levels[levels.length - 1];
  }, [levels, currentSpacing]);

  // Se não houver níveis ou dados, exibe um placeholder amigável
  const hasData = activeLevel && activeLevel.data && activeLevel.data.length > 0;

  // 2. Limite seguro dinâmico para a largura do nível ativo
  const dynamicMaxSpacing = useMemo(() => {
    if (!hasData) return 100;
    const dataLength = activeLevel.data.length;
    const MAX_SAFE_WIDTH = 2200; // Limite seguro para evitar crash do Android Canvas Bitmap
    const calculatedMax = MAX_SAFE_WIDTH / dataLength;
    return Math.max(MIN_SPACING + 15, Math.min(120, calculatedMax));
  }, [hasData, activeLevel?.data.length]);

  // 3. Calcula a quantidade total de publicações mostradas no nível ativo
  const totalQuantity = useMemo(() => {
    if (!hasData) return 0;
    return activeLevel.data.reduce((acc, curr) => acc + curr.value, 0);
  }, [hasData, activeLevel?.data]);

  // 4. Atualiza o espaçamento inicial ao mudar os níveis ou largura disponível
  const lastActiveLabel = useRef<string | null>(null);

  useEffect(() => {
    if (!hasData) return;

    // Se mudamos de nível (ex: "Mensal" -> "Semanal"), reiniciamos o espaçamento ideal
    if (lastActiveLabel.current !== activeLevel.label) {
      lastActiveLabel.current = activeLevel.label;
      const dataLength = activeLevel.data.length;
      const newMin = dataLength > 1 ? availableWidth / (dataLength - 1) : availableWidth;
      const initial = Math.max(MIN_SPACING, Math.min(dynamicMaxSpacing, newMin));
      setCurrentSpacing(initial);
      baseSpacing.current = initial;
    }
  }, [hasData, activeLevel?.label, activeLevel?.data.length, availableWidth, dynamicMaxSpacing]);

  // 5. Gesto de Pinça (Pinch) para Zoom
  const pinchGesture = Gesture.Pinch()
    .runOnJS(true)
    .onStart(() => {
      setIsScrollDisabled(true); // Desativa o scroll horizontal do gráfico ao iniciar a pinça
    })
    .onUpdate(event => {
      const newSpacing = baseSpacing.current * event.scale;
      const cappedSpacing = Math.max(MIN_SPACING, Math.min(dynamicMaxSpacing, newSpacing));
      setCurrentSpacing(cappedSpacing);
    })
    .onEnd(event => {
      const finalSpacing = baseSpacing.current * event.scale;
      baseSpacing.current = Math.max(MIN_SPACING, Math.min(dynamicMaxSpacing, finalSpacing));
      setCurrentSpacing(baseSpacing.current);
    })
    .onFinalize(() => {
      setIsScrollDisabled(false); // Sempre reabilita o scroll ao liberar os dedos
    });

  const handleZoomIn = () => {
    setCurrentSpacing(prev => {
      const next = Math.min(dynamicMaxSpacing, prev + ZOOM_STEP);
      baseSpacing.current = next;
      return next;
    });
  };

  const handleZoomOut = () => {
    setCurrentSpacing(prev => {
      const next = Math.max(MIN_SPACING, prev - ZOOM_STEP);
      baseSpacing.current = next;
      return next;
    });
  };

  if (!hasData) {
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
        testID="line-chart-container"
      >
        {/* Indicador de granularidade ativo */}
        <View style={styles.chartHeader}>
          <View style={[styles.badge, { backgroundColor: colors.border }]}>
            <Text style={[styles.badgeText, { color: colors.text }]}>{activeLevel.label}</Text>
          </View>
        </View>

        {/* Container com altura rígida para conter o gráfico + eixo X + scrollbar sem vazar */}
        <View style={styles.chartWrapper}>
          <LineChart
            areaChart
            data={activeLevel.data}
            height={200} // Altura ajustada do desenho do gráfico
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
            disableScroll={isScrollDisabled} // Controlado pelo estado do pinch
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

        {/* Painel unificado do rodapé (footerCard) contendo o total e os botões de zoom */}
        <View style={[styles.footerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.totalContainer}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total: </Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              {totalQuantity} {totalQuantity === 1 ? 'publicação' : 'publicações'}
            </Text>
          </View>

          {/* Botões de Zoom integrados no mesmo painel */}
          {activeLevel.data.length > 3 && (
            <View style={styles.zoomToolbar}>
              <TouchableOpacity
                onPress={handleZoomOut}
                style={[styles.zoomButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                activeOpacity={0.7}
                testID="btn-chart-zoom-out"
              >
                <Text style={[styles.zoomButtonText, { color: colors.text }]}>−</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleZoomIn}
                style={[styles.zoomButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                activeOpacity={0.7}
                testID="btn-chart-zoom-in"
              >
                <Text style={[styles.zoomButtonText, { color: colors.text }]}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    borderRadius: 12,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
    paddingLeft: 40, // Alinha com o início do gráfico de linha (após o eixo Y)
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  chartWrapper: {
    height: 250, // Altura rígida controlada para conter gráfico, eixo X e scrollbar horizontal sem qualquer overflow
    marginBottom: 20,
    justifyContent: 'center',
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
  },
  footerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
  },
  totalValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  zoomToolbar: {
    flexDirection: 'row',
    gap: 12,
  },
  zoomButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
  },
  zoomButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 18,
  },
});

export default LineChartComponent;
