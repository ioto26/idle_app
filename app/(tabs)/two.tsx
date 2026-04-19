import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Linking,
  ScrollView,
  Alert
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { Calendar, DateData } from 'react-native-calendars';
import { useFanData, FanSchedule } from '@/hooks/useFanData';
import { getPersonalEvents, PersonalEvent, initDatabase } from '@/services/database';
import { Colors, GroupThemes } from '@/constants/Theme';
import { BlurView } from 'expo-blur';
import { Plus, Info } from 'lucide-react-native';
import { format } from 'date-fns';

export default function ScheduleScreen() {
  const { data: fanData } = useFanData();
  const [personalEvents, setPersonalEvents] = useState<PersonalEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

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

  useEffect(() => {
    console.log('FanData updated:', fanData?.schedule.length, 'schedule items');
  }, [fanData]);

  // Merge events for markers
  const markedDates = useMemo(() => {
    const marks: any = {};
    
    // Official Schedules
    fanData?.schedule.forEach(item => {
      // Final safety: remove anything that isn't a number or hyphen
      const dateKey = item.date.replace(/[^\d-]/g, '').trim(); 
        
      if (!marks[dateKey]) marks[dateKey] = { dots: [] };
      
      const theme = GroupThemes[item.source as keyof typeof GroupThemes] || GroupThemes.nogizaka46;
      marks[dateKey].dots.push({ 
        key: `${item.source}-${item.link}`, 
        color: theme.primary 
      });
    });

    // Personal Events
    personalEvents.forEach(event => {
      const dateKey = event.date.replace(/[^\d-]/g, '').trim();
      if (!marks[dateKey]) marks[dateKey] = { dots: [] };
      marks[dateKey].dots.push({ key: `p-${event.id}`, color: Colors.accent });
    });

    // Mark selected
    const selectedKey = selectedDate.replace(/[^\d-]/g, '').trim();
    if (marks[selectedKey]) {
      marks[selectedKey].selected = true;
      marks[selectedKey].selectedColor = Colors.purple;
    } else {
      marks[selectedKey] = { selected: true, selectedColor: Colors.purple };
    }

    return marks;
  }, [fanData, personalEvents, selectedDate]);

  // Filter events for selected day
  const dailyEvents = useMemo(() => {
    const selectedKey = selectedDate.replace(/[^\d-]/g, '').trim();
    const official = fanData?.schedule.filter(s => s.date.replace(/[^\d-]/g, '') === selectedKey) || [];
    const personal = personalEvents.filter(e => e.date.replace(/[^\d-]/g, '') === selectedKey);
    
    return [
      ...official.map(o => ({ ...o, type: 'official' })),
      ...personal.map(p => ({ ...p, type: 'personal' }))
    ];
  }, [fanData, personalEvents, selectedDate]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>スケジュール</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => Alert.alert("追加機能", "近日公開予定")}>
          <Plus size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <Calendar
        current={selectedDate}
        onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
        markedDates={markedDates}
        markingType={'multi-dot'}
        theme={{
          calendarBackground: Colors.background,
          textSectionTitleColor: Colors.textSecondary,
          selectedDayBackgroundColor: Colors.purple,
          selectedDayTextColor: '#ffffff',
          todayTextColor: Colors.accent,
          dayTextColor: Colors.text,
          textDisabledColor: '#444',
          dotColor: Colors.purple,
          monthTextColor: Colors.text,
          arrowColor: Colors.purple,
        }}
        style={styles.calendar}
      />

      <View style={styles.eventListHeader}>
        <Text style={styles.eventListTitle}>{selectedDate.replace('-', '/')} の予定</Text>
      </View>

      <FlatList
        data={dailyEvents}
        keyExtractor={(item, index) => `${index}`}
        renderItem={({ item }: { item: any }) => (
          <TouchableOpacity 
            onPress={() => item.link ? Linking.openURL(item.link) : null}
            disabled={!item.link}
          >
            <BlurView intensity={20} tint="dark" style={styles.eventCard}>
              <View style={styles.eventCardRow}>
                <View style={[
                  styles.eventTypeIndicator, 
                  { backgroundColor: item.type === 'personal' ? Colors.accent : (GroupThemes[item.source as keyof typeof GroupThemes]?.primary || Colors.purple) }
                ]} />
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTime}>{item.time || '終日'}</Text>
                  <Text style={styles.eventTitle}>{item.title}</Text>
                  <Text style={styles.eventCategory}>{item.category}</Text>
                </View>
                {item.link && <Info size={16} color={Colors.textSecondary} />}
              </View>
            </BlurView>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>予定はありません</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  calendar: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  eventListHeader: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: Colors.background,
  },
  eventListTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  eventCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
  },
  eventCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  eventTypeIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  eventTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  eventCategory: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'transparent',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
