export const analyticsTypeDefs = `#graphql
  type ExerciseStats {
    exerciseType: String!
    totalDuration: Int!
  }

  type UserStats {
    username: String!
    exercises: [ExerciseStats!]!
  }

  type WeeklyStats {
    exerciseType: String!
    totalDuration: Int!
  }

  type DailyTrend {
    name: String!
    Duration: Int!
    date: String!
  }

  type AnalyticsQuery {
    # Get all user statistics
    allStats: [UserStats!]!
    
    # Get statistics for a specific user
    userStats(username: String!): [UserStats!]!
    
    # Get weekly statistics for a user within date range
    weeklyStats(username: String!, startDate: String!, endDate: String!): [WeeklyStats!]!

    # Get daily trend data (for line chart)
    dailyTrend(username: String!): [DailyTrend!]!
  }

  extend type Query {
    analytics: AnalyticsQuery!
  }
`;
