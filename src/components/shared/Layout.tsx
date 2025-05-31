import React from 'react';
import { Box, Flex } from '@chakra-ui/react';
import Navigation from './Navigation';
import ChatBot from './ChatBot';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <Flex direction="column" minH="100vh">
      <Navigation />
      <Box flex="1" p={8} bg="brand.50">
        {children}
      </Box>
      <Box bg="brand.900" py={4} px={8} textAlign="center" color="whiteAlpha.600" fontSize="sm">
        <Box>&copy; {new Date().getFullYear()} Personal Fitness Tracker. All rights reserved.</Box>
      </Box>
      <ChatBot />
    </Flex>
  );
};

export default Layout; 