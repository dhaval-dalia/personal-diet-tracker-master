// src/components/dashboard/DailyOverview.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  VStack,
  Divider,
  Progress,
  IconButton,
  useToast,
  HStack,
  Textarea,
  Button,
  useColorModeValue,
  Icon
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { z } from 'zod';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { FiSend, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { processChatMessage as processN8nMessage } from '../../services/n8nWebhooks';
import { FaUtensils, FaFire, FaDrumstickBite, FaAppleAlt, FaFish } from 'react-icons/fa';

type AppView = 'login' | 'signup' | 'onboarding' | 'dashboard' | 'log-meal' | 'profile' | 'goals' | 'preferences';

interface DailyData {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface UserGoals {
  target_calories?: number;
  target_protein_ratio?: number;
  target_carbs_ratio?: number;
  target_fat_ratio?: number;
  target_weight_kg?: number;
  created_at?: string;
  updated_at?: string;
}

interface DailyOverviewProps {
  data?: DailyData | null;
  goals?: UserGoals | null;
  onNavigate: (view: AppView) => void;
  mealLogs?: Array<{
    total_calories: number;
    protein: number;
    carbs: number;
    fat: number;
    created_at: string;
  }>;
}

interface ChatMessageData {
  user_id: string;
  message: string;
  is_bot: boolean;
  created_at: string;
  response?: any;
  metadata?: Record<string, any>;
  confirmed?: boolean;
}

const logDetailsSchema = z.object({
  calories: z.number().min(0, 'Calories cannot be negative'),
  protein: z.number().min(0, 'Protein cannot be negative'),
  carbs: z.number().min(0, 'Carbs cannot be negative'),
  fat: z.number().min(0, 'Fat cannot be negative'),
});

const WavingBot = () => (
  <motion.div
    initial={{ rotate: 0 }}
    animate={{ rotate: [0, 10, -10, 10, 0] }}
    transition={{
      duration: 1,
      repeat: Infinity,
      repeatDelay: 2
    }}
    style={{ display: 'inline-block' }}
  >
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"
        fill="currentColor"
      />
      <path
        d="M8.5 14C9.33 14 10 13.33 10 12.5C10 11.67 9.33 11 8.5 11C7.67 11 7 11.67 7 12.5C7 13.33 7.67 14 8.5 14ZM15.5 14C16.33 14 17 13.33 17 12.5C17 11.67 16.33 11 15.5 11C14.67 11 14 11.67 14 12.5C14 13.33 14.67 14 15.5 14Z"
        fill="currentColor"
      />
      <path
        d="M12 17.5C14.33 17.5 16.31 16.04 17.11 14H6.89C7.69 16.04 9.67 17.5 12 17.5Z"
        fill="currentColor"
      />
    </svg>
  </motion.div>
);

const DailyOverview: React.FC<DailyOverviewProps> = ({ data, goals: initialGoals, onNavigate, mealLogs = [] }) => {
  const { user } = useAuth();
  const [chatMessages, setChatMessages] = useState<ChatMessageData[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingResponse, setPendingResponse] = useState<any>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [goals, setGoals] = useState<UserGoals | null>(initialGoals || null);
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const iconColor = useColorModeValue('teal.500', 'teal.300');

  useEffect(() => {
    const fetchLatestGoals = async () => {
      if (!user?.id) return;

      try {
        const { data: goalsData, error } = await supabase
          .from('user_goals')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching goals:', error);
          return;
        }

        if (goalsData) {
          setGoals(goalsData);
        }
      } catch (err) {
        console.error('Error in fetchLatestGoals:', err);
      }
    };

    fetchLatestGoals();

    const goalsSubscription = supabase
      .channel('public:user_goals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_goals',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          if (payload.new) {
            setGoals(payload.new as UserGoals);
          }
        }
      )
      .subscribe();

    return () => {
      goalsSubscription.unsubscribe();
    };
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchChatHistory();
    }
  }, [user?.id]);

  const fetchChatHistory = async () => {
    if (!user?.id) return;
    try {
      const { data: chatData, error } = await supabase
        .from('chat_interactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50);
      
      if (error) throw error;
      if (chatData) {
        setChatMessages(chatData);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  const processChatMessage = async (message: string) => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // First save the user message to database
      const { error: saveError } = await supabase
        .from('chat_interactions')
        .insert([{
          user_id: user.id,
          message: message,
          confirmed: true,
          created_at: new Date().toISOString(),
          metadata: {}
        }]);

      if (saveError) {
        throw new Error('Failed to save initial chat interaction');
      }

      // Then process through n8n
      const botResponse = await processN8nMessage({
        user_id: user.id,
        message,
        created_at: new Date().toISOString(),
        context: {
          platform: 'web',
          source: 'chat-widget'
        }
      });

      setPendingResponse(botResponse);
      
      // Save the bot response
      const { error: botSaveError } = await supabase
        .from('chat_interactions')
        .insert([{
          user_id: user.id,
          message: botResponse.message,
          response: botResponse,
          confirmed: true,
          created_at: new Date().toISOString(),
          metadata: botResponse.metadata || {}
        }]);

      if (botSaveError) {
        throw new Error('Failed to save bot response');
      }

      // Update chat messages state
      setChatMessages(prev => [
        ...prev,
        {
          user_id: user.id,
          message: message,
          is_bot: false,
          created_at: new Date().toISOString(),
          metadata: {}
        },
        {
          user_id: user.id,
          message: botResponse.message,
          is_bot: true,
          created_at: new Date().toISOString(),
          response: botResponse,
          metadata: botResponse.metadata || {}
        }
      ]);
      
    } catch (error) {
      console.error('Error processing message:', error);
      toast({
        title: 'Error',
        description: 'Failed to process message. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveChatInteraction = async (userMessage: string, botResponse: any) => {
    if (!user?.id) return;

    try {
      const userMessageData = {
        message: userMessage,
        created_at: new Date().toISOString(),
        metadata: {}
      };

      const botMessageData = {
        message: botResponse.message,
        created_at: new Date().toISOString(),
        metadata: botResponse.metadata || {}
      };

      const response = await fetch('/api/save-chat-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          userMessage: userMessageData,
          botResponse: botMessageData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save chat data');
      }

      setChatMessages(prev => [
        ...prev,
        {
          user_id: user.id,
          message: userMessage,
          is_bot: false,
          created_at: userMessageData.created_at,
          metadata: {}
        },
        {
          user_id: user.id,
          message: botResponse.message,
          is_bot: true,
          created_at: botMessageData.created_at,
          metadata: botResponse.metadata || {}
        }
      ]);
      
      setPendingResponse(null);

    } catch (error) {
      console.error('Error saving chat interaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to save chat message. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.id) return;

    const userMessage = newMessage.trim();
    setNewMessage('');
    setIsLoading(true);

    try {
      await processChatMessage(userMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!data) {
    return (
      <Box
        p={8}
        maxWidth="900px"
        borderWidth={1}
        borderRadius="lg"
        boxShadow="lg"
        bg="whiteAlpha.700"
        borderColor="brand.200"
        mx="auto"
        my={8}
        textAlign="center"
      >
        <Text color="gray.500" fontStyle="italic" fontSize="lg">
          No summary data available for today. Keep logging your meals to see insights!
        </Text>
      </Box>
    );
  }

  const currentCalories = data.calories || 0;
  const targetCalories = goals?.target_calories || 2000;
  const caloriesProgress = (currentCalories / targetCalories) * 100;

  const getMacroProgress = (current: number, targetRatio: number | undefined, totalCalories: number) => {
    if (!targetRatio || totalCalories === 0) return 0;
    const targetGrams = (targetRatio / 100) * totalCalories / (targetRatio === goals?.target_fat_ratio ? 9 : 4);
    return (current / targetGrams) * 100;
  };

  const proteinProgress = getMacroProgress(data.protein || 0, goals?.target_protein_ratio, currentCalories);
  const carbsProgress = getMacroProgress(data.carbs || 0, goals?.target_carbs_ratio, currentCalories);
  const fatProgress = getMacroProgress(data.fat || 0, goals?.target_fat_ratio, currentCalories);

  // Calculate today's totals
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = mealLogs.filter(log => 
    new Date(log.created_at).toISOString().split('T')[0] === today
  );

  const totals = todayLogs.reduce((acc, log) => ({
    calories: acc.calories + (log.total_calories || 0),
    protein: acc.protein + (log.protein || 0),
    carbs: acc.carbs + (log.carbs || 0),
    fat: acc.fat + (log.fat || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Calculate percentages
  const percentages = {
    calories: goals?.target_calories ? (totals.calories / goals.target_calories) * 100 : 0,
    protein: goals?.target_protein_ratio ? (totals.protein / (goals.target_protein_ratio * totals.calories / 400)) * 100 : 0,
    carbs: goals?.target_carbs_ratio ? (totals.carbs / (goals.target_carbs_ratio * totals.calories / 400)) * 100 : 0,
    fat: goals?.target_fat_ratio ? (totals.fat / (goals.target_fat_ratio * totals.calories / 900)) * 100 : 0
  };

  const metrics = [
    {
      label: 'Calories',
      value: totals.calories,
      target: goals?.target_calories,
      unit: 'kcal',
      icon: FaFire,
      percentage: percentages.calories
    },
    {
      label: 'Protein',
      value: totals.protein,
      target: goals?.target_protein_ratio ? (goals.target_protein_ratio * totals.calories / 400) : 0,
      unit: 'g',
      icon: FaDrumstickBite,
      percentage: percentages.protein
    },
    {
      label: 'Carbs',
      value: totals.carbs,
      target: goals?.target_carbs_ratio ? (goals.target_carbs_ratio * totals.calories / 400) : 0,
      unit: 'g',
      icon: FaAppleAlt,
      percentage: percentages.carbs
    },
    {
      label: 'Fat',
      value: totals.fat,
      target: goals?.target_fat_ratio ? (goals.target_fat_ratio * totals.calories / 900) : 0,
      unit: 'g',
      icon: FaFish,
      percentage: percentages.fat
    }
  ];

  return (
    <>
      <Box
        p={8}
        maxWidth="900px"
        borderWidth={1}
        borderRadius="lg"
        boxShadow="lg"
        bg={bgColor}
        borderColor="brand.200"
        mx="auto"
        my={8}
      >
        <VStack gap={6} align="stretch">
          <Heading as="h2" size="xl" textAlign="center" color={textColor}>
            Daily Overview - {format(new Date(), 'EEEE, MMM d, yyyy')}
          </Heading>

          <Divider borderColor="brand.100" />

          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Text color="text.light" fontSize="sm">
                Track your daily nutritional intake
              </Text>
            </VStack>
            <Button
              onClick={() => onNavigate('log-meal')}
              colorScheme="teal"
              variant="outline"
              size="sm"
              leftIcon={<FaUtensils />}
            >
              Log Meal
            </Button>
          </HStack>

          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            {metrics.map((metric) => (
              <Box
                key={metric.label}
                p={4}
                bg={bgColor}
                borderRadius="md"
                boxShadow="sm"
              >
                <HStack spacing={3} mb={2}>
                  <Icon as={metric.icon} color={iconColor} />
                  <Text fontWeight="semibold" color={textColor}>{metric.label}</Text>
                </HStack>
                <VStack align="start" spacing={1}>
                  <Text fontSize="xl" fontWeight="bold" color={textColor}>
                    {metric.value.toFixed(0)} {metric.unit}
                  </Text>
                  {metric.target && (
                    <Text fontSize="sm" color={textColor}>
                      Target: {metric.target.toFixed(0)} {metric.unit}
                    </Text>
                  )}
                  <Text fontSize="sm" color={textColor}>
                    {metric.percentage.toFixed(1)}% of daily goal
                  </Text>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>

          <Divider borderColor="brand.100" />

          <Box>
            <Heading as="h3" size="md" mb={3} color={textColor}>
              Goals Summary
            </Heading>
            {goals ? (
              <VStack align="flex-start" gap={2} color={textColor}>
                <Text>
                  <Text as="span" fontWeight="semibold">Target Weight:</Text>{' '}
                  {goals.target_weight_kg ? `${goals.target_weight_kg} kg` : 'Not set'}
                </Text>
                <Text>
                  <Text as="span" fontWeight="semibold">Target Calories:</Text>{' '}
                  {goals.target_calories ? `${goals.target_calories} kcal` : 'Not set'}
                </Text>
                <Text>
                  <Text as="span" fontWeight="semibold">Macro Ratios:</Text>{' '}
                  {goals.target_protein_ratio ? `${(goals.target_protein_ratio * 100).toFixed(1)}% Protein` : '--'}
                  {goals.target_carbs_ratio ? `, ${(goals.target_carbs_ratio * 100).toFixed(1)}% Carbs` : ''}
                  {goals.target_fat_ratio ? `, ${(goals.target_fat_ratio * 100).toFixed(1)}% Fat` : ''}
                </Text>
              </VStack>
            ) : (
              <Text color="text.light">No goals set yet. Visit your profile to set them!</Text>
            )}
          </Box>
        </VStack>
      </Box>

      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isChatOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              zIndex: 1000
            }}
          >
            <Box
              position="relative"
              _hover={{ transform: 'scale(1.05)' }}
              transition="transform 0.2s"
            >
              <IconButton
                aria-label="Open chat"
                icon={<WavingBot />}
                onClick={() => setIsChatOpen(true)}
                colorScheme="blue"
                size="lg"
                isRound
                boxShadow="lg"
                bg="blue.500"
                _hover={{ bg: 'blue.600' }}
                position="relative"
              />
              <Box
                position="absolute"
                top="-8px"
                right="-8px"
                bg="red.500"
                color="white"
                borderRadius="full"
                width="20px"
                height="20px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="xs"
                fontWeight="bold"
                boxShadow="md"
              >
                {chatMessages.length > 0 ? '1' : ''}
              </Box>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              width: '350px',
              height: '500px',
              zIndex: 1000
            }}
          >
            <Box
              bg="white"
              borderRadius="lg"
              boxShadow="2xl"
              display="flex"
              flexDirection="column"
              overflow="hidden"
              height="100%"
            >
              {/* Chat Header */}
              <Box
                p={4}
                bg="blue.500"
                color="white"
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <HStack spacing={2}>
                  <WavingBot />
                  <Heading size="sm">Fitness Assistant</Heading>
                </HStack>
                <IconButton
                  aria-label="Close chat"
                  icon={<FiX />}
                  onClick={() => setIsChatOpen(false)}
                  variant="ghost"
                  color="white"
                  _hover={{ bg: 'blue.600' }}
                  size="sm"
                />
              </Box>

              {/* Chat Messages */}
              <Box
                flex="1"
                overflowY="auto"
                p={4}
                bg="gray.50"
              >
                {chatMessages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Box
                      mb={3}
                      p={3}
                      bg={msg.is_bot ? "blue.50" : "green.50"}
                      borderRadius="md"
                      alignSelf={msg.is_bot ? "flex-start" : "flex-end"}
                      maxW="80%"
                      ml={msg.is_bot ? 0 : "auto"}
                    >
                      <Text fontSize="sm" color="gray.600">
                        {msg.is_bot ? "Assistant" : "You"}
                      </Text>
                      <Text>{msg.message}</Text>
                      {msg.metadata && Object.keys(msg.metadata).length > 0 && (
                        <Text fontSize="xs" color="gray.500" mt={1}>
                          {JSON.stringify(msg.metadata)}
                        </Text>
                      )}
                    </Box>
                  </motion.div>
                ))}
                {pendingResponse && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Box
                      mb={3}
                      p={3}
                      bg="blue.50"
                      borderRadius="md"
                      alignSelf="flex-start"
                      maxW="80%"
                    >
                      <Text fontSize="sm" color="gray.600">Assistant</Text>
                      <Text>{pendingResponse.message}</Text>
                    </Box>
                  </motion.div>
                )}
              </Box>

              {/* Chat Input */}
              <Box
                p={4}
                bg="white"
                borderTop="1px"
                borderColor="gray.200"
              >
                <HStack>
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    size="sm"
                    resize="none"
                    rows={2}
                  />
                  <IconButton
                    aria-label="Send message"
                    icon={<FiSend />}
                    onClick={handleSendMessage}
                    isLoading={isLoading}
                    colorScheme="blue"
                  />
                </HStack>
              </Box>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DailyOverview;
