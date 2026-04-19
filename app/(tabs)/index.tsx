import { Text, View } from '@/components/Themed';
import { Colors, GroupThemes } from '@/constants/Theme';
import { FanNews, useFanData } from '@/hooks/useFanData';
import { BlurView } from 'expo-blur';
import { ChevronRight } from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  TouchableOpacity
} from 'react-native';

const NewsCard = ({ item }: { item: FanNews }) => {
  const theme = GroupThemes[item.source] || GroupThemes.nogizaka46;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => Linking.openURL(item.link)}
    >
      <BlurView intensity={20} tint="dark" style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: theme.primary }]}>
            <Text style={styles.badgeText}>{theme.name}</Text>
          </View>
          <Text style={styles.dateText}>{item.date}</Text>
        </View>
        <Text style={styles.categoryText}>{item.category}</Text>
        <Text style={styles.titleText} numberOfLines={2}>{item.title}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.readMore}>詳細を見る</Text>
          <ChevronRight size={16} color={Colors.textSecondary} />
        </View>
      </BlurView>
    </TouchableOpacity>
  );
};

export default function DashBoardScreen() {
  const { data, loading, refetch } = useFanData();

  const sortedNews = useMemo(() => {
    if (!data?.news) return [];
    // Sort by date (descending: newest first)
    return [...data.news].sort((a, b) => b.date.localeCompare(a.date));
  }, [data]);

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.purple} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedNews}
        keyExtractor={(item, index) => `${item.link}-${index}`}
        renderItem={({ item }) => <NewsCard item={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={Colors.purple} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>最新ニュース</Text>
            <Text style={styles.headerSubtitle}>お気に入りのアイドルの最新情報</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  card: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  dateText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  categoryText: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '600',
  },
  titleText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  readMore: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginRight: 4,
  },
});
