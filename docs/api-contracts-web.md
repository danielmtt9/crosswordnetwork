# API Contracts - Web Application

## Overview
This document outlines the API endpoints for the Crossword Network web application. The API is built using Next.js App Router (Route Handlers).

## Endpoints

### Achievements
- `GET /api/achievements`: List achievements
- `POST /api/achievements/celebrate`: Trigger achievement celebration
- `GET /api/achievements/check`: Check for new achievements

### Admin
- `GET /api/admin/*`: Admin dashboard data

### Feature Flags
- `GET /api/feature-flags`: Retrieve feature flags

### Puzzles
- `GET /api/puzzles`: List puzzles
- `GET /api/puzzles/[id]`: Get puzzle details

### Rooms (Multiplayer)
- `GET /api/rooms`: List rooms
- `POST /api/rooms`: Create a room
- `GET /api/rooms/[id]`: Get room details

### User
- `GET /api/user`: Get current user profile
- `POST /api/user/settings`: Update user settings

## Authentication
Authentication is handled via NextAuth.js. Most API routes require a valid session.
