import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { createLogger } from "./logger";

const logger = createLogger("socket");

export interface ShiftSyncSocket {
  userId: string;
  locations: string[];
}

export const REALTIME_EVENTS = {
  SHIFT_CREATED: "shift:created",
  SHIFT_UPDATED: "shift:updated",
  SHIFT_PUBLISHED: "shift:published",
  SHIFT_DELETED: "shift:deleted",
  ASSIGNMENT_CREATED: "assignment:created",
  ASSIGNMENT_REMOVED: "assignment:removed",
  ASSIGNMENT_CONFLICT: "assignment:conflict",
  SWAP_REQUESTED: "swap:requested",
  SWAP_ACCEPTED: "swap:accepted",
  SWAP_APPROVED: "swap:approved",
  SWAP_CANCELLED: "swap:cancelled",
  SWAP_REJECTED: "swap:rejected",
  NOTIFICATION: "notification",
} as const;

export function setupSocketIO(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin:
        process.env.NODE_ENV === "production"
          ? process.env.FRONTEND_URL
          : ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "Socket connected");

    // Handle user authentication
    socket.on("auth", (data: ShiftSyncSocket) => {
      socket.data = data;

      // Join user's personal room
      socket.join(`user:${data.userId}`);

      // Join location rooms (for managers)
      for (const locId of data.locations || []) {
        socket.join(`location:${locId}`);
      }

      logger.info({ userId: data.userId }, "User joined rooms");
    });

    // Subscribe to shift updates for a location
    socket.on("subscribe:shifts", (locationId: string) => {
      socket.join(`location:${locationId}`);
    });

    // Unsubscribe from shifts
    socket.on("unsubscribe:shifts", (locationId: string) => {
      socket.leave(`location:${locationId}`);
    });

    // Subscribe to swap notifications
    socket.on("subscribe:swaps", () => {
      socket.join("swaps");
    });

    // Check for assignment conflicts (real-time)
    socket.on("assignment:check", async (data, callback) => {
      // This is handled by the server, but we can emit conflict events
      callback?.({ received: true });
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Socket disconnected");
    });
  });

  return io;
}

// Helper functions to emit events
export function emitShiftUpdate(
  io: ReturnType<typeof setupSocketIO>,
  locationId: string,
  action: string,
  data: Record<string, unknown>,
) {
  io.to(`location:${locationId}`).emit(REALTIME_EVENTS.SHIFT_UPDATED, {
    action,
    ...data,
  });
}

export function emitAssignment(
  io: ReturnType<typeof setupSocketIO>,
  locationId: string,
  action: "created" | "removed",
  data: Record<string, unknown>,
) {
  const event =
    action === "created"
      ? REALTIME_EVENTS.ASSIGNMENT_CREATED
      : REALTIME_EVENTS.ASSIGNMENT_REMOVED;

  io.to(`location:${locationId}`).emit(event, data);
}

export function emitConflict(
  io: ReturnType<typeof setupSocketIO>,
  locationId: string,
  message: string,
) {
  io.to(`location:${locationId}`).emit(REALTIME_EVENTS.ASSIGNMENT_CONFLICT, {
    message,
  });
}

export function emitSwapUpdate(
  io: ReturnType<typeof setupSocketIO>,
  swapId: string,
  action: "requested" | "accepted" | "approved" | "cancelled" | "rejected",
  data: Record<string, unknown>,
) {
  const eventMap = {
    requested: REALTIME_EVENTS.SWAP_REQUESTED,
    accepted: REALTIME_EVENTS.SWAP_ACCEPTED,
    approved: REALTIME_EVENTS.SWAP_APPROVED,
    cancelled: REALTIME_EVENTS.SWAP_CANCELLED,
    rejected: REALTIME_EVENTS.SWAP_REJECTED,
  };

  io.to("swaps").emit(eventMap[action], { swapId, ...data });
}

export function emitNotification(
  io: ReturnType<typeof setupSocketIO>,
  userId: string,
  notification: Record<string, unknown>,
) {
  io.to(`user:${userId}`).emit(REALTIME_EVENTS.NOTIFICATION, notification);
}
