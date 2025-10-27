# Frontend – clearSKY 

## Overview

This is the frontend application for clearSKY, built with React and Vite. It communicates with the backend API to handle user authentication and other interactions.

## Features

- React-based SPA
- React Router for navigation
- Axios for API calls
- CSS for styling
- Vite for development and bundling

## Getting Started

### Development Server

```bash
cd frontend
npm install
npm run dev
```

Runs on [http://localhost:5173](http://localhost:5173)

### Scripts

- `dev`: Starts the Vite dev server
- `build`: Builds for production
- `preview`: Previews production build
- `lint`: Runs ESLint

## Dependencies

- `react`
- `react-dom`
- `react-router-dom`
- `axios`
- `tailwindcss`

## Project Layout

```
frontend/
├── index.html
├── src/
│   ├── main.jsx
│   └── components/
├── tailwind.config.js
└── package.json
```

## Environment

Make sure the backend is running on the correct port and CORS is configured accordingly.
