import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Report.css';

const Report = () => {
  const [taskReport, setTaskReport] = useState(null);
  const [userReport, setUserReport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const taskResponse = await axios.get('http://localhost:5001/reports/taskreport', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Task Report Response:', taskResponse.data);
      setTaskReport(taskResponse.data);

      const userResponse = await axios.get('http://localhost:5001/reports/userReport', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('User Report Response:', userResponse.data);
      setUserReport(userResponse.data);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('You are not authorized to view this report.');
      } else {
        setError('Failed to load reports. Please try again later.');
      }
    }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!taskReport || !userReport) return <div className="error">No data available.</div>;

  return (
    <div className="reports-page">
      <h1 className="title">Reports</h1>

      <section className="task-report">
        <h2>Task Overview</h2>
        <ul>
          <li>Total Tasks: {taskReport.totalTasks || 0}</li>
          <li>Completed Tasks: {taskReport.completedTasks || 0}</li>
          <li>Pending Tasks: {taskReport.pendingTasks || 0}</li>
          <li>Overdue Tasks: {taskReport.overdueTasks || 0}</li>
        </ul>
      </section>

      <section className="user-report">
        <h2>User Performance</h2>
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Tasks Assigned</th>
              <th>Tasks Completed</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(userReport) && userReport.length > 0 ? (
              userReport.map(({ user, tasksAssigned, tasksCompleted }) => (
                <tr key={user._id}>
                  <td>{user.name || 'N/A'}</td>
                  <td>{user.email || 'N/A'}</td>
                  <td>{tasksAssigned || 0}</td>
                  <td>{tasksCompleted || 0}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="no-data">No user performance data available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default Report;