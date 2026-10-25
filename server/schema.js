export const STEPS = [
  "All relevant GitHub pull requests have been merged",
  "CHANGELOG.md files have been updated",
  "All tests are passing",
  "Releases in GitHub created",
  "Deployed in demo",
  "Tested thoroughly in demo",
  "Deployed in production",
];

export const typeDefs = `#graphql
  enum ReleaseStatus {
    planned
    ongoing
    done
  }

  type Release {
    id: ID!
    name: String!
    date: String!
    status: ReleaseStatus!
    additionalInfo: String
    completedSteps: [Boolean!]!
    createdAt: String!
    updatedAt: String!
  }

  input CreateReleaseInput {
    name: String!
    date: String!
    additionalInfo: String
  }

  input UpdateReleaseInput {
    name: String
    date: String
    additionalInfo: String
  }

  type Query {
    releases: [Release!]!
    release(id: ID!): Release
  }

  type Mutation {
    createRelease(input: CreateReleaseInput!): Release!
    updateRelease(id: ID!, input: UpdateReleaseInput!): Release!
    toggleStep(releaseId: ID!, stepIndex: Int!): Release!
    deleteRelease(id: ID!): Boolean!
  }
`;