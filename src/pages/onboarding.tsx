import React from 'react';
import { Box } from '@chakra-ui/react';
import OnboardingFlow from '../components/auth/OnboardingFlow';

const OnboardingPage: React.FC = () => {
  return (
    <Box p={8}>
      <OnboardingFlow />
    </Box>
  );
};

export default OnboardingPage; 