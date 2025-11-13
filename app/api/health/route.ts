import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Health check endpoint for monitoring
 * Returns application health status including database and Redis connectivity
 */
export async function GET() {
  const startTime = Date.now();
  
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    checks: {
      database: { status: "unknown", responseTime: 0 },
      redis: { status: "unknown", responseTime: 0 },
    },
  };

  // Check database connectivity
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = {
      status: "healthy",
      responseTime: Date.now() - dbStart,
    };
  } catch (error) {
    health.status = "unhealthy";
    health.checks.database = {
      status: "unhealthy",
      responseTime: Date.now() - startTime,
    };
  }

  // Check Redis connectivity (if Redis client is available)
  try {
    const redisStart = Date.now();
    // Import Redis client dynamically to avoid errors if not configured
    const { default: Redis } = await import("ioredis");
    const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });
    
    await redis.ping();
    health.checks.redis = {
      status: "healthy",
      responseTime: Date.now() - redisStart,
    };
    redis.disconnect();
  } catch (error) {
    health.status = "degraded";
    health.checks.redis = {
      status: "unhealthy",
      responseTime: Date.now() - startTime,
    };
  }

  const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}
