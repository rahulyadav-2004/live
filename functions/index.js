/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");
const {AccessToken, RoomServiceClient} = require("livekit-server-sdk");

// Set global options
setGlobalOptions({maxInstances: 10});

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// LiveKit configuration
const LIVEKIT_API_KEY = "APIsxGFTaq3CpJ7";
const LIVEKIT_API_SECRET = "0nO3erUgs02fidF59VgEtgPl3x6QV3oAN4Dfn3OQQFpB";
const LIVEKIT_URL = "wss://scrolllive-kr9pmklh.livekit.cloud";

// Initialize LiveKit client
const roomService = new RoomServiceClient(
    LIVEKIT_URL,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
);

/**
 * Create a new live stream room
 */
exports.createLiveStream = onCall(async (request) => {
  try {
    const {auth, data} = request;

    // Check if user is authenticated
    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const {title, category = "General"} = data;

    if (!title) {
      throw new HttpsError("invalid-argument", "Stream title is required");
    }

    // Generate unique room name
    const roomName = `stream_${auth.uid}_${Date.now()}`;

    // Create LiveKit room
    await roomService.createRoom({
      name: roomName,
      emptyTimeout: 300, // 5 minutes
      maxParticipants: 100,
    });

    // Generate access token for the streamer (host)
    const accessToken = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: auth.uid,
      name: auth.token.name || auth.token.email,
    });

    accessToken.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const tokenResult = accessToken.toJwt();

    console.log("Generated token result:", tokenResult);
    console.log("Token result type:", typeof tokenResult);

    // Handle both string and Promise cases
    let token;
    if (typeof tokenResult === "string") {
      token = tokenResult;
    } else if (tokenResult && typeof tokenResult.then === "function") {
      // If it's a Promise, await it
      token = await tokenResult;
    } else if (tokenResult && tokenResult.token) {
      // If it's an object with a token property
      token = tokenResult.token;
    } else {
      throw new Error(`Invalid token format: ${typeof tokenResult}`);
    }

    console.log("Final token type:", typeof token);
    console.log("Final token length:", token ? token.length : 0);
    const finalTokenSample = token ?
      token.substring(0, 50) + "..." : "null";
    console.log("Final token sample:", finalTokenSample);

    // Save stream to Firestore
    const streamDoc = await db.collection("streams").add({
      roomName,
      title,
      category,
      createdBy: auth.uid,
      createdByName: auth.token.name || auth.token.email,
      createdByAvatar: auth.token.picture || null,
      isLive: true,
      viewerCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      participants: [],
    });

    return {
      streamId: streamDoc.id,
      roomName,
      token,
      wsUrl: LIVEKIT_URL,
    };
  } catch (error) {
    console.error("Error creating live stream:", error);
    throw new HttpsError("internal", "Failed to create live stream");
  }
});

/**
 * Join an existing live stream
 */
exports.joinLiveStream = onCall(async (request) => {
  try {
    const {auth, data} = request;

    // Check if user is authenticated
    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const {streamId} = data;

    if (!streamId) {
      throw new HttpsError("invalid-argument", "Stream ID is required");
    }

    // Get stream from Firestore
    const streamDoc = await db.collection("streams").doc(streamId).get();

    if (!streamDoc.exists) {
      throw new HttpsError("not-found", "Stream not found");
    }

    const streamData = streamDoc.data();

    if (!streamData.isLive) {
      throw new HttpsError("failed-precondition", "Stream is not live");
    }

    // Generate access token for the viewer
    const accessToken = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: auth.uid,
      name: auth.token.name || auth.token.email,
    });

    accessToken.addGrant({
      room: streamData.roomName,
      roomJoin: true,
      canPublish: false, // Viewers can't publish by default
      canSubscribe: true,
      canPublishData: true, // Allow chat messages
    });

    const tokenResult = accessToken.toJwt();

    // Handle the token result properly
    let token;
    if (typeof tokenResult === "string") {
      token = tokenResult;
    } else if (tokenResult && typeof tokenResult.then === "function") {
      token = await tokenResult;
    } else if (tokenResult && tokenResult.token) {
      token = tokenResult.token;
    } else {
      throw new Error(`Invalid token format: ${typeof tokenResult}`);
    }

    // Add participant to stream (fix serverTimestamp issue)
    await db.collection("streams").doc(streamId).update({
      participants: admin.firestore.FieldValue.arrayUnion({
        userId: auth.uid,
        name: auth.token.name || auth.token.email,
        avatar: auth.token.picture || null,
        joinedAt: Date.now(), // Use timestamp instead of serverTimestamp
        role: "viewer",
      }),
      viewerCount: admin.firestore.FieldValue.increment(1),
    });

    return {
      streamId,
      roomName: streamData.roomName,
      token,
      wsUrl: LIVEKIT_URL,
      streamInfo: {
        title: streamData.title,
        category: streamData.category,
        createdBy: streamData.createdByName,
        createdByAvatar: streamData.createdByAvatar,
      },
    };
  } catch (error) {
    console.error("Error joining live stream:", error);
    throw new HttpsError("internal", "Failed to join live stream");
  }
});

