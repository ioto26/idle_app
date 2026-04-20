import React, { useState, useMemo, useEffect } from 'react';
import { 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  ScrollView,
  Linking,
  Alert
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { Calendar, DateData } from 'react-native-calendars';
import { useFanData } from '@/hooks/useFanData';
import { Colors, GroupThemes } from '@/constants/Theme';
import { BlurView } from 'expo-blur';
import { Plus, Search, X, Info } from 'lucide-react-native';
import { getPersonalEvents, addPersonalEvent, PersonalEvent, initDatabase } from '@/services/database';
import { format } from 'date-fns';

export default function ScheduleScreen() {
  const { data: fanData } = useFanData();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [personalEvents, setPersonalEvents] = useState<PersonalEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  
  // New Event Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(selectedDate);
  const [newTime, setNewTime] = useState('');
  const [newCategory, setNewCategory] = useState('Personal');

  useEffect(() => {
    const setup = async () => {
      await initDatabase();
      loadPersonalEvents();
    };
    setup();
  }, []);

  const loadPersonalEvents = async () => {
    const events = await getPersonalEvents();
    setPersonalEvents(events);
  };

  const handleAddEvent = async () => {
    if (!newTitle || !newDate) {
      Alert.alert('Error', 'Please fill in the title and date.');
      return;
    }

    await addPersonalEvent({
      title: newTitle,
      date: newDate,
      time: newTime,
      category: newCategory,
    });

    setNewTitle('');
    setNewTime('');
    setNewCategory('Personal');
    setIsAddModalVisible(false);
    loadPersonalEvents();
  };

  // Helper to extract time value for sorting
  const getTimeValue = (timeStr?: string) => {
    if (!timeStr) return 9999;
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      return parseInt(match[1]) * 60 + parseInt(match[2]);
    }
    return 9998; 
  };

  // Global Search Filter
  const filteredAllSchedules = useMemo(() => {
    if (!searchQuery) return [];
    
    const lowQuery = searchQuery.toLowerCase();
    const official = fanData?.schedule.filter(s => 
      s.title.toLowerCase().includes(lowQuery) || 
      s.category.toLowerCase().includes(lowQuery)
    ) || [];

    const personal = personalEvents.filter(e => 
      e.title.toLowerCase().includes(lowQuery) || 
      e.category.toLowerCase().includes(lowQuery)
    );

    const combined = [
      ...official.map(o => ({ ...o, type: 'official' as const })),
      ...personal.map(p => ({ ...p, type: 'personal' as const })),
    ];
    
    return combined.sort((a, b) => b.date.localeCompare(a.date));
  }, [fanData, personalEvents, searchQuery]);

  // Selected Day Filter
  const dailyEvents = useMemo(() => {
    const selectedKey = selectedDate.replace(/[^\d-]/g, '').trim();
    const official = fanData?.schedule.filter(s => s.date.replace(/[^\d-]/g, '') === selectedKey) || [];
    const personal = personalEvents.filter(e => e.date.replace(/[^\d-]/g, '') === selectedKey);
    
    const combined = [
      ...official.map(o => ({ ...o, type: 'official' as const })),
      ...personal.map(p => ({ ...p, type: 'personal' as const })),
    ];
    
    return combined.sort((a, b) => getTimeValue(a.time) - getTimeValue(b.time));
  }, [fanData, personalEvents, selectedDate]);

  const markedDates = useMemo(() => {
    const marks: any = {};
    
    fanData?.schedule.forEach(item => {
      const dateKey = item.date.replace(/[^\d-]/g, '').trim();
      if (!marks[dateKey]) marks[dateKey] = { dots: [] };
      const theme = GroupThemes[item.source as keyof typeof GroupThemes] || GroupThemes.nogizaka46;
      marks[dateKey].dots.push({ key: `${item.source}-${item.link}`, color: theme.primary });
    });

    personalEvents.forEach(event => {
      const dateKey = event.date.replace(/[^\d-]/g, '').trim();
      if (!marks[dateKey]) marks[dateKey] = { dots: [] };
      marks[dateKey].dots.push({ key: `p-${event.id}`, color: Colors.purple });
    });

    const selectedKey = selectedDate.replace(/[^\d-]/g, '').trim();
    if (!marks[selectedKey]) marks[selectedKey] = {};
    marks[selectedKey].selected = true;
    marks[selectedKey].selectedColor = Colors.purple;

    return marks;
  }, [fanData, personalEvents, selectedDate]);

  const renderEventItem = ({ item }: { item: any }) => {
    const theme = item.type === 'official' 
      ? (GroupThemes[item.source as keyof typeof GroupThemes] || GroupThemes.nogizaka46)
      : { primary: Colors.purple };

    return (
      <TouchableOpacity 
        onPress={() => item.link ? Linking.openURL(item.link) : null}
        disabled={!item.link}
      >
        <BlurView intensity={20} tint="dark" style={styles.eventCard}>
          <View style={styles.eventCardRow}>
            <View style={[styles.sourceBar, { backgroundColor: theme.primary }]} />
            <View style={styles.eventInfo}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventTime}>{item.time || 'All Day'}</Text>
                <View style={[styles.eventBadge, { backgroundColor: theme.primary + '33' }]}>
                  <Text style={[styles.eventBadgeText, { color: theme.primary }]}>{item.category}</Text>
                </View>
              </View>
              <Text style={styles.eventTitle}>{item.title}</Text>
              {searchQuery !== '' && <Text style={styles.eventDateLabel}>{item.date}</Text>}
            </View>
            {item.link && <Info size={16} color={Colors.textSecondary} />}
          </View>
        </BlurView>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Schedule</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => {
            setNewDate(selectedDate);
            setIsAddModalVisible(true);
          }}
        >
          <Plus size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <BlurView intensity={20} style={styles.searchBox}>
          <Search size={18} color={Colors.textSecondary} />
          <TextInput
            placeholder="Search all schedules..."
            placeholderTextColor={Colors.textSecondary}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </BlurView>
      </View>

      {searchQuery === '' ? (
        <>
          <Calendar
            current={selectedDate}
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: 'transparent',
              textSectionTitleColor: Colors.textSecondary,
              selectedDayBackgroundColor: Colors.purple,
              selectedDayTextColor: '#ffffff',
              todayTextColor: Colors.purple,
              dayTextColor: Colors.text,
              textDisabledColor: 'rgba(255,255,255,0.1)',
              dotColor: Colors.purple,
              selectedDotColor: '#ffffff',
              monthTextColor: Colors.text,
              indicatorColor: Colors.purple,
              arrowColor: Colors.purple,
            }}
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            markingType={'multi-dot'}
          />

          <View style={styles.eventListHeader}>
            <Text style={styles.eventListTitle}>{selectedDate.replace(/-/g, '/')} の予定</Text>
          </View>

          <FlatList
            data={dailyEvents}
            keyExtractor={(item, index) => `daily-${index}`}
            renderItem={renderEventItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>予定はありません</Text>
            }
          />
        </>
      ) : (
        <FlatList
          data={filteredAllSchedules}
          keyExtractor={(item, index) => `search-${index}`}
          renderItem={renderEventItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>該当する予定が見つかりません</Text>
          }
        />
      )}

      {/* Add Event Modal */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} tint="dark" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>自分の予定を追加</Text>
              <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                <X color={Colors.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>タイトル</Text>
                <TextInput
                  style={styles.input}
                  placeholder="例：ライブ参戦、グッズ発売..."
                  placeholderTextColor={Colors.textSecondary}
                  value={newTitle}
                  onChangeText={setNewTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>日付 (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2026-04-20"
                  placeholderTextColor={Colors.textSecondary}
                  value={newDate}
                  onChangeText={setNewDate}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>時間 (HH:MM)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="18:30"
                  placeholderTextColor={Colors.textSecondary}
                  value={newTime}
                  onChangeText={setNewTime}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>カテゴリー</Text>
                <TextInput
                  style={styles.input}
                  placeholder="例：LIVE, GOODS..."
                  placeholderTextColor={Colors.textSecondary}
                  value={newCategory}
                  onChangeText={setNewCategory}
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleAddEvent}>
                <Text style={styles.saveButtonText}>保存する</Text>
              </TouchableOpacity>
            </ScrollView>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  addButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchBox: {
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
  searchInput: {
    flex: 1,
    color: Colors.text,
    marginLeft: 10,
    fontSize: 16,
    height: '100%',
  },
  eventListHeader: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  eventListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  eventCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  eventCardRow: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceBar: {
    width: 4,
    height: '80%',
    borderRadius: 2,
    marginRight: 15,
  },
  eventInfo: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventTime: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  eventBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  eventBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  eventTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  eventDateLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 30,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 16,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  saveButton: {
    backgroundColor: Colors.purple,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 50,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
