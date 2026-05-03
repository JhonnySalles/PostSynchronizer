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

    // 1. Dados para o Gráfico de Linha (Postagens por dia)
    const daysMap: Record<string, number> = {};
    const iterDate = new Date(startDate);
    const dayDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    while (iterDate <= endDate) {
      // Usar YYYY-MM-DD como chave interna para evitar colisões
      const isoKey = iterDate.toISOString().split('T')[0];
      daysMap[isoKey] = 0;
      iterDate.setDate(iterDate.getDate() + 1);
    }

    filtered.forEach(post => {
      const postIso = new Date(post.created_at).toISOString().split('T')[0];
      if (daysMap[postIso] !== undefined) {
        daysMap[postIso]++;
      }
    });

    const lineData = Object.entries(daysMap).map(([isoKey, value]) => {
      const [year, month, day] = isoKey.split('-');
      // Formato inteligente: dd/MM/yy se período curto (<= 7 dias) ou dd/MM se longo
      const label = dayDiff <= 7 ? `${day}/${month}/${year.slice(2)}` : `${day}/${month}`;
      return { label, value };
    });

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

    return { lineData, pieData };
  }, [history, startDate, endDate, selectedPlatform, colors.primary]);

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
              >
                <Text style={[styles.dateButtonLabel, { color: colors.textSecondary }]}>Início</Text>
                <Text style={[styles.dateButtonValue, { color: colors.text }]}>
                  {startDate.toLocaleDateString('pt-BR')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => showDatepicker(false)}
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
          <Text style={styles.chartLabel}>Volume de Postagens por Dia</Text>
          <LineChartComponent data={chartData.lineData} />

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
