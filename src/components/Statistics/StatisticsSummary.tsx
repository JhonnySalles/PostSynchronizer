import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { SOCIAL_PLATFORMS } from '../../constants/platforms';
import Icon from 'react-native-vector-icons/Ionicons';

interface PlatformCount {
  platform: string;
  count: number;
}

interface PeriodStats {
  weekly: number;
  monthly: number;
  yearly: number;
}

interface StatisticsSummaryProps {
  platformCounts: PlatformCount[];
  periodStats: PeriodStats;
}

const StatisticsSummary: React.FC<StatisticsSummaryProps> = ({ platformCounts, periodStats }) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  
  const COLUMN_WIDTH = (width - 48) / 3;

  return (
    <View style={styles.container} testID="stats-summary-container">
      {/* Setor 1.1: Quantidade por plataforma */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Postagens por Plataforma</Text>
      <View style={styles.platformGrid}>
        {SOCIAL_PLATFORMS.map(platform => {
          const countData = platformCounts.find(p => p.platform === platform.name);
          return (
            <View
              key={platform.name}
              style={[styles.platformCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Icon name={platform.icon} size={24} color={(colors as any)[platform.name] || colors.primary} />
              <Text style={[styles.platformName, { color: colors.textSecondary }]}>{platform.name}</Text>
              <Text style={[styles.platformCount, { color: colors.primary }]} testID={`platform-count-${platform.name}`}>{countData?.count || 0}</Text>
            </View>
          );
        })}

        {/* Card para Desconhecido (apenas se houver dados) */}
        {(() => {
          const unknowData = platformCounts.find(p => p.platform === 'unknow');
          if (!unknowData || unknowData.count === 0) return null;
          return (
            <View
              key="unknow"
              style={[styles.platformCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Icon name="help-circle-outline" size={24} color={colors.unknow} />
              <Text style={[styles.platformName, { color: colors.textSecondary }]}>Desconhecido</Text>
              <Text style={[styles.platformCount, { color: colors.primary }]}>{unknowData.count}</Text>
            </View>
          );
        })()}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Setor 1.2: Valores Semanais, Mensais e Anuais */}
      <View style={styles.periodContainer}>
        <View style={[styles.periodCard, { backgroundColor: colors.card, width: COLUMN_WIDTH }]}>
          <Text style={[styles.periodLabel, { color: colors.textSecondary }]}>Semana</Text>
          <Text style={[styles.periodValue, { color: colors.primary }]} testID="stats-period-weekly">{periodStats.weekly}</Text>
        </View>
        <View style={[styles.periodCard, { backgroundColor: colors.card, width: COLUMN_WIDTH }]}>
          <Text style={[styles.periodLabel, { color: colors.textSecondary }]}>Mês</Text>
          <Text style={[styles.periodValue, { color: colors.primary }]} testID="stats-period-monthly">{periodStats.monthly}</Text>
        </View>
        <View style={[styles.periodCard, { backgroundColor: colors.card, width: COLUMN_WIDTH }]}>
          <Text style={[styles.periodLabel, { color: colors.textSecondary }]}>Ano</Text>
          <Text style={[styles.periodValue, { color: colors.primary }]} testID="stats-period-yearly">{periodStats.yearly}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  platformCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  platformName: {
    fontSize: 12,
    marginTop: 4,
  },
  platformCount: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 20,
  },
  periodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  periodCard: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  periodLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  periodValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default StatisticsSummary;
