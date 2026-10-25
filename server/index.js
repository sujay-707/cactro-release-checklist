import "dotenv/config";
import express from "express";

import cors from "cors";
import pg from "pg";
import http from "node:http";
import { randomUUID } from "node:crypto";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { typeDefs, STEPS } from "./schema.js";
import { getReleaseStatus } from "./releaseStatus.js";
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing from server/.env");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

const app = express();
const httpServer = http.createServer(app);

const EMPTY_CHECKLIST = () => STEPS.map(() => false);

function mapRelease(row) {
  // Handle unexpected or legacy NULL/malformed checklist values safely.
  const rawSteps = Array.isArray(row.completed_steps)
    ? row.completed_steps
    : EMPTY_CHECKLIST();

  const completedSteps = STEPS.map((_, index) => rawSteps[index] === true);

  const count = completedSteps.filter(Boolean).length;

  return {
    id: row.id,
    name: row.name,
    date: new Date(row.release_date).toISOString(),
    additionalInfo: row.additional_info ?? null,
    completedSteps,
    // status:
    //   count === 0 ? "planned" : count === STEPS.length ? "done" : "ongoing",
    status: getReleaseStatus(completedSteps),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function getRelease(id) {
  const result = await pool.query("SELECT * FROM releases WHERE id = $1", [id]);

  return result.rows[0] ? mapRelease(result.rows[0]) : null;
}

const resolvers = {
  Query: {
    releases: async () => {
      const result = await pool.query(
        "SELECT * FROM releases ORDER BY release_date ASC",
      );

      return result.rows.map(mapRelease);
    },

    release: async (_, { id }) => getRelease(id),
  },

  Mutation: {
    createRelease: async (_, { input }) => {
      const name = input.name?.trim();
      const date = new Date(input.date);

      if (!name) {
        throw new Error("Release name is required");
      }

      if (name.length > 200) {
        throw new Error("Release name must be 200 characters or fewer");
      }

      if (!input.date || !Number.isFinite(date.getTime())) {
        throw new Error("A valid release date is required");
      }

      const completedSteps = EMPTY_CHECKLIST();

      const result = await pool.query(
        `INSERT INTO releases (
          id,
          name,
          release_date,
          additional_info,
          completed_steps
        )
        VALUES ($1, $2, $3, $4, $5::jsonb)
        RETURNING *`,
        [
          randomUUID(),
          name,
          date.toISOString(),
          input.additionalInfo?.trim() || null,
          JSON.stringify(completedSteps),
        ],
      );

      return mapRelease(result.rows[0]);
    },

    updateRelease: async (_, { id, input }) => {
      if (
        input.name !== undefined &&
        (!input.name.trim() || input.name.trim().length > 200)
      ) {
        throw new Error("Release name must contain 1–200 characters");
      }

      if (
        input.date !== undefined &&
        (!input.date || !Number.isFinite(new Date(input.date).getTime()))
      ) {
        throw new Error("A valid release date is required");
      }

      const result = await pool.query(
        `UPDATE releases SET
          name = COALESCE($2, name),
          release_date = COALESCE($3::timestamptz, release_date),
          additional_info = CASE
            WHEN $4::boolean THEN $5::text
            ELSE additional_info
          END,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
        [
          id,
          input.name === undefined ? null : input.name.trim(),
          input.date ?? null,
          input.additionalInfo !== undefined,
          input.additionalInfo?.trim() || null,
        ],
      );

      if (!result.rows[0]) {
        throw new Error("Release not found");
      }

      return mapRelease(result.rows[0]);
    },

    toggleStep: async (_, { releaseId, stepIndex }) => {
      if (
        !Number.isInteger(stepIndex) ||
        stepIndex < 0 ||
        stepIndex >= STEPS.length
      ) {
        throw new Error("Invalid checklist step");
      }

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const current = await client.query(
          "SELECT * FROM releases WHERE id = $1 FOR UPDATE",
          [releaseId],
        );

        if (!current.rows[0]) {
          throw new Error("Release not found");
        }

        const raw = current.rows[0].completed_steps;
        const steps = Array.isArray(raw) ? [...raw] : STEPS.map(() => false);

        while (steps.length < STEPS.length) steps.push(false);
        steps[stepIndex] = !Boolean(steps[stepIndex]);

        const updated = await client.query(
          `UPDATE releases
       SET completed_steps = $2::jsonb,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
          [releaseId, JSON.stringify(steps)],
        );

        await client.query("COMMIT");
        return mapRelease(updated.rows[0]);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },

    deleteRelease: async (_, { id }) => {
      const result = await pool.query(
        "DELETE FROM releases WHERE id = $1 RETURNING id",
        [id],
      );

      return result.rowCount > 0;
    },
  },
};

async function start() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS releases (
      id UUID PRIMARY KEY,
      name VARCHAR(200) NOT NULL
        CHECK (length(trim(name)) > 0),
      release_date TIMESTAMPTZ NOT NULL,
      additional_info TEXT,
      completed_steps JSONB NOT NULL
        DEFAULT '[false,false,false,false,false,false,false]'::jsonb
        CHECK (jsonb_typeof(completed_steps) = 'array'),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_releases_date
    ON releases (release_date)
  `);

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await server.start();

  app.use(
    cors({
      origin: process.env.CLIENT_URL?.split(",") ?? [
        "http://localhost:5173",
        "http://localhost:5174",
      ],
    }),
  );

  app.use(express.json({ limit: "100kb" }));

  app.get("/health", async (_, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", database: "connected" });
    } catch {
      res.status(503).json({
        status: "error",
        database: "unavailable",
      });
    }
  });

  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async () => ({}),
    }),
  );

  const port = Number(process.env.PORT || 4000);

  await new Promise((resolve) => httpServer.listen(port, "0.0.0.0", resolve));

  console.log(`GraphQL API ready at http://localhost:${port}/graphql`);
}

start().catch((error) => {
  console.error("Failed to start API:", error);
  process.exit(1);
});
