import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback
} from 'react';
import io from 'socket.io-client';
import useSound from 'use-sound';
import config from '../../../config';
import LatestMessagesContext from '../../../contexts/LatestMessages/LatestMessages';
import TypingMessage from './TypingMessage';
import Header from './Header';
import Footer from './Footer';
import Message from './Message';
import '../styles/_messages.scss';

const socket = io(config.BOT_SERVER_ENDPOINT, {
  transports: ['websocket', 'polling', 'flashsocket']
});

const ME = 'me';
const BOT = 'bot';

function Messages() {
  const [messages, setMessages] = useState([
    {
      id: Date.now(),
      user: BOT,
      message: "Hi! My name's Botty."
    }
  ]);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messageListRef = useRef(null);
  const { setLatestMessage } = useContext(LatestMessagesContext);

  const [playSend] = useSound(config.SEND_AUDIO_URL);
  const [playReceive] = useSound(config.RECEIVE_AUDIO_URL);

  const scrollToBottom = () => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  };

  const sendMessage = useCallback(() => {
    if (!message.trim()) return;

    const newMessage = {
      id: Date.now(),
      user: ME,
      message
    };

    setMessages(prev => [...prev, newMessage]);
    setLatestMessage(message);
    setMessage('');
    playSend();

    try {
      socket.emit('user-message', message);
    } catch (err) {
      console.error('Failed to send message via socket:', err);
    }
  }, [message, setLatestMessage, playSend]);

  useEffect(() => {
    setLatestMessage("Hi! My name's Botty.");
  }, []);

  // Scroll when messages or typing indicator change
  useEffect(() => {
    const t = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(t);
  }, [messages, isTyping]);

  useEffect(() => {
    const handleTyping = () => {
      setIsTyping(true);

      // Fallback timeout in case bot-message fails
      setTimeout(() => setIsTyping(false), 5000);
    };

    const handleBotMessage = (message) => {
      const newMessage = {
        id: Date.now(),
        user: BOT,
        message
      };

      setIsTyping(false);
      setMessages(prev => [...prev, newMessage]);
      setLatestMessage(message);
      playReceive();
    };

    const handleSocketError = (err) => {
      console.error('Socket connection error:', err);
    };

    const handleDisconnect = (reason) => {
      console.warn('Socket disconnected:', reason);
    };

    socket.on('bot-typing', handleTyping);
    socket.on('bot-message', handleBotMessage);

    // error handling
    socket.on('connect_error', handleSocketError);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('bot-typing', handleTyping);
      socket.off('bot-message', handleBotMessage);
      
      // error handling
      socket.off('connect_error', handleSocketError);
      socket.off('disconnect', handleDisconnect);
    };
  }, [playReceive, setLatestMessage]);

  const onChangeMessage = (e) => setMessage(e.target.value);

  return (
    <div className="messages">
      <Header />
      <div className="messages__list" id="message-list" ref={messageListRef}>
        {messages.map((msg, idx) => (
          <Message
            key={msg.id}
            message={msg}
            nextMessage={messages[idx + 1]}
            botTyping={isTyping}
          />
        ))}
        {isTyping && <TypingMessage />}
      </div>
      <Footer
        message={message}
        sendMessage={sendMessage}
        onChangeMessage={onChangeMessage}
      />
    </div>
  );
}

export default Messages;
