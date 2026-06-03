import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// GET /api/dashboard/stats (assuming you create this, or fetch individually)
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/dashboard/stats');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useEmotionTimeline = () => {
  return useQuery({
    queryKey: ['emotion-timeline'],
    queryFn: async () => {
      const res = await api.get('/analytics/emotion-timeline');
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useDriftScore = () => {
  return useQuery({
    queryKey: ['drift-score'],
    queryFn: async () => {
      const res = await api.get('/analytics/drift-score');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useContentHistory = (params?: { page?: number, limit?: number }) => {
  return useQuery({
    queryKey: ['content-history', params],
    queryFn: async () => {
      const res = await api.get('/content/history', { params });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useRecommendations = (goal: string, limit: number = 8) => {
  return useQuery({
    queryKey: ['recommendations', goal, limit],
    queryFn: async () => {
      const res = await api.get('/recommendations', { params: { goal, limit } });
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useBookmarks = () => {
  return useQuery({
    queryKey: ['bookmarks'],
    queryFn: async () => {
      const res = await api.get('/bookmarks');
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useAddBookmark = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: any) => {
      const res = await api.post('/bookmarks', item);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    }
  });
};

export const useRemoveBookmark = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/bookmarks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    }
  });
};

export const useDailyPrompt = () => {
  return useQuery({
    queryKey: ['coach-daily-prompt'],
    queryFn: async () => {
      const res = await api.get('/coach/daily-prompt');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useCoachHistory = () => {
  return useQuery({
    queryKey: ['coach-history'],
    queryFn: async () => {
      const res = await api.get('/coach/conversation-history');
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useAchievements = () => {
  return useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const res = await api.get('/achievements');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useCircles = () => {
  return useQuery({
    queryKey: ['circles'],
    queryFn: async () => {
      const res = await api.get('/circles');
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useBlindSpot = () => {
  return useQuery({
    queryKey: ['blind-spot'],
    queryFn: async () => {
      const res = await api.post('/analytics/blind-spot');
      return res.data;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours — Gemini call, changes rarely
    gcTime: 24 * 60 * 60 * 1000,
  });
};

export const useAnnualReport = (year: number) => {
  return useQuery({
    queryKey: ['annual-report', year],
    queryFn: async () => {
      const res = await api.get('/reports/annual', { params: { year } });
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useWeeklyReport = () => {
  return useQuery({
    queryKey: ['weekly-report'],
    queryFn: async () => {
      const res = await api.get('/analytics/weekly-report');
      return res.data.data;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours — Gemini call, changes weekly
    gcTime: 24 * 60 * 60 * 1000,
  });
};

export const useUserProfile = () => {
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const res = await api.get('/user/profile');
      return res.data.profile;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useDeleteContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/content/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-history'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
  });
};
