'use client';

import { useEffect, useRef, useState } from "react";

interface WebRTCOptions {
  roomId: string;
  wsUrl: string;
}

export const useWebRTC = ({ roomId, wsUrl }: WebRTCOptions) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected" | "failed"
  >("disconnected");

  const socketRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // standard Google free STUN server configs
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  useEffect(() => {
    let active = true;

    // 1. Establish WebSocket client
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onerror = (err) => {
      if (!active) return;
      console.warn(`[WebRTC] WebSocket signaling connection error at ${wsUrl}:`, err);
      setConnectionStatus("failed");
    };

    ws.onclose = (event) => {
      if (!active) return;
      if (!event.wasClean) {
        console.warn(`[WebRTC] WebSocket closed abnormally. Code: ${event.code}`);
        setConnectionStatus("failed");
      } else {
        setConnectionStatus("disconnected");
      }
    };

    ws.onopen = async () => {
      if (!active) return;
      setConnectionStatus("connecting");
      ws.send(JSON.stringify({ type: "join-room", roomId }));

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user"
          },
          audio: true,
        });

        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        setLocalStream(stream);
        initializePeerConnection(stream);
      } catch (err) {
        console.error("Failed to acquire camera/mic media:", err);
        setConnectionStatus("failed");
      }
    };

    ws.onmessage = async (event) => {
      if (!active) return;
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "offer":
            if (peerConnectionRef.current) {
              await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
              const answer = await peerConnectionRef.current.createAnswer();
              await peerConnectionRef.current.setLocalDescription(answer);
              ws.send(JSON.stringify({ type: "answer", answer }));
            }
            break;

          case "answer":
            if (peerConnectionRef.current) {
              await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
            break;

          case "ice-candidate":
            if (peerConnectionRef.current && data.candidate) {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
            break;
        }
      } catch (err) {
        console.error("Error processing websocket signaling packet:", err);
      }
    };

    const initializePeerConnection = (stream: MediaStream) => {
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      // Add local media tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle remote incoming streams
      pc.ontrack = (event) => {
        if (!active) return;
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      // Emit local ICE candidates to WebSocket
      pc.onicecandidate = (event) => {
        if (event.candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ice-candidate", candidate: event.candidate }));
        }
      };

      pc.onconnectionstatechange = () => {
        if (!active) return;
        switch (pc.connectionState) {
          case "connected":
            setConnectionStatus("connected");
            break;
          case "connecting":
            setConnectionStatus("connecting");
            break;
          case "failed":
          case "closed":
            setConnectionStatus("failed");
            break;
          default:
            setConnectionStatus("disconnected");
            break;
        }
      };

      // If we are the second person joining, we initiate the offer negotiation
      // Simple heuristic: trigger offer creation after slight timeout if room status is active
      setTimeout(async () => {
        if (!active || !peerConnectionRef.current) return;
        try {
          // If we haven't received remote description yet, let's create the offer
          if (peerConnectionRef.current.signalingState === "stable" && !peerConnectionRef.current.remoteDescription) {
            const offer = await peerConnectionRef.current.createOffer();
            await peerConnectionRef.current.setLocalDescription(offer);
            ws.send(JSON.stringify({ type: "offer", offer }));
          }
        } catch (e) {
          console.warn("Auto negotiation offer creation deferred:", e);
        }
      }, 1500);
    };

    return () => {
      active = false;
      localStream?.getTracks().forEach((track) => track.stop());
      peerConnectionRef.current?.close();
      ws.close();
    };
  }, [roomId, wsUrl]);

  return { localStream, remoteStream, connectionStatus };
};
