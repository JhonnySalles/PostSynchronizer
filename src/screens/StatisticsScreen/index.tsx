import React, { useState, useCallback, useMemo } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, Platform, Alert, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DropDownPicker from 'react-native-dropdown-picker';

import DateInput from '../../components/DateInput';

import { useTheme } from '../../theme/ThemeProvider';
import { getStyles } from './styles';
import PostDao, { Post } from '../../dao/PostDao';
import { SOCIAL_PLATFORMS } from '../../constants/platforms';
import StatisticsSummary from '../../components/Statistics/StatisticsSummary';
import LineChartComponent from '../../components/Charts/LineChartComponent';
import PieChartComponent from '../../components/Charts/PieChartComponent';
import LoadingIndicator from '../../components/LoadingIndicator';
import Logger from '../../services/LoggerService';

const StatisticsScreen = () => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const styles = getStyles(colors);

  // Estados de Dados
  const [history, setHistory] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [earliestYear, setEarliestYear] = useState(new Date().getFullYear());

  // Estados de Filtro
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [openPlatform, setOpenPlatform] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('Todos');
  const [platformItems, setPlatformItems] = useState([
    { label: 'Todas as Plataformas', value: 'Todos' },
    ...SOCIAL_PLATFORMS.map(p => ({ label: p.name, value: p.name })),
  ]);

  // Carregar dados ao entrar na tela
  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const items = await PostDao.getAll();
          setHistory(items);
          const year = await PostDao.getEarliestYear();
          setEarliestYear(year);
        } catch (error) {
          Logger.error(error as Error, { message: '[Statistics Screen] Erro ao buscar dados' });
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }, []),
  );

  // Cálculo do Setor 1: Resumo
  const statsSummary = useMemo(() => {
    const now = new Date();

    // Semana atual (considerando segunda-feira como início)
    const monday = new Date(now);
    monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
    monday.setHours(0, 0, 0, 0);

    // Mês atual
    const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Ano atual
    const firstDayYear = new Date(now.getFullYear(), 0, 1);

    const periodStats = {
      weekly: 0,
      monthly: 0,
      yearly: 0,
    };

    const platformCounts: Record<string, number> = {};
    SOCIAL_PLATFORMS.forEach(p => (platformCounts[p.name] = 0));

    history.forEach(post => {
      const postDate = new Date(post.created_at);

      // Contagem por período
      if (postDate >= monday) periodStats.weekly++;
      if (postDate >= firstDayMonth) periodStats.monthly++;
      if (postDate >= firstDayYear) periodStats.yearly++;

      // Contagem por plataforma (apenas se postado com sucesso)
      if (post.status === 'posted' && post.platformsSuccess) {
        const successes = post.platformsSuccess.split(',').map(s => s.trim());
        successes.forEach(s => {
          if (platformCounts[s] !== undefined) {
            platformCounts[s]++;
          }
        });
      }
    });

    return {
      periodStats,
      platformCounts: Object.entries(platformCounts).map(([platform, count]) => ({ platform, count })),
    };
  }, [history]);

  // Cálculo dos Gráficos (Setor 2)
  const chartData = useMemo(() => {
    // Filtrar histórico pelo período e plataforma
    const filtered = history.filter(post => {
      const postDate = new Date(post.created_at);
      const inRange = postDate >= startDate && postDate <= endDate;

      if (!inRange) return false;
      if (selectedPlatform === 'Todos') return true;

      return post.platformsSend
        ?.split(',')
        .map(s => s.trim())
        .includes(selectedPlatform);
    });

    const dayDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // 1. Agrupamento por DIA
    const buildDayData = () => {
      const lineDataMap: Record<string, { value: number; label: string }> = {};
      const iterDate = new Date(startDate);
      while (iterDate <= endDate) {
        const isoKey = iterDate.toISOString().split('T')[0];
        const [year, month, day] = isoKey.split('-');
        const label = dayDiff <= 7 ? `${day}/${month}/${year.slice(2)}` : `${day}/${month}`;
        lineDataMap[isoKey] = { value: 0, label };
        iterDate.setDate(iterDate.getDate() + 1);
      }

      filtered.forEach(post => {
        const postIso = new Date(post.created_at).toISOString().split('T')[0];
        if (lineDataMap[postIso] !== undefined) {
          lineDataMap[postIso].value++;
        }
      });

      return Object.entries(lineDataMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([_, item]) => item);
    };

    // 2. Agrupamento por SEMANA
    const buildWeekData = () => {
      const lineDataMap: Record<string, { value: number; label: string }> = {};
      const getMonday = (d: Date) => {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(date.setDate(diff));
      };

      const iterDate = new Date(startDate);
      while (iterDate <= endDate) {
        const monday = getMonday(iterDate);
        const isoKey = monday.toISOString().split('T')[0];
        
        if (!lineDataMap[isoKey]) {
          const [_, m, d] = isoKey.split('-');
          lineDataMap[isoKey] = { value: 0, label: `Sem ${d}/${m}` };
        }
        iterDate.setDate(iterDate.getDate() + 7);
      }

      filtered.forEach(post => {
        const monday = getMonday(new Date(post.created_at));
        const postIso = monday.toISOString().split('T')[0];
        if (lineDataMap[postIso] !== undefined) {
          lineDataMap[postIso].value++;
        } else {
          const [_, m, d] = postIso.split('-');
          lineDataMap[postIso] = { value: 1, label: `Sem ${d}/${m}` };
        }
      });

      return Object.entries(lineDataMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([_, item]) => item);
    };

    // 3. Agrupamento por MÊS
    const buildMonthData = () => {
      const lineDataMap: Record<string, { value: number; label: string }> = {};
      const iterDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const endMonthDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      const monthNamesAbbr = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

      while (iterDate <= endMonthDate) {
        const year = iterDate.getFullYear();
        const month = iterDate.getMonth();
        const key = `${year}-${String(month + 1).padStart(2, '0')}`;
        
        lineDataMap[key] = { 
          value: 0, 
          label: `${monthNamesAbbr[month]}/${String(year).slice(2)}`
        };
        
        iterDate.setMonth(iterDate.getMonth() + 1);
      }

      filtered.forEach(post => {
        const date = new Date(post.created_at);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (lineDataMap[key] !== undefined) {
          lineDataMap[key].value++;
        } else {
          const month = date.getMonth();
          lineDataMap[key] = {
            value: 1,
            label: `${monthNamesAbbr[month]}/${String(date.getFullYear()).slice(2)}`
          };
        }
      });

      return Object.entries(lineDataMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([_, item]) => item);
    };

    const dayData = buildDayData();
    const weekData = buildWeekData();
    const monthData = buildMonthData();

    const lineLevels = [];
    if (dayData.length >= 2) lineLevels.push({ data: dayData, label: 'Diário' });
    if (weekData.length >= 2) lineLevels.push({ data: weekData, label: 'Semanal' });
    if (monthData.length >= 2) lineLevels.push({ data: monthData, label: 'Mensal' });

    // Fallback se nenhuma camada se qualificar
    if (lineLevels.length === 0 && dayData.length > 0) {
      lineLevels.push({ data: dayData, label: 'Diário' });
    }

    // 2. Dados para o Gráfico de Pizza (Sucesso por plataforma no período)
    const pieCounts: Record<string, number> = {};
    filtered.forEach(post => {
      if (post.status === 'posted' && post.platformsSuccess) {
        const successes = post.platformsSuccess.split(',').map(s => s.trim());
        successes.forEach(s => {
          if (selectedPlatform === 'Todos' || s === selectedPlatform) {
            pieCounts[s] = (pieCounts[s] || 0) + 1;
          }
        });
      }
    });

    const pieData = Object.entries(pieCounts).map(([name, count]) => {
      return {
        platformName: name,
        value: count,
        color: (colors as any)[name] || colors.primary,
        label: name === 'unknow' ? 'Desconhecido' : name,
      };
    });

    return { lineLevels, pieData };
  }, [history, startDate, endDate, selectedPlatform, colors]);

  const onChangeStart = (event: any, selectedDate?: Date) => {
    setShowStartPicker(false);
    if (selectedDate) setStartDate(selectedDate);
  };

  const onChangeEnd = (event: any, selectedDate?: Date) => {
    setShowEndPicker(false);
    if (selectedDate) setEndDate(selectedDate);
  };

  const showDatepicker = (isStart: boolean) => {
    if (isStart) setShowStartPicker(true);
    else setShowEndPicker(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Setor 1: Resumo Geral */}
        <StatisticsSummary platformCounts={statsSummary.platformCounts} periodStats={statsSummary.periodStats} />

        <View style={styles.divider} />

        {/* Setor 2: Filtros e Gráficos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Análise por Período</Text>

          <View style={styles.filterContainer}>
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => showDatepicker(true)}
                testID="btn-filter-start-date"
              >
                <Text style={[styles.dateButtonLabel, { color: colors.textSecondary }]}>Início</Text>
                <Text style={[styles.dateButtonValue, { color: colors.text }]}>
                  {startDate.toLocaleDateString('pt-BR')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => showDatepicker(false)}
                testID="btn-filter-end-date"
              >
                <Text style={[styles.dateButtonLabel, { color: colors.textSecondary }]}>Fim</Text>
                <Text style={[styles.dateButtonValue, { color: colors.text }]}>
                  {endDate.toLocaleDateString('pt-BR')}
                </Text>
              </TouchableOpacity>
            </View>

            <DropDownPicker
              open={openPlatform}
              value={selectedPlatform}
              items={platformItems}
              setOpen={setOpenPlatform}
              setValue={setSelectedPlatform}
              setItems={setPlatformItems}
              placeholder="Selecionar Plataforma"
              listMode="SCROLLVIEW"
              style={[styles.dropdown, { backgroundColor: colors.background, borderColor: colors.border }]}
              dropDownContainerStyle={[
                styles.dropdownContainer,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
              textStyle={{ color: colors.text }}
              arrowIconStyle={{ tintColor: colors.textSecondary }}
              tickIconStyle={{ tintColor: colors.primary }}
              testID="platform-filter-dropdown"
            />
          </View>

          <DateInput
            visible={showStartPicker}
            onClose={() => setShowStartPicker(false)}
            onSelect={(date) => setStartDate(date)}
            initialDate={startDate}
            maxDate={endDate}
            earliestYear={earliestYear}
          />

          <DateInput
            visible={showEndPicker}
            onClose={() => setShowEndPicker(false)}
            onSelect={(date) => setEndDate(date)}
            initialDate={endDate}
            minDate={startDate}
            maxDate={new Date()}
            earliestYear={earliestYear}
          />

          {/* Gráfico de Linha */}
          <Text style={styles.chartLabel}>Volume de Postagens por Período</Text>
          <LineChartComponent levels={chartData.lineLevels} />

          <View style={styles.divider} />

          {/* Gráfico de Pizza */}
          <Text style={styles.chartLabel}>Distribuição de Sucesso</Text>
          <PieChartComponent data={chartData.pieData} />
        </View>
      </ScrollView>

      <LoadingIndicator visible={isLoading} text="Processando estatísticas..." />
    </SafeAreaView>
  );
};

export default StatisticsScreen;
