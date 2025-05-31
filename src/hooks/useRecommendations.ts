// src/hooks/useRecommendations.ts
// This custom hook handles fetching personalized recommendations for the user.
// It interacts with the n8n recommendations workflow via the n8nWebhooks service.

import { useState, useCallback, useEffect } from 'react';
import { useErrorHandling } from './useErrorHandling';
import { requestRecommendations, requestAIRecommendations } from '../services/n8nWebhooks';
import { useAuth } from './useAuth';

// Define a type for the recommendation data structure
interface Recommendation {
  id: string;
  userId: string;
  type: 'nutrition' | 'exercise' | 'general';
  title: string;
  content: string;
  createdAt: string;
  source: 'ai' | 'system';
}

export const useRecommendations = () => {
  const { user, isAuthReady } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { handleError } = useErrorHandling();

  /**
   * Fetches both system and AI-generated recommendations for the current user.
   */
  const fetchRecommendations = useCallback(async () => {
    if (!user?.id) {
      setError('User not authenticated or user ID not available.');
      setRecommendations([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Fetch both system and AI recommendations in parallel
      const [systemResponse, aiResponse] = await Promise.all([
        requestRecommendations(user.id),
        requestAIRecommendations({
          user_id: user.id,
          created_at: new Date().toISOString(),
          context: {
            platform: 'web',
            source: 'recommendations'
          }
        })
      ]);

      // Combine and sort recommendations by creation date
      const allRecommendations = [
        ...(systemResponse.data || []).map((rec: Omit<Recommendation, 'source'>) => ({ ...rec, source: 'system' as const })),
        ...(aiResponse.data || []).map((rec: Omit<Recommendation, 'source'>) => ({ ...rec, source: 'ai' as const }))
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setRecommendations(allRecommendations);
    } catch (err) {
      handleError(err, 'Fetching recommendations');
      setError('Failed to fetch recommendations');
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, handleError]);

  // Automatically fetch recommendations when the user is authenticated and ready
  useEffect(() => {
    if (isAuthReady && user?.id) {
      fetchRecommendations();
    }
  }, [isAuthReady, user?.id, fetchRecommendations]);

  return {
    recommendations,
    isLoading,
    error,
    fetchRecommendations,
  };
};
