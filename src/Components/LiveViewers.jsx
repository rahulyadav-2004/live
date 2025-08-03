import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToStreamParticipants, unsubscribeFromParticipants } from '../firebase/config';

const LiveViewers = ({ streamId, demoMode = false, title = "Viewers" }) => {
  const { currentUser, userProfile } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [streamData, setStreamData] = useState(null);
  const unsubscribeRef = useRef(null);

  // Mock viewers for demo mode
  const mockViewers = [
    { id: 1, name: "Alice Smith", avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b999?w=40&h=40&fit=crop&crop=face", role: "viewer" },
    { id: 2, name: "Bob Johnson", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face", role: "viewer" },
    { id: 3, name: "Carol Davis", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face", role: "viewer" },
    { id: 4, name: "David Wilson", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face", role: "viewer" },
    { id: 5, name: "Emma Brown", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=40&h=40&fit=crop&crop=face", role: "viewer" },
    { id: 6, name: "Frank Miller", avatar: "https://images.unsplash.com/photo-1489980557514-251d61e3eeb6?w=40&h=40&fit=crop&crop=face", role: "viewer" },
  ];

  // Set up real-time participants listener
  useEffect(() => {
    console.log('LiveViewers useEffect triggered:', { streamId, currentUser: !!currentUser, demoMode });
    
    if (demoMode) {
      console.log('Setting demo viewers:', mockViewers.length);
      setParticipants(mockViewers);
      setViewerCount(mockViewers.length);
      
      // Simulate viewer count changes in demo mode
      const interval = setInterval(() => {
        setViewerCount(prev => Math.max(1, prev + Math.floor(Math.random() * 3) - 1));
      }, 8000);
      
      return () => clearInterval(interval);
    }

    if (!streamId) {
      console.log('Missing streamId for participants listener');
      return;
    }

    console.log('Setting up real-time participants listener for streamId:', streamId);

    // Subscribe to real-time participant updates
    const unsubscribe = subscribeToStreamParticipants(streamId, ({ participants: newParticipants, viewerCount: newViewerCount, streamData: newStreamData }) => {
      console.log('Participants update received:', { 
        participants: newParticipants.length, 
        viewerCount: newViewerCount,
        streamData: !!newStreamData 
      });
      
      setParticipants(newParticipants);
      setViewerCount(newViewerCount);
      setStreamData(newStreamData);
    });

    if (!unsubscribe) {
      console.error('Failed to set up participants listener - unsubscribe is null');
      return;
    }

    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up participants listener');
      if (unsubscribeRef.current) {
        unsubscribeFromParticipants(unsubscribeRef.current);
      }
    };
  }, [streamId, demoMode]);

  const formatJoinTime = (joinedAt) => {
    if (!joinedAt) return '';
    const date = new Date(joinedAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'broadcaster':
        return 'text-red-600 bg-red-100';
      case 'moderator':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'broadcaster':
        return 'HOST';
      case 'moderator':
        return 'MOD';
      default:
        return 'VIEWER';
    }
  };

  return (
    <div className="flex-1 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">
          {title} ({demoMode ? mockViewers.length : viewerCount})
        </h3>
        {!demoMode && streamData?.isLive && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-red-500 font-medium">LIVE</span>
          </div>
        )}
      </div>

      {/* Participants List */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {participants.length === 0 && !demoMode ? (
          <div className="text-center text-gray-500 text-xs py-8">
            <div className="text-2xl mb-2">👥</div>
            <p>No viewers yet</p>
            <p>Share your stream to get viewers!</p>
          </div>
        ) : (
          participants.map((participant, index) => (
            <div 
              key={participant.id || participant.userId || index} 
              className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="relative">
                <img 
                  src={participant.avatar || participant.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(participant.name || participant.userName || 'User')}&background=3F8AE0&color=fff`} 
                  alt={participant.name || participant.userName}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(participant.name || participant.userName || 'User')}&background=3F8AE0&color=fff`;
                  }}
                />
                {/* Online indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {participant.name || participant.userName || 'Anonymous User'}
                  </p>
                  <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${getRoleColor(participant.role)}`}>
                    {getRoleLabel(participant.role)}
                  </span>
                </div>
                {(participant.joinedAt || participant.createdAt) && (
                  <p className="text-xs text-gray-500">
                    Joined {formatJoinTime(participant.joinedAt || participant.createdAt)}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stream Stats */}
      {!demoMode && streamData && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>Total Viewers:</span>
              <span className="font-medium">{viewerCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Stream Started:</span>
              <span className="font-medium">
                {streamData.createdAt ? new Date(streamData.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
              </span>
            </div>
            {streamData.category && (
              <div className="flex justify-between">
                <span>Category:</span>
                <span className="font-medium">{streamData.category}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveViewers;
