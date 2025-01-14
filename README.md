# word-tennis
### [word-tennis.jacobcons.com](https://word-tennis.jacobcons.com)

This is a multiplayer game in which users have to type related words back and forth under timed pressure. For example, a round could go: apple -> computer -> mouse -> cheese -> holes -> pear (not related to "holes", so the round ends)

If no one's online you can test it by opening one normal and one incognito tab.

https://github.com/user-attachments/assets/87357f68-ac20-4dda-8650-1c0c93f92a29

### Developing backend locally
1. Enter backend folder - `cd backend`
2. Install npm packages - `npm i`
3. Set env variables
    ```
   NODE_ENV=dev
   REDIS_URL=redis://localhost:6379/0
   FRONTEND_URL=http://localhost:5173
   OPENAI_API_KEY=<your-api-key>
    ```
4. Spin up redis - `docker-compose up -d`
5. Run server (no type checking) - `npm run dev`
6. Type check in separate terminal - `npm run type-check`

### Developing frontend locally
1. Enter frontend folder - `cd frontend`
2. Install npm packages - `npm i`
3. Set env variables
    ```
   VITE_BACKEND_URL=http://localhost:3000
    ```
4. Run server (no type checking) - `npm run dev`
5. Type check in separate terminal - `npm run type-check`

### Deploying to production
1. push to main branch
