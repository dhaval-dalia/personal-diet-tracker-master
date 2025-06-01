import React from 'react';
import { Box, HStack, Text, Button, Link } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';

const NavBar: React.FC = () => {
  const router = useRouter();
  const { user, signOut } = useAuth();

  return (
    <Box bg="brand.700" py={4} px={8} boxShadow="md">
      <HStack spacing={8} justifyContent="space-between" alignItems="center">
        <Text fontSize="2xl" fontWeight="bold" color="white">
          Fitness Tracker
        </Text>
        <HStack spacing={6}>
          <Link onClick={() => router.push('/dashboard')} color="whiteAlpha.800" _hover={{ textDecoration: 'underline' }} cursor="pointer">
            Dashboard
          </Link>
          <Link onClick={() => router.push('/log-meal')} color="whiteAlpha.800" _hover={{ textDecoration: 'underline' }} cursor="pointer">
            Log Meal
          </Link>
          <Link onClick={() => router.push('/profile')} color="whiteAlpha.800" _hover={{ textDecoration: 'underline' }} cursor="pointer">
            Profile
          </Link>
          <Link onClick={() => router.push('/goals')} color="whiteAlpha.800" _hover={{ textDecoration: 'underline' }} cursor="pointer">
            Goals
          </Link>
          <Link onClick={() => router.push('/preferences')} color="whiteAlpha.800" _hover={{ textDecoration: 'underline' }} cursor="pointer">
            Preferences
          </Link>
          <Link onClick={() => router.push('/recommendations')} color="whiteAlpha.800" _hover={{ textDecoration: 'underline' }} cursor="pointer">
            Recommendations
          </Link>
        </HStack>
        {user && (
          <HStack>
            <Text color="whiteAlpha.700" fontSize="sm">
              Logged in as: {user.email}
            </Text>
            <Button
              onClick={signOut}
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
        )}
      </HStack>
    </Box>
  );
};

export default NavBar; 