
# Task Manager Application (MERN Stack)

A role-based task management application built using the MERN stack. Users can sign up, log in, and manage tasks based on their roles (Admin/User). The application provides an intuitive UI, Google Authentication, task assignment, progress tracking, and a chat support feature.




## Features

### 🔹 Authentication & Authorization
- Login and Sign-up UI
- Role-based login (Admin/User)
- Google Authentication added on the Sign-In page

### 🔹 Admin Dashboard
- Displays overall task progress
- Categorizes tasks as Completed, Pending, Overdue
- Task Prioritization: High, Medium, Low

### 🔹 Task Management
- Create a task with Title, Description, Status (In Progress, Completed, Pending)
- Priority Levels: High, Medium, Low
- Due Date Selection
- Sidebar Navigation: Home, Assign Tasks, View Tasks, Users
- Chat Support at the bottom-right corner for real-time assistance







## Tech Stack

**Frontend:** React + Vite

**Backend:** Node.js, Express.js

**Database:** MongoDB (MongoDB Atlas)

**Authentication:** Firebase (Google Sign-In) + JWT

**Styling:** Tailwind CSS / Material-UI

**State Management:** React Hooks

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript and enable type-aware lint rules. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
