import React, { useState, useEffect } from "react";
import "./statistics.css";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Utility function to convert total minutes to hours and minutes
const toHoursAndMinutes = (totalMinutes) => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h} hr ${m} min` : `${m} min`;
};

// Custom Tooltip Component for Donut Chart
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataEntry = payload[0];
    const durationInMin = dataEntry.value;
    const durationFormatted = toHoursAndMinutes(durationInMin);
    const exerciseName = dataEntry.name;
    const color = dataEntry.color;

    return (
      <div className="custom-tooltip">
        <p className="label" style={{ color: color, fontWeight: "bold" }}>
          {exerciseName}: {durationFormatted}
        </p>
      </div>
    );
  }

  return null;
};

// Define a simple, clean, monochromatic blue/purple palette
const ACCENT_COLOR_PRIMARY = "#5B53D0"; // Deep Blue/Violet for main elements
const ACCENT_COLOR_SECONDARY = "#ff0073"; // Vibrant Pink for highlights
const COLOR_HIGH_CONTRAST = "#FF8C00"; // Dark Orange for high contrast elements
const NEUTRAL_COLOR_LIGHT = "#E0E0E0"; // Light grey for backgrounds/neutral elements
const COLOR_DURATION = ACCENT_COLOR_PRIMARY; // Use primary for Duration

// CHART_COLORS - Expanded vibrant palette for 20+ different activities
const CHART_COLORS = [
  "#5B53D0", // 1. Deep Purple (brand color)
  "#FF6B9D", // 2. Pink
  "#4ECDC4", // 3. Turquoise
  "#FF8C42", // 4. Orange
  "#95E1D3", // 5. Mint
  "#C44569", // 6. Rose
  "#F38181", // 7. Coral
  "#AA96DA", // 8. Lavender
  "#FCBAD3", // 9. Light Pink
  "#A8E6CF", // 10. Seafoam
  "#FFD93D", // 11. Yellow
  "#6BCF7F", // 12. Green
  "#4D96FF", // 13. Blue
  "#FF6B6B", // 14. Red
  "#A8DADC", // 15. Sky Blue
  "#E9C46A", // 16. Gold
  "#2A9D8F", // 17. Teal
  "#E76F51", // 18. Terracotta
  "#8E7CC3", // 19. Violet
  "#90E0EF", // 20. Light Blue
  "#FFB4A2", // 21. Peach
  "#B5838D", // 22. Mauve
];

const Statistics = ({ currentUser }) => {
  const [weeklySummary, setWeeklySummary] = useState({
    totalDuration: 0,
    totalTypes: 0,
    exercises: [],
  });
  const [weeklyData, setWeeklyData] = useState([]); // [{ name:'Mon', Duration: 60 }, ...]
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const jwt = localStorage.getItem("jwt");
    const headers = jwt ? { Authorization: `Bearer ${jwt}` } : {};

    // get the start and end date for weekly stats (fetch last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6);

    const formattedStart = startDate.toISOString().split('T')[0];
    const formattedEnd = endDate.toISOString().split('T')[0];
    console.log('Fetching stats for:', formattedStart, 'to', formattedEnd);

    const query = `query WeeklyStats($username: String!, $startDate: String!, $endDate: String!) {
                        analytics {
                          weeklyStats(username: $username, startDate: $startDate, endDate: $endDate) {
                            exerciseType
                            totalDuration
                          }
                        }
                      }`;

        fetch('http://localhost:4000/graphql', {
              method: 'POST',
              headers:{
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwt}`,
                      },
              body: JSON.stringify({
                query,
                variables: {
                  username: currentUser,
                  startDate: formattedStart,
                  endDate: formattedEnd
                }
              })
          })
        .then(res => res.json()) 
        .then(result => {const stats = result.data?.analytics?.weeklyStats || [];
        console.log('Fetched weekly trend stats:', stats);
        
        // Derive same frontend state shape
        const totalDuration = stats.reduce((sum, item) => sum + item.totalDuration, 0);
        const exercises = stats.map(item => ({
          exerciseType: item.exerciseType,
          totalDuration: item.totalDuration
        }));

  
        setWeeklySummary({
          totalDuration,
          totalTypes: exercises.length,
          exercises
        });

        const query_daily_trend = `
        query DailyTrend($username: String!) {
          analytics {
            dailyTrend(username: $username) {
              name
              Duration
              date
            }
          }
        }
      `;
      fetch('http://localhost:4000/graphql', {
              method: 'POST',
              headers:{
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwt}`,
                      },
              body: JSON.stringify({
                query: query_daily_trend,
                variables: {
                  username: currentUser
                }
              })
          })
        .then(res => res.json()) 
        .then(result => {const stats_trend = result.data?.analytics?.dailyTrend  || [];

        // Ensure the trend array is in the shape the chart expects
        // const trend = exercises.map((ex, i) => ({ name: ex.exerciseType, Duration: ex.totalDuration }));
       console.log('Fetched daily trend stats:', stats_trend);
       const trend = stats_trend.map(item => ({
          name: item.name,
          Duration: item.Duration
         // date: item.date || ""
        }));
        setWeeklyData(trend);
      })
  })
      .catch((err) => {
        console.error('GraphQL stats fetch failed:', err);
        setWeeklySummary({ totalDuration: 0, totalTypes: 0, exercises: [] });
        setWeeklyData([]);
      })
      .finally(() => setLoading(false));
  }, [currentUser]);

  if (loading) {
    return (
      <div className="stats-container">
        <p>Loading statistics...</p>
      </div>
    );
  }

  const exerciseData = weeklySummary.exercises;
  const totalDuration = weeklySummary.totalDuration;
  const totalDurationFormatted = toHoursAndMinutes(totalDuration);
  const totalExerciseTypes = weeklySummary.totalTypes;

  const distributionData = exerciseData.map((item) => ({
    name: item.exerciseType,
    value: item.totalDuration,
  }));

  // Find the top exercise
  const topExercise =
    distributionData.length > 0
      ? distributionData.reduce((prev, current) =>
        prev.value > current.value ? prev : current
      )
      : { name: "N/A", value: 0 };

  const topExerciseDurationFormatted = toHoursAndMinutes(topExercise.value);

  const user = JSON.parse(localStorage.getItem("user"));
  const firstName = user?.firstName || "User";

  return (
    <div className="stats-container">
      <h2>Your Fitness Dashboard, {firstName}! 🚀</h2>

      {exerciseData.length === 0 ? (
        <p className="no-data-message">
          No exercise data available to display statistics.
        </p>
      ) : (
        <>
          <div className="stats-header-cards">
            {/* Card 1: clear text colors for visibility */}
            <div className="stat-card primary-bg">
              <h3>Total Active Time</h3>
              <p>{totalDurationFormatted}</p>
            </div>
            {/* Card 2: clear text colors for visibility */}
            <div className="stat-card secondary-bg">
              <h3>Total Number of Exercises</h3>
              <p>{totalExerciseTypes}</p>
            </div>
            {/* Card 3: styling with dark text and primary accent for value */}
            <div className="stat-card accent-bg">
              <h3>Top Exercise</h3>
              <p>
                {topExercise.name}{" "}
                <span
                  style={{ fontSize: "0.6em", opacity: 0.8, fontWeight: 400 }}
                >
                  ({topExerciseDurationFormatted})
                </span>
              </p>
            </div>
          </div>

          <div className="charts-grid">
            {/* Weekly Activity Trend (Line Chart) */}
            <div className="chart-card wide-chart">
              <h3>Last 7 Days Activity</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={NEUTRAL_COLOR_LIGHT}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#555"
                    style={{ fontSize: '11px' }}
                    tickFormatter={(dayName) => {
                      // Find the date for this day
                      const dataPoint = weeklyData.find(d => d.name === dayName);
                      if (dataPoint && dataPoint.date) {
                        // Convert "2025-11-17" to "17/11"
                        const dateParts = dataPoint.date.split('-');
                        const day = dateParts[2];
                        const month = dateParts[1];
                        return `${dayName}\n${day}/${month}`;
                      }
                      return dayName;
                    }}
                  />
                  <YAxis stroke="#555" />

                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "Active Time" && typeof value === "number") {
                        return toHoursAndMinutes(value);
                      }
                      return value;
                    }}
                    labelFormatter={(label) => {
                      // Find the corresponding date from weeklyData
                      const dataPoint = weeklyData.find(d => d.name === label);
                      if (dataPoint && dataPoint.date) {
                        // Convert "2025-11-17" to "Monday, Nov 17, 2025"
                        const dateObj = new Date(dataPoint.date + 'T00:00:00');
                        return dateObj.toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        });
                      }
                      return label;
                    }}
                  />

                  <Legend wrapperStyle={{ paddingTop: "10px" }} />

                  {/* Solid primary line for Duration */}
                  <Line
                    type="monotone"
                    dataKey="Duration"
                    name="Active Time"
                    stroke={COLOR_DURATION}
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Exercise Distribution (Donut Chart) */}
            <div className="chart-card small-chart">
              <h3>Duration by Exercise Type</h3>
              <div className="donut-chart-container">
                <div className="donut-chart-wrapper">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={distributionData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="40%"
                        outerRadius="70%"
                        fill={ACCENT_COLOR_PRIMARY}
                        labelLine={{
                          stroke: '#8884d8',
                          strokeWidth: 1
                        }}
                        label={({ cx, cy, midAngle, outerRadius, percent }) => {
                         
                          if (percent < 0.003) return null;

                          const RADIAN = Math.PI / 180;
                          const radius = outerRadius + 30;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);

                          return (
                            <text
                              x={x}
                              y={y}
                              fill="#333"
                              textAnchor={x > cx ? 'start' : 'end'}
                              dominantBaseline="central"
                              style={{
                                fontSize: '14px',
                                fontWeight: 'bold'
                              }}
                            >
                              {`${(percent * 100).toFixed(0)}%`}
                            </text>
                          );
                        }}
                      >
                        {distributionData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: "transparent" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="donut-legend-wrapper">
                  {distributionData.map((entry, index) => (
                    <div key={`item-${index}`} className="donut-legend-item">
                      <div
                        className="donut-legend-color-box"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="donut-legend-name">{entry.name}</span>
                      <span className="donut-legend-value">{toHoursAndMinutes(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Statistics;