# Claude Flow Todo API

A simple RESTful API for managing todos, built using Claude Flow Swarm orchestration.

## Features
- User registration and authentication
- JWT-based authentication
- CRUD operations for todos
- Input validation
- SQLite database

## Quick Start
1. Copy `.env.example` to `.env` and update values
2. Install dependencies: `npm install`
3. Run the server: `npm start`
4. Run tests: `npm test`

## API Endpoints

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login user

### Todos
- GET /api/todos - Get all todos (authenticated)
- POST /api/todos - Create new todo (authenticated)
- PUT /api/todos/:id - Update todo (authenticated)
- DELETE /api/todos/:id - Delete todo (authenticated)

## Built with Claude Flow Swarm
This project was created using Claude Flow's swarm orchestration with 5 specialized agents working in parallel.