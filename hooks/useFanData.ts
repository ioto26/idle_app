import { useState, useEffect } from 'react';

const DATA_URL = 'https://raw.githubusercontent.com/ioto26/idle_app/main/data/fan_data.json';

export interface FanNews {
  source: 'nogizaka46' | 'bokuao';
  date: string;
  title: string;
  category: string;
  link: string;
}

export interface FanSchedule {
  source: 'nogizaka46' | 'bokuao';
  date: string;
  time: string;
  title: string;
  category: string;
  link: string;
}

export interface FanData {
  news: FanNews[];
  schedule: FanSchedule[];
  last_updated: string;
}

export const useFanData = () => {
  const [data, setData] = useState<FanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(DATA_URL);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData };
};
