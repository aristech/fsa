import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { authenticate } from "../middleware/auth";
import { User } from "../models/User";
import { Personnel } from "../models/Personnel";
import { CheckInSession } from "../models/CheckInSession";

export async function userRoutes(fastify: FastifyInstance) {
  // Get online users
  fastify.get(
    "/online",
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const tenantId = user?.tenantId as string;

        // Define "online" as users who have logged in within the last 30 minutes
        // or have active time tracking sessions
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

        // Get users who have logged in recently
        const recentlyActiveUsers = await User.find({
          tenantId,
          isActive: true,
          lastLoginAt: { $gte: thirtyMinutesAgo },
        })
        .select('_id email firstName lastName lastLoginAt')
        .lean();

        // Get users with active time tracking sessions
        const activeSessions = await CheckInSession.find({
          tenantId,
          isActive: true,
        })
        .populate({
          path: 'personnelId',
          populate: {
            path: 'userId',
            select: '_id email firstName lastName lastLoginAt'
          }
        })
        .lean();

        // Collect user IDs from active sessions
        const activeSessionUserIds = new Set();
        const activeSessionUsers: any[] = [];

        activeSessions.forEach((session: any) => {
          const personnel = session.personnelId;
          const sessionUser = personnel?.userId;

          if (sessionUser && !activeSessionUserIds.has(sessionUser._id.toString())) {
            activeSessionUserIds.add(sessionUser._id.toString());
            activeSessionUsers.push(sessionUser);
          }
        });

        // Combine both lists, avoiding duplicates
        const onlineUserIds = new Set();
        const onlineUsers: any[] = [];

        // Add recently active users
        recentlyActiveUsers.forEach(user => {
          if (!onlineUserIds.has((user._id as any)?.toString())) {
            onlineUserIds.add((user._id as any)?.toString());
            onlineUsers.push({
              ...user,
              onlineReason: 'recent_login'
            });
          }
        });

        // Add users with active time tracking
        activeSessionUsers.forEach(user => {
          if (!onlineUserIds.has((user._id as any)?.toString())) {
            onlineUserIds.add((user._id as any)?.toString());
            onlineUsers.push({
              ...user,
              onlineReason: 'active_tracking'
            });
          } else {
            // Update reason if user is both recently active AND has active tracking
            const existingUser = onlineUsers.find(u => u._id.toString() === (user._id as any)?.toString());
            if (existingUser && existingUser.onlineReason === 'recent_login') {
              existingUser.onlineReason = 'recent_login_and_tracking';
            }
          }
        });

        // Sort by most recent activity
        onlineUsers.sort((a, b) => {
          const aTime = new Date(a.lastLoginAt || 0).getTime();
          const bTime = new Date(b.lastLoginAt || 0).getTime();
          return bTime - aTime;
        });

        return reply.send({
          success: true,
          data: onlineUsers,
          meta: {
            total: onlineUsers.length,
            threshold: "30 minutes",
            timestamp: new Date().toISOString()
          }
        });

      } catch (error) {
        console.error("Error getting online users:", error);
        return reply.code(500).send({
          success: false,
          message: "Failed to fetch online users",
        });
      }
    }
  );

  // Heartbeat endpoint to keep user "online" status updated
  fastify.post(
    "/heartbeat",
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const userId = user?.userId as string;

        // Update the user's lastLoginAt to current time
        await User.findByIdAndUpdate(
          userId,
          { lastLoginAt: new Date() },
          { new: true }
        );

        return reply.send({
          success: true,
          message: "Heartbeat recorded",
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error("Error recording heartbeat:", error);
        return reply.code(500).send({
          success: false,
          message: "Failed to record heartbeat",
        });
      }
    }
  );
}