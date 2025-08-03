import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sendChatMessage, subscribeToChatMessages } from '../firebase/config';

const ChatDebugger = ({ streamId }) => {
  const { currentUser, userProfile } = useAuth();
  const [debugInfo, setDebugInfo] = useState({});
  const [testMessage, setTestMessage] = useState('Test message');

  useEffect(() => {
    setDebugInfo({
      streamId,
      currentUser: currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName
      } : null,
      userProfile: userProfile ? {
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL
      } : null
    });
  }, [streamId, currentUser, userProfile]);

  const testSendMessage = async () => {
    if (!currentUser || !streamId) {
      alert('Missing currentUser or streamId');
      return;
    }

    try {
      const userInfo = {
        uid: currentUser.uid,
        displayName: userProfile?.displayName || currentUser.displayName,
        email: currentUser.email,
        photoURL: userProfile?.photoURL || currentUser.photoURL
      };

      console.log('Debug: Sending test message');
      await sendChatMessage(streamId, testMessage, userInfo);
      alert('Message sent successfully!');
    } catch (error) {
      console.error('Debug: Error sending message:', error);
      alert('Error: ' + error.message);
    }
  };

  const testListener = () => {
    if (!streamId) {
      alert('Missing streamId');
      return;
    }

    console.log('Debug: Setting up listener');
    const unsubscribe = subscribeToChatMessages(streamId, (messages) => {
      console.log('Debug: Received messages:', messages);
      alert(`Received ${messages.length} messages`);
    });

    setTimeout(() => {
      unsubscribe();
      console.log('Debug: Listener cleaned up');
    }, 5000);
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-sm">
      <h4 className="font-bold mb-2">Chat Debug</h4>
      
      <div className="text-xs mb-2">
        <strong>Stream ID:</strong> {streamId || 'None'}<br/>
        <strong>User:</strong> {currentUser?.email || 'None'}<br/>
        <strong>Display Name:</strong> {userProfile?.displayName || currentUser?.displayName || 'None'}
      </div>

      <div className="space-y-2">
        <input
          type="text"
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          className="w-full text-xs border rounded px-2 py-1"
          placeholder="Test message"
        />
        
        <div className="flex space-x-1">
          <button
            onClick={testSendMessage}
            className="bg-blue-500 text-white text-xs px-2 py-1 rounded"
          >
            Send Test
          </button>
          
          <button
            onClick={testListener}
            className="bg-green-500 text-white text-xs px-2 py-1 rounded"
          >
            Test Listener
          </button>
        </div>
      </div>

      <details className="mt-2">
        <summary className="text-xs cursor-pointer">Debug Info</summary>
        <pre className="text-xs mt-1 bg-gray-100 p-1 rounded overflow-auto max-h-32">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </details>
    </div>
  );
};

export default ChatDebugger;
