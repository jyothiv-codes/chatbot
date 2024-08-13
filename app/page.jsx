'use client';
import { useState, useEffect, useRef } from 'react';
import { Box, Button, Stack, TextField, Dialog, DialogActions, DialogContent, DialogTitle, Rating } from '@mui/material';
import Header from './components/Header'; 
import { useRouter } from 'next/navigation';
import { firestore } from './firebase/config'; 
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import jsPDF from 'jspdf';

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! Share your questions in the chat below to fetch responses from the knowledge graph.\nYou can also generate a knowledge graph on a new topic, generate the chat's document or provide feedback.",
    },
  ]);

  //State variables for auth status, message, feedback, etc. 
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [openFeedbackDialog, setOpenFeedbackDialog] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComments, setFeedbackComments] = useState(''); 
  const [query, setQuery] = useState(''); 

  const router = useRouter();

  useEffect(() => {
    const checkLoginStatus = () => {
      const user = sessionStorage.getItem('user');
      if (user) {
        setIsLoggedIn(true);
        setUserEmail(user);
      }
    };

    checkLoginStatus();
  }, []);
  
  const handleLogout = () => {
    sessionStorage.removeItem('user');
    setIsLoggedIn(false);
    setUserEmail('');
    router.push('/sign-in');
  };

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;
    setIsLoading(true);
    setMessage('');
    setMessages((messages) => [
      ...messages,
      { role: 'user', content: message },
      { role: 'assistant', content: '' },
    ]);

    //for route.js within /api/chat folder
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([...messages, { role: 'user', content: message }]),
      });
  
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ];
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages((messages) => [
        ...messages,
        { role: 'assistant', content: "I'm sorry, but I encountered an error. Please try again later." },
      ]);
    }
    setIsLoading(false);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFeedbackOpen = () => {
    setOpenFeedbackDialog(true);
  };

  const handleFeedbackClose = () => {
    setOpenFeedbackDialog(false);
  };

  const handleFeedbackSubmit = async () => {
    if (feedbackRating > 0) {
      try {
        const userId = userEmail; 
        if (userId) {
          const feedbackCollectionRef = collection(firestore, 'users', userId, 'feedback');
          //rating and comments from the form, timestamp added from here
          await addDoc(feedbackCollectionRef, {
            rating: feedbackRating,
            comments: feedbackComments, 
            timestamp: Timestamp.fromDate(new Date()),
          });
          console.log('Feedback submitted successfully');
        } else {
          console.error('User ID is missing');
        }
      } catch (error) {
        console.error('Error submitting feedback:', error);
      }
    } else {
      console.error('Invalid feedback rating');
    }
    setOpenFeedbackDialog(false);
  };

  const handleGeneratePdf = () => {
    const doc = new jsPDF();
    let yOffset = 10;
    const lineHeight = 10;
    const maxWidth = 190; // Max width for text
    
    messages.forEach((message) => {
      const role = message.role === 'assistant' ? 'Assistant' : 'User';
      const text = `${role}: ${message.content}`;
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line) => {
        doc.text(line, 10, yOffset);
        yOffset += lineHeight;
      });
    });
    
    doc.save('chat_history.pdf');
    
  };
  
  const handleGenerateKnowledgeGraph = async () => {
    if (!query.trim()) {
      alert('Please enter a query.');
      return;
    }

    try {
      //for route.js within /api/graph folder
      const response = await fetch('/api/graph', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ kg_query: query }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate knowledge graph');
      }

      const data = await response.json();
      //console.log('Knowledge Graph Data:');
      console.log('Knowledge Graph Data:', data);
      // Handle the knowledge graph data as needed 

    } catch (error) {
      console.error('Error generating knowledge graph:', error);
    }
  };

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="row"
      bgcolor="white"
    >
      {/* Left Container for Buttons and Query Input */}
      <Box
        width="250px"
        display="flex"
        flexDirection="column"
        justifyContent="flex-start"
        padding={2}
        bgcolor="grey.200"
        borderRight="1px solid grey.500"
      >
        <TextField
          label="Enter Query"
          variant="outlined"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ marginBottom: 2 }}
        />
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleGenerateKnowledgeGraph}
          sx={{ marginBottom: 2 }}
        >
          Generate Knowledge Graph
        </Button>
        
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleGeneratePdf}
          sx={{ marginBottom: 2 }}
        >
          Generate Chat's Document
        </Button>
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleFeedbackOpen}
          sx={{ marginBottom: 2 }}
        >
          Provide Feedback
        </Button>
      </Box>
      
      {/* Main Chat Area */}
      <Box
        flexGrow={1}
        display="flex"
        flexDirection="column"
        width="calc(100% - 250px)" 
      >
        <Header isLoggedIn={isLoggedIn} userEmail={userEmail} onLogout={handleLogout} />
        {isLoggedIn && (
          <Stack
            direction="column"
            width="100%"
            height="calc(100% - 64px)"
            maxWidth="600px"
            margin="0 auto"
            spacing={2}
            padding={2}
            overflow="hidden"
          >
            <Box
              display="flex"
              flexDirection="column"
              justifyContent="space-between"
              height="100%"
              bgcolor="white"
              borderRadius={4}
              padding={2}
              boxShadow={1}
              border={1}
              borderColor="grey.500"
            >
              <Stack
                direction="column"
                spacing={2}
                flexGrow={1}
                overflow="auto"
              >
                {messages.map((message, index) => (
                  <Box
                    key={index}
                    display="flex"
                    justifyContent={
                      message.role === 'assistant' ? 'flex-start' : 'flex-end'
                    }
                  >
                    <Box
                      bgcolor={
                        message.role === 'assistant'
                          ? 'primary.main'
                          : '#6D6E70' 
                      }
                      color="white"
                      borderRadius={16}
                      padding={2}
                    >
                      {message.content}
                    </Box>
                  </Box>
                ))}
                <div ref={messagesEndRef} />
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center" marginTop={2}>
                <TextField
                  label="Message"
                  fullWidth
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                />
                <Button 
                  variant="contained" 
                  onClick={sendMessage}
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send'}
                </Button>
              </Stack>
            </Box>
          </Stack>
        )}
        
        {/* Feedback Dialog */}
        <Dialog open={openFeedbackDialog} onClose={handleFeedbackClose}>
          <DialogTitle>Provide Feedback</DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              <Rating
                name="feedback-rating"
                value={feedbackRating}
                onChange={(event, newValue) => setFeedbackRating(newValue)}
                size="large"
              />
              <TextField
                label="Additional Comments"
                multiline
                rows={4}
                fullWidth
                value={feedbackComments} 
                onChange={(e) => setFeedbackComments(e.target.value)} // Update the state
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleFeedbackClose}>Cancel</Button>
            <Button onClick={handleFeedbackSubmit}>Submit</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
