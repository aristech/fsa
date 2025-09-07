import { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { Personnel } from "../models/Personnel";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const signUpSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z
    .enum(["admin", "manager", "technician", "dispatcher", "customer"])
    .optional(),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Sign in
  fastify.post("/sign-in", async (request, reply) => {
    try {
      const { email, password } = signInSchema.parse(request.body);

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return reply.status(401).send({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return reply.status(401).send({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Check if user is active (for technician/supervisor roles)
      if (user.role && ["technician", "supervisor"].includes(user.role)) {
        const personnel = await Personnel.findOne({ userId: user._id });
        if (!personnel || !personnel.isActive) {
          return reply.status(403).send({
            success: false,
            message:
              "Your account is inactive. Please contact your administrator.",
          });
        }
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          role: user.role || "admin",
        },
        process.env.JWT_SECRET || "fallback-secret",
        { expiresIn: "7d" }
      );

      return reply.send({
        success: true,
        data: {
          user: {
            id: user._id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            role: user.role || "admin",
            avatarUrl: user.avatar,
          },
          token,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // Sign up
  fastify.post("/sign-up", async (request, reply) => {
    try {
      const {
        firstName,
        lastName,
        email,
        password,
        role = "admin",
      } = signUpSchema.parse(request.body);

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return reply.status(400).send({
          success: false,
          message: "User already exists",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = new User({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role: role,
        tenantId: "default-tenant", // TODO: Get from context
        permissions: [],
        isActive: true,
      });

      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          role: role,
        },
        process.env.JWT_SECRET || "fallback-secret",
        { expiresIn: "7d" }
      );

      return reply.status(201).send({
        success: true,
        data: {
          user: {
            id: user._id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            role: role,
            avatarUrl: user.avatar,
          },
          token,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // Verify token
  fastify.get("/verify", async (request, reply) => {
    try {
      const token = request.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return reply.status(401).send({
          success: false,
          message: "No token provided",
        });
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "fallback-secret"
      ) as any;

      const user = await User.findById(decoded.userId);
      if (!user) {
        return reply.status(401).send({
          success: false,
          message: "Invalid token",
        });
      }

      return reply.send({
        success: true,
        data: {
          user: {
            id: user._id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            role: user.role || "admin",
            avatarUrl: user.avatar,
          },
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(401).send({
        success: false,
        message: "Invalid token",
      });
    }
  });
}
