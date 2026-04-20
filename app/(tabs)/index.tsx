import { Text, View } from '@/components/Themed';
import { Colors, GroupThemes } from '@/constants/Theme';
import { FanNews, useFanData } from '@/hooks/useFanData';
import { BlurView } from 'expo-blur';
import { ChevronRight, Search, X } from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  TextInput,
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

  const [searchQuery, setSearchQuery] = React.useState('');

  const sortedNews = useMemo(() => {
    if (!data?.news) return [];
    let filtered = [...data.news];

    if (searchQuery) {
      const lowQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(lowQuery) ||
        item.category.toLowerCase().includes(lowQuery)
      );
    }

    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }, [data, searchQuery]);

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.purple} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Feed</Text>
        <TouchableOpacity onPress={refetch} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>Reload</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <BlurView intensity={20} style={styles.searchBlur}>
          <Search size={18} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            placeholder="Search news..."
            placeholderTextColor={Colors.textSecondary}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </BlurView>
      </View>

      <FlatList
        data={sortedNews}
        keyExtractor={(item, index) => `${item.link}-${index}`}
        renderItem={({ item }) => <NewsCard item={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={Colors.purple} />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  refreshBtn: {
    padding: 8,
  },
  refreshText: {
    color: Colors.purple,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  searchBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 45,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    height: '100%',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
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
