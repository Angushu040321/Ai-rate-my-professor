import { useState } from 'react';
import { Box, Button, Stack, TextField } from '@mui/material';
import { sendMessageToServer } from '../utils/api';

export default function ChatBox() {
  const [message, setMessage] = useState('');

  const sendMessage = async () => {
    await sendMessageToServer(message);
    setMessage('');
  };

  return (
    <Box>
      <TextField
        label="Message"
        fullWidth
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <Button variant="contained" onClick={sendMessage}>
        Send
      </Button>
    </Box>
  );
}
