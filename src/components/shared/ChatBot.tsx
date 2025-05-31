import React, { useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  VStack,
  Text,
  Input,
  Button,
  Flex,
  HStack,
  useToast,
  SlideFade,
  useDisclosure,
  Avatar,
} from '@chakra-ui/react';
import { FaRobot, FaTimes, FaPaperPlane } from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import { processChatMessage } from '../../services/n8nWebhooks';

interface ChatMessage {
  text: string;
  isBot: boolean;
  metadata?: Record<string, any>;
  created_at?: string;
}

const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { isOpen, onToggle } = useDisclosure();
  const { user, isLoading } = useAuth();
  const toast = useToast();

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
        .limit(10);
      
      if (error) throw error;
      if (chatData) {
        setMessages(chatData.map(msg => ({
          text: msg.message,
          isBot: msg.is_bot,
          metadata: msg.metadata,
          created_at: msg.created_at
        })));
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !user?.id) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsProcessing(true);

    try {
      // Save user message to Supabase
      const { error: saveError } = await supabase
        .from('chat_interactions')
        .insert([{
          user_id: user.id,
          message: userMessage,
          is_bot: false,
          created_at: new Date().toISOString(),
          metadata: {}
        }]);

      if (saveError) throw new Error('Failed to save user message');

      // Add user message to UI
      const newMessages = [...messages, { 
        text: userMessage, 
        isBot: false,
        created_at: new Date().toISOString()
      }];
      setMessages(newMessages);

      // Process through n8n
      const response = await fetch('/api/n8n/chat-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          message: userMessage,
          created_at: new Date().toISOString(),
          context: {
            platform: 'web',
            source: 'chat-widget'
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from assistant');
      }

      const botResponse = await response.json();

      // Add bot response to UI
      setMessages([...newMessages, { 
        text: botResponse.message || botResponse.response, 
        isBot: true,
        created_at: new Date().toISOString(),
        metadata: botResponse.metadata
      }]);

    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: 'Error',
        description: 'Failed to process message. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setMessages([...messages, { 
        text: 'Sorry, I encountered an error. Please try again.', 
        isBot: true,
        created_at: new Date().toISOString()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Don't render anything if user is not authenticated or auth is still loading
  if (!user || isLoading) {
    return null;
  }

  return (
    <>
      {!isOpen && (
        <Box
          position="fixed"
          bottom="20px"
          right="20px"
          zIndex={1000}
        >
          <IconButton
            aria-label="Open chat"
            icon={<FaRobot />}
            onClick={onToggle}
            colorScheme="blue"
            size="lg"
            isRound
            boxShadow="lg"
            bg="blue.500"
            _hover={{ bg: 'blue.600' }}
          />
        </Box>
      )}

      <SlideFade in={isOpen} offsetY="20px">
        <Box
          position="fixed"
          bottom="20px"
          right="20px"
          width="350px"
          bg="white"
          borderRadius="lg"
          boxShadow="xl"
          borderWidth="1px"
          borderColor="gray.200"
          zIndex={1000}
        >
          <Flex
            p={4}
            bg="blue.500"
            color="white"
            borderTopRadius="lg"
            alignItems="center"
            justifyContent="space-between"
          >
            <Flex alignItems="center">
              <Avatar icon={<FaRobot />} size="sm" mr={2} />
              <Text fontWeight="bold">Fitness Assistant</Text>
            </Flex>
            <IconButton
              icon={<FaTimes />}
              aria-label="Close chatbot"
              variant="ghost"
              size="sm"
              onClick={onToggle}
            />
          </Flex>

          <Box h="400px" p={4} overflowY="auto">
            <VStack spacing={3} align="stretch">
              {messages.map((msg, index) => (
                <Box
                  key={index}
                  alignSelf={msg.isBot ? 'flex-start' : 'flex-end'}
                  bg={msg.isBot ? 'blue.50' : 'green.50'}
                  p={3}
                  borderRadius="lg"
                  maxWidth="80%"
                >
                  <Text fontSize="sm" color="gray.600">
                    {msg.isBot ? 'Assistant' : 'You'}
                  </Text>
                  <Text>{msg.text}</Text>
                  {msg.metadata && Object.keys(msg.metadata).length > 0 && (
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      {JSON.stringify(msg.metadata)}
                    </Text>
                  )}
                </Box>
              ))}
              {isProcessing && (
                <Box
                  alignSelf="flex-start"
                  bg="blue.50"
                  p={3}
                  borderRadius="lg"
                  maxWidth="80%"
                >
                  <Text fontSize="sm" color="gray.800">
                    Analyzing...
                  </Text>
                </Box>
              )}
            </VStack>
          </Box>

          <Flex p={4} borderTopWidth="1px">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about nutrition, workouts, or goals..."
              size="sm"
              mr={2}
              onKeyPress={handleKeyPress}
            />
            <Button
              colorScheme="blue"
              size="sm"
              onClick={handleSendMessage}
              isLoading={isProcessing}
              leftIcon={<FaPaperPlane />}
            >
              Send
            </Button>
          </Flex>
        </Box>
      </SlideFade>
    </>
  );
};

export default ChatBot; 