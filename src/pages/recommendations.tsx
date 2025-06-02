import React, { useEffect, useState } from 'react';
import {
  Box, Heading, VStack, Spinner, Text, SimpleGrid, Card, CardHeader, CardBody, Button, useToast
} from '@chakra-ui/react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { motion } from 'framer-motion';

interface Recommendation {
  id: string;
  category: string;
  message: string;
  action?: string;
  actionText?: string;
  created_at: string;
  source?: string;
}

const RecommendationsPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!user?.id) throw new Error('You must be logged in to view recommendations.');
      
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_RECOMMENDATIONS_WEBHOOK_URL;
      if (!webhookUrl) {
        throw new Error('Webhook URL is not configured');
      }

      // Call the n8n webhook with user ID
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id } as { userId: string }),
      });

      if (!webhookResponse.ok) {
        throw new Error('Failed to trigger recommendations update');
      }

      // Fetch updated recommendations after webhook call
      const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRecommendations(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load recommendations');
      toast({
        title: 'Error',
        description: err.message || 'Failed to load recommendations',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
    // eslint-disable-next-line
  }, [user?.id]);

  // Group recommendations by category, filter duplicates, and limit to 3 per category
  const grouped = recommendations.reduce((acc: Record<string, Recommendation[]>, rec) => {
    const cat = rec.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    // Avoid duplicates by message
    if (!acc[cat].some(r => r.message === rec.message)) {
      acc[cat].push(rec);
    }
    // Keep only the latest 3
    acc[cat] = acc[cat].slice(0, 3);
    return acc;
  }, {});

  if (loading) {
    return <Box p={8} textAlign="center"><Spinner size="xl" /></Box>;
  }
  if (error) {
    return (
      <Box p={8} textAlign="center">
        <Text color="red.500" mb={4}>{error}</Text>
        <Button colorScheme="purple" onClick={fetchRecommendations}>Retry</Button>
      </Box>
    );
  }

  return (
    <Box p={8} position="relative">
      <Heading size="xl" mb={8} textAlign="center">Personalized Recommendations</Heading>
      <Button colorScheme="purple" mb={6} onClick={fetchRecommendations}>
        Refresh Recommendations
      </Button>
      <SimpleGrid columns={[1, 2, 3]} spacing={8}>
        {Object.entries(grouped).map(([category, recs]) => (
          <Card key={category} boxShadow="xl" borderRadius="lg" p={4}>
            <CardHeader>
              <Box>
                <Heading size="md" display="inline">
                  {category.toUpperCase()} {(() => {
                    if (category.toLowerCase() === 'fitness') return '🏋️';
                    if (category.toLowerCase() === 'nutrition') return '🥗';
                    if (category.toLowerCase() === 'lifestyle') return '🌱';
                    return '';
                  })()}
                </Heading>
                {recs[0].actionText && (
                  <Text as="span" fontSize="md" ml={2} display="inline" verticalAlign="middle">
                    {recs[0].actionText.charAt(0).toUpperCase() + recs[0].actionText.slice(1).toLowerCase()}
                  </Text>
                )}
                <Box mt={1}>
                  <Text as="cite" fontSize="xs" color="gray.500">
                    powered by {recs[0].source ? recs[0].source.charAt(0).toUpperCase() + recs[0].source.slice(1).toLowerCase() : 'Unknown'} • {new Date(recs[0].created_at).toLocaleString()}
                  </Text>
                </Box>
              </Box>
            </CardHeader>
            <CardBody>
              <VStack align="start" spacing={3}>
                {recs.map((rec) => (
                  <Box key={rec.id} bg="gray.50" p={3} borderRadius="md" w="100%">
                    <Text>{rec.message}</Text>
                    {rec.action && (
                      <Button
                        size="sm"
                        colorScheme="purple"
                        variant="outline"
                        mt={2}
                        onClick={() => {
                          if (rec.action?.startsWith('http')) {
                            window.open(rec.action, '_blank');
                          }
                        }}
                      >
                        {rec.actionText || 'Learn More'}
                      </Button>
                    )}
                  </Box>
                ))}
              </VStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>
      {/* Floating CTA Button with Namaskaram hands */}
      <Box position="fixed" right={6} bottom={6} zIndex={1000} display="flex" flexDirection="column" alignItems="center">
        {/* Namaskaram hands gesture (use a GIF or SVG) */}
        <motion.img
          src="/saurabh-banner-desktop.png"
          alt="Saurabh Banner"
          style={{ width: 56, height: 56, marginBottom: 8, borderRadius: '50%' }}
          initial={{ opacity: 0.3 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
        <Button
          colorScheme="pink"
          size="lg"
          borderRadius="full"
          boxShadow="lg"
          onClick={() => window.open('https://habuild.in/contactus', '_blank')}
          as={motion.button}
          whileHover={{ y: -4 }}
        >
          Curious to know more reach out!
        </Button>
      </Box>
    </Box>
  );
};

export default RecommendationsPage; 