import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DATA_URL = 'https://raw.githubusercontent.com/ioto26/idle_app/main/data/fan_data.json';
const SYNC_TASK_NAME = 'BACKGROUND_SYNC_TASK';
const STORAGE_KEY_LAST_IDS = 'last_processed_ids';

export interface FanData {
  news: any[];
  schedule: any[];
  last_updated: string;
}

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const registerBackgroundSync = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_TASK_NAME);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(SYNC_TASK_NAME, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log('Background Sync Task Registered');
    }
  } catch (err) {
    console.error('Task registration failed:', err);
  }
};

export const syncData = async () => {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) return BackgroundFetch.BackgroundFetchResult.Failed;
    
    const data: FanData = await response.json();
    const storedIdsJson = await AsyncStorage.getItem(STORAGE_KEY_LAST_IDS);
    const storedIds = storedIdsJson ? JSON.parse(storedIdsJson) : [];
    
    // Check for new news
    const newItems = data.news.filter(item => !storedIds.includes(item.link)).slice(0, 5);
    
    if (newItems.length > 0) {
      for (const item of newItems) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `[${item.source}] 新着ニュース`,
            body: item.title,
            data: { url: item.link },
          },
          trigger: null,
        });
      }
      
      // Update stored IDs
      const allIds = data.news.map(i => i.link);
      await AsyncStorage.setItem(STORAGE_KEY_LAST_IDS, JSON.stringify(allIds));
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('Sync failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
};

// Define the task
TaskManager.defineTask(SYNC_TASK_NAME, async () => {
  console.log('Running background sync...');
  return await syncData();
});
