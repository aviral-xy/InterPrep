import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "https://n8n-production-7cbf9.up.railway.app/webhook-test/generate-interview";

app.use(cors());
app.use(express.json());

// Create standard HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server });

// Track active clients in rooms
const activeRooms = new Map<string, Set<WebSocket>>();

wss.on("connection", (ws) => {
  let userRoom: string | null = null;

  ws.on("message", (message: string) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case "join-room":
          userRoom = data.roomId;
          if (!activeRooms.has(userRoom!)) {
            activeRooms.set(userRoom!, new Set());
          }
          activeRooms.get(userRoom!)?.add(ws);
          console.log(`[WS] Peer joined room: ${userRoom}`);
          break;

        case "offer":
        case "answer":
        case "ice-candidate":
          // Relay media negotiation message to other peers in the room
          if (userRoom && activeRooms.has(userRoom)) {
            activeRooms.get(userRoom)?.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
              }
            });
          }
          break;
      }
    } catch (err) {
      console.error("[WS] Error parsing message:", err);
    }
  });

  ws.on("close", () => {
    if (userRoom && activeRooms.has(userRoom)) {
      activeRooms.get(userRoom)?.delete(ws);
      if (activeRooms.get(userRoom)?.size === 0) {
        activeRooms.delete(userRoom);
      }
      console.log(`[WS] Peer left room: ${userRoom}`);
    }
  });
});

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Generate interview questions proxy
app.post("/generate", async (req, res) => {
  try {
    const { role, level, techstack, amount, type, profile } = req.body;

    console.log(`Processing generate request for: ${role} (${level}) - ${amount} questions`);

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role,
        level,
        techstack,
        amount,
        type,
        profile,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`n8n responded with status ${response.status}:`, errorText);
      res.status(response.status).json({
        success: false,
        error: `n8n webhook error: ${response.statusText}`,
      });
      return;
    }

    const data = await response.json();
    console.log("Successfully received response from n8n:", data);

    res.json({
      success: true,
      questions: data.questions,
    });
  } catch (error: any) {
    console.error("Error calling n8n webhook:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Internal Server Error proxying to n8n",
    });
  }
});

// Listen using the combined HTTP / WebSocket server
server.listen(PORT, () => {
  console.log(`🚀 InterPrep Express & WS Server listening on port ${PORT}`);
  console.log(`🔗 Proxying generation requests to: ${N8N_WEBHOOK_URL}`);
});
