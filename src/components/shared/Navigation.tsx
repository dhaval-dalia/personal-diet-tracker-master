import React from 'react';
import {
  Box,
  HStack,
  Text,
  Button,
  Link as ChakraLink,
  useColorModeValue,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';

const Navigation: React.FC = () => {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const bgColor = useColorModeValue('brand.700', 'brand.800');
  const textColor = useColorModeValue('white', 'whiteAlpha.900');

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  if (!user) return null;

  return (
    <Box bg={bgColor} py={4} px={8} boxShadow="md">
      <HStack spacing={8} justifyContent="space-between" alignItems="center">
        <Text fontSize="2xl" fontWeight="bold" color={textColor}>
          Fitness Tracker
        </Text>
        <HStack spacing={6}>
          <ChakraLink 
            onClick={() => handleNavigate('/dashboard')} 
            color={textColor}
            opacity={router.pathname === '/dashboard' ? 1 : 0.8}
            _hover={{ opacity: 1 }}
          >
            Dashboard
          </ChakraLink>
          <ChakraLink 
            onClick={() => handleNavigate('/log-meal')} 
            color={textColor}
            opacity={router.pathname === '/log-meal' ? 1 : 0.8}
            _hover={{ opacity: 1 }}
          >
            Log Meal
          </ChakraLink>
          <ChakraLink 
            onClick={() => handleNavigate('/profile')} 
            color={textColor}
            opacity={router.pathname === '/profile' ? 1 : 0.8}
            _hover={{ opacity: 1 }}
          >
            Profile
          </ChakraLink>
          <ChakraLink 
            onClick={() => handleNavigate('/goals')} 
            color={textColor}
            opacity={router.pathname === '/goals' ? 1 : 0.8}
            _hover={{ opacity: 1 }}
          >
            Goals
          </ChakraLink>
          <ChakraLink 
            onClick={() => handleNavigate('/preferences')} 
            color={textColor}
            opacity={router.pathname === '/preferences' ? 1 : 0.8}
            _hover={{ opacity: 1 }}
          >
            Preferences
          </ChakraLink>
        </HStack>
        <HStack>
          <Text color={textColor} opacity={0.7} fontSize="sm">
            Logged in as: {user.email}
          </Text>
          <Button
            onClick={() => signOut()}
            size="sm"
            colorScheme="red"
            variant="outline"
            borderColor="red.300"
            color="red.100"
            _hover={{ bg: 'red.600', color: 'white' }}
          >
            Logout
          </Button>
        </HStack>
      </HStack>
    </Box>
  );
};

export default Navigation; 