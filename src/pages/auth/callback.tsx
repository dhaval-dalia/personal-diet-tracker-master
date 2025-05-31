import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, Spinner, Center, Text } from '@chakra-ui/react';
import { supabase } from '../../services/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        if (session) {
          // Successful login
          router.push('/');
        } else {
          // No session found
          router.push('/login');
        }
      } catch (error) {
        console.error('Error handling auth callback:', error);
        router.push('/login');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
      <Center flexDirection="column" gap={4}>
        <Spinner size="xl" color="accent.500" />
        <Text color="text.light">Completing sign in...</Text>
      </Center>
    </Box>
  );
} 