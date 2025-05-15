import React from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import '../TaskReport/taskReport.css'
const TaskReport = ({ taskId }) => {
  const downloadPDF = async () => {
    try {
      // Fetch task data from the backend
      const response = await axios.get(`http://localhost:5001/api/reports/task/${taskId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      const { taskData } = response.data;

      // Create a PDF document
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Task Report', 10, 10);
      doc.setFontSize(12);
      doc.text(`Task Title: ${taskData.title}`, 10, 20);
      doc.text(`Description: ${taskData.description}`, 10, 30);
      doc.text(`Status: ${taskData.status}`, 10, 40);
      doc.text(`Priority: ${taskData.priority}`, 10, 50);
      doc.text(`Due Date: ${new Date(taskData.dueDate).toLocaleDateString()}`, 10, 60);

      // Save the PDF
      doc.save(`Task_Report_${taskId}.pdf`);
    } catch (error) {
      console.error('Error downloading PDF report:', error);
    }
  };

  return (
    <div>
      <button className='pdfbtn task-card-button ' onClick={downloadPDF}>Download Report</button>
    </div>
  );
};

export default TaskReport;