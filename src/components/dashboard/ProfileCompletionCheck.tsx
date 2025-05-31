import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  VStack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';

interface ProfileCompletionCheckProps {
  onNavigate: (view: string) => void;
}

const ProfileCompletionCheck: React.FC<ProfileCompletionCheckProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          throw error;
        }

        if (data) {
          const missing: string[] = [];
          
          // Check required fields
          if (!data.full_name) missing.push('Full Name');
          if (!data.age) missing.push('Age');
          if (!data.gender) missing.push('Gender');
          if (!data.profession) missing.push('Profession');
          if (!data.work_hours) missing.push('Work Hours');
          if (!data.height_cm) missing.push('Height');
          if (!data.weight_kg) missing.push('Weight');
          if (!data.activity_level) missing.push('Activity Level');
          if (!data.dietary_restrictions) missing.push('Dietary Restrictions');
          if (!data.allergies) missing.push('Allergies');
          if (!data.medical_conditions) missing.push('Medical Conditions');
          if (!data.fitness_level) missing.push('Fitness Level');
          if (!data.goal_type) missing.push('Goals');
          if (!data.sleep_goal) missing.push('Sleep Hours');

          setMissingFields(missing);

          if (missing.length > 0) {
            toast({
              title: 'Complete Your Profile',
              description: `Please complete your profile by providing: ${missing.join(', ')}`,
              status: 'warning',
              duration: 5000,
              isClosable: true,
            });
          }
        }
      } catch (err) {
        console.error('Error in profile completion check:', err);
        toast({
          title: 'Error',
          description: 'Failed to check profile completion status',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkProfileCompletion();
  }, [user?.id, toast]);

  if (isLoading || missingFields.length === 0) {
    return null;
  }

  return (
    <Box
      p={6}
      borderRadius="lg"
      bg="whiteAlpha.700"
      boxShadow="lg"
      borderColor="brand.200"
      borderWidth={1}
      mb={8}
    >
      <VStack spacing={4}>
        <Text fontSize="xl" fontWeight="bold" color="text.dark">
          Complete Your Profile
        </Text>
        <Text color="text.light" textAlign="center">
          Please complete your profile to get the most out of your fitness journey.
          Missing information: {missingFields.join(', ')}
        </Text>
        <Button
          onClick={() => onNavigate('profile')}
          colorScheme="teal"
          variant="solid"
          bg="accent.500"
          color="white"
          _hover={{ bg: 'accent.600' }}
          size="lg"
        >
          Complete Profile
        </Button>
      </VStack>
    </Box>
  );
};

export default ProfileCompletionCheck; 