import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sendChatMessage, subscribeToChatMessages } from '../firebase/config';

const ChatDebug = ({ streamId }) => {
  const { currentUser, userProfile } = useAuth();
  const [debugInfo, setDebugInfo] = useState({});
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    const info = {
      streamId: streamId,
      currentUser: !!currentUser,
      userEmail: currentUser?.email,
      userDisplayName: currentUser?.displayName || userProfile?.displayName,
      timestamp: new Date().toISOString()
    };
    
    console.log('ChatDebug - Updated info:', info);
    setDebugInfo(info);

    // Test the listener
    if (streamId && currentUser) {
      console.log('ChatDebug - Testing listener setup...');
      const unsubscribe = subscribeToChatMessages(streamId, (messages) => {
        console.log('ChatDebug - Listener received messages:', messages);
        setDebugInfo(prev => ({ ...prev, messagesReceived: messages.length, lastUpdate: new Date().toISOString() }));
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [streamId, currentUser, userProfile]);

  const handleTestMessage = async () => {
    if (!testMessage.trim() || !currentUser || !streamId) return;

    try {
      console.log('ChatDebug - Sending test message...');
      const userInfo = {
        uid: currentUser.uid,
        displayName: userProfile?.displayName || currentUser.displayName,
        email: currentUser.email,
        photoURL: userProfile?.photoURL || currentUser.photoURL
      };

      await sendChatMessage(streamId, testMessage, userInfo);
      setTestMessage('');
      console.log('ChatDebug - Test message sent successfully');
    } catch (error) {
      console.error('ChatDebug - Error sending test message:', error);
      setDebugInfo(prev => ({ ...prev, lastError: error.message }));
    }
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg m-4">
      <h3 className="font-bold text-yellow-800 mb-2">Chat Debug Info</h3>
      <div className="text-sm space-y-1">
        <div><strong>Stream ID:</strong> {debugInfo.streamId || 'Not set'}</div>
        <div><strong>User Authenticated:</strong> {debugInfo.currentUser ? 'Yes' : 'No'}</div>
        <div><strong>User Email:</strong> {debugInfo.userEmail || 'Not available'}</div>
        <div><strong>Display Name:</strong> {debugInfo.userDisplayName || 'Not available'}</div>
        <div><strong>Messages Received:</strong> {debugInfo.messagesReceived || 0}</div>
        <div><strong>Last Update:</strong> {debugInfo.lastUpdate || 'Never'}</div>
        {debugInfo.lastError && <div className="text-red-600"><strong>Last Error:</strong> {debugInfo.lastError}</div>}
      </div>
      
      <div className="mt-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Test message..."
            className="flex-1 px-2 py-1 border rounded text-sm"
          />
          <button
            onClick={handleTestMessage}
            disabled={!testMessage.trim()}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm disabled:bg-gray-300"
          >
            Send Test
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatDebug;
