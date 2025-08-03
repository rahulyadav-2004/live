import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sendChatMessage, subscribeToChatMessages, unsubscribeFromChat } from '../firebase/config';

const LiveChat = ({ streamId, demoMode = false, title = "Chat" }) => {
  const { currentUser, userProfile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const unsubscribeRef = useRef(null);

  // Demo messages for demo mode
  const demoMessages = [
    {
      id: 'demo1',
      userName: 'Alice',
      userAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b999?w=24&h=24&fit=crop&crop=face',
      message: 'Great stream! 🔥',
      timestamp: new Date(Date.now() - 300000) // 5 minutes ago
    },
    {
      id: 'demo2',
      userName: 'Bob',
      userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=24&h=24&fit=crop&crop=face',
      message: 'Love this content!',
      timestamp: new Date(Date.now() - 180000) // 3 minutes ago
    },
    {
      id: 'demo3',
      userName: 'Carol',
      userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=24&h=24&fit=crop&crop=face',
      message: 'Amazing quality! 👏',
      timestamp: new Date(Date.now() - 60000) // 1 minute ago
    }
  ];

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set up real-time chat listener
  useEffect(() => {
    if (demoMode) {
      setMessages(demoMessages);
      
      // Simulate new messages in demo mode
      const interval = setInterval(() => {
        const randomMessages = [
          'This is awesome! 🎉',
          'Keep it up!',
          'Great job! 👍',
          'Amazing stream!',
          'Love it! ❤️',
          'So cool! 😎',
          'Fantastic! ⭐',
          'Well done! 👏'
        ];
        
        const randomNames = ['Demo User', 'Test Viewer', 'Sample User', 'Guest User'];
        const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
        const randomMessage = randomMessages[Math.floor(Math.random() * randomMessages.length)];
        
        setMessages(prev => [...prev, {
          id: `demo-${Date.now()}`,
          userName: randomName,
          userAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(randomName)}&background=3F8AE0&color=fff`,
          message: randomMessage,
          timestamp: new Date()
        }]);
      }, 15000); // New message every 15 seconds
      
      return () => clearInterval(interval);
    }

    if (!streamId || !currentUser) {
      console.log('Chat: Missing streamId or currentUser', { streamId, currentUser: !!currentUser });
      return;
    }

    console.log('Chat: Setting up real-time listener for streamId:', streamId);

    // Subscribe to real-time chat messages
    const unsubscribe = subscribeToChatMessages(streamId, (newMessages) => {
      console.log('Chat: Received messages update:', newMessages);
      setMessages(newMessages);
    });

    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        console.log('Chat: Cleaning up listener');
        unsubscribeFromChat(unsubscribeRef.current);
      }
    };
  }, [streamId, currentUser, demoMode]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    if (demoMode) {
      // Add demo message immediately
      const userInfo = {
        displayName: 'Demo User',
        photoURL: 'https://ui-avatars.com/api/?name=Demo%20User&background=3F8AE0&color=fff'
      };
      
      setMessages(prev => [...prev, {
        id: `demo-sent-${Date.now()}`,
        userName: userInfo.displayName,
        userAvatar: userInfo.photoURL,
        message: newMessage,
        timestamp: new Date()
      }]);
      
      setNewMessage('');
      return;
    }

    if (!currentUser || !streamId) {
      console.error('Chat: Cannot send message - missing currentUser or streamId', { 
        currentUser: !!currentUser, 
        streamId 
      });
      return;
    }

    console.log('Chat: Sending message:', { streamId, message: newMessage });

    setIsSending(true);
    
    try {
      const userInfo = {
        uid: currentUser.uid,
        displayName: userProfile?.displayName || currentUser.displayName,
        email: currentUser.email,
        photoURL: userProfile?.photoURL || currentUser.photoURL
      };

      console.log('Chat: User info for message:', userInfo);

      await sendChatMessage(streamId, newMessage, userInfo);
      console.log('Chat: Message sent successfully');
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      // Show error to user
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-72 bg-white border-l border-gray-200 flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        {demoMode && (
          <p className="text-xs text-gray-500 mt-1">Demo Mode - Simulated chat</p>
        )}
      </div>

      {/* Messages List */}
      <div className="flex-1 p-4 space-y-3 text-sm overflow-y-auto max-h-96">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-xs py-8">
            <div className="text-2xl mb-2">💬</div>
            <p>No messages yet</p>
            <p>Be the first to say hello!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex items-start space-x-2">
              <img 
                src={message.userAvatar} 
                className="w-6 h-6 rounded-full flex-shrink-0" 
                alt={message.userName}
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(message.userName)}&background=3F8AE0&color=fff`;
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                  <span className="text-blue-600 font-medium text-xs truncate">
                    {message.userName}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
                <p className="text-gray-700 break-words">{message.message}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-4 border-t border-gray-100">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..." 
            className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:bg-white"
            disabled={isSending}
            maxLength={500}
          />
          <button 
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Send'
            )}
          </button>
        </form>
        {newMessage.length > 400 && (
          <p className="text-xs text-gray-500 mt-1">
            {500 - newMessage.length} characters remaining
          </p>
        )}
      </div>
    </div>
  );
};

export default LiveChat;
