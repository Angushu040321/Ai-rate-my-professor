import { useState } from 'react';

export default function VoiceInput() {
  const [isListening, setIsListening] = useState(false);

  const handleSpeechRecognition = () => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
    };

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  return (
    <button onClick={handleSpeechRecognition}>
      {isListening ? 'Listening...' : 'Speak'}
    </button>
  );
}
