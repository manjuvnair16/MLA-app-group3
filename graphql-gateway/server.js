import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import axios from "axios";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";


const ACTIVITY_URL = process.env.ACTIVITY_URL || "http://activity-tracking:5300";

/** ============ Schema ============ */
const typeDefs = `#graphql
  type Exercise {
    id: ID!
    username: String!
    exerciseType: String!
    description: String
    duration: Int!
    date: String!
    createdAt: String
    updatedAt: String
  }

  input AddExerciseInput {
    username: String!
    exerciseType: String!
    description: String
    duration: Int!
    date: String!
  }

  input UpdateExerciseInput {
    username: String!
    exerciseType: String!
    description: String
    duration: Int!
    date: String!
  }

  type Query {
    exercises: [Exercise!]!
    exercise(id: ID!): Exercise
  }

  type Mutation {
    addExercise(input: AddExerciseInput!): Exercise!
    updateExercise(id: ID!, input: UpdateExerciseInput!): Exercise!
    deleteExercise(id: ID!): String!
  }
`;

/** ============ Resolvers (REST -> GraphQL proxy) ============ */
const resolvers = {
  Query: {
    exercises: async () => {
      const { data } = await axios.get(`${ACTIVITY_URL}/exercises`);
      return data.map(e => ({ id: e._id, ...e }));
    },
    exercise: async (_p, { id }) => {
      const { data } = await axios.get(`${ACTIVITY_URL}/exercises/${id}`);
      return { id: data._id, ...data };
    }
  },
  Mutation: {
    addExercise: async (_p, { input }) => {
      await axios.post(`${ACTIVITY_URL}/exercises/add`, input);
      const all = await axios.get(`${ACTIVITY_URL}/exercises`);
      const last = all.data[all.data.length - 1];
      return { id: last._id, ...last };
    },
    updateExercise: async (_p, { id, input }) => {
      await axios.put(`${ACTIVITY_URL}/exercises/update/${id}`, input);
      const { data } = await axios.get(`${ACTIVITY_URL}/exercises/${id}`);
      return { id: data._id, ...data };
    },
    deleteExercise: async (_p, { id }) => {
      const { data } = await axios.delete(`${ACTIVITY_URL}/exercises/${id}`);
      return data.message || "Deleted";
    }
  }
};

async function start() {
  const app = express();
  const server = new ApolloServer({ typeDefs, resolvers, introspection: true,
    plugins: [
      ApolloServerPluginLandingPageLocalDefault({
        embed: true,      
        includeCookies: false
      })
    ]}
  );
  await server.start();

  const allowed = (process.env.CORS_ORIGINS || "http://localhost:3000").split(",");
  app.use("/graphql",
    cors({ origin: allowed, credentials: true }),
    bodyParser.json(),
    expressMiddleware(server)
  );
  app.get("/", (_req, res) => res.redirect("/graphql"));
  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`🚀 GraphQL Gateway running at http://localhost:${port}/graphql`);
    console.log(`Using ACTIVITY_URL = ${ACTIVITY_URL}`);
  });
}
start();