/**
 * End a live stream
 */
exports.endLiveStream = onCall(async (request) => {
  try {
    const {auth, data} = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const {streamId} = data;

    if (!streamId) {
      throw new HttpsError("invalid-argument", "Stream ID is required");
    }

    // Get stream from Firestore
    const streamDoc = await db.collection("streams").doc(streamId).get();

    if (!streamDoc.exists) {
      throw new HttpsError("not-found", "Stream not found");
    }

    const streamData = streamDoc.data();

    // Check if user is the stream owner
    if (streamData.createdBy !== auth.uid) {
      throw new HttpsError(
          "permission-denied",
          "Only the stream creator can end the stream",
      );
    }

    // End LiveKit room
    await roomService.deleteRoom(streamData.roomName);

    // Update stream status
    await db.collection("streams").doc(streamId).update({
      isLive: false,
      endedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {success: true};
  } catch (error) {
    console.error("Error ending live stream:", error);
    throw new HttpsError("internal", "Failed to end live stream");
  }
});

/**
 * Get all active live streams
 */
exports.getActiveStreams = onCall(async (request) => {
  try {
    const streamsSnapshot = await db
        .collection("streams")
        .where("isLive", "==", true)
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();

    const streams = [];
    streamsSnapshot.forEach((doc) => {
      const data = doc.data();
      streams.push({
        id: doc.id,
        title: data.title,
        category: data.category,
        createdBy: data.createdByName,
        createdByAvatar: data.createdByAvatar,
        viewerCount: data.viewerCount || 0,
        createdAt: data.createdAt,
        participants: data.participants || [],
      });
    });

    return {streams};
  } catch (error) {
    console.error("Error getting active streams:", error);
    throw new HttpsError("internal", "Failed to get active streams");
  }
});

/**
 * Leave a live stream
 */
exports.leaveLiveStream = onCall(async (request) => {
  try {
    const {auth, data} = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const {streamId} = data;

    if (!streamId) {
      throw new HttpsError("invalid-argument", "Stream ID is required");
    }

    // Remove participant from stream
    const streamRef = db.collection("streams").doc(streamId);
    const streamDoc = await streamRef.get();

    if (streamDoc.exists) {
      const streamData = streamDoc.data();
      const participants = streamData.participants || [];

      // Filter out the leaving participant
      const updatedParticipants = participants.filter(
          (p) => p.userId !== auth.uid,
      );

      await streamRef.update({
        participants: updatedParticipants,
        viewerCount: Math.max(0, (streamData.viewerCount || 1) - 1),
      });
    }

    return {success: true};
  } catch (error) {
    console.error("Error leaving live stream:", error);
    throw new HttpsError("internal", "Failed to leave live stream");
  }
});

/**
 * Firestore trigger to clean up empty rooms
 */
exports.cleanupEmptyRooms = onDocumentCreated(
    "streams/{streamId}",
    async (event) => {
      const streamId = event.params.streamId;

      // Set a cleanup timer for 5 minutes after creation
      setTimeout(async () => {
        try {
          const currentDoc = await db.collection("streams").doc(streamId).get();

          if (currentDoc.exists) {
            const currentData = currentDoc.data();

            // If stream has no viewers for 5 minutes, mark as ended
            if (currentData.isLive && (currentData.viewerCount || 0) === 0) {
              await roomService.deleteRoom(currentData.roomName);
              await db.collection("streams").doc(streamId).update({
                isLive: false,
                endedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }
        } catch (error) {
          console.error("Error in cleanup:", error);
        }
      }, 5 * 60 * 1000); // 5 minutes
    },
);
