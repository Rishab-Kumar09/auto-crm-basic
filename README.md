# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/c3824e2a-aa57-492e-8308-05eed3ad6a0e

## Environment Variables Setup

This project requires certain environment variables to be set up before it can run. Copy the `.env.example` file to create your own `.env` file:

```bash
cp .env.example .env
```

### Required Environment Variables
These must be set for the application to function:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase project's anon/public key

### Optional Environment Variables
These are only needed if you're using the AI/ML features:
- `LANGCHAIN_API_KEY`: Your LangChain API key
- `PINECONE_API_KEY`: Your Pinecone API key
- `OPENAI_API_KEY`: Your OpenAI API key
- `PINECONE_INDEX`: Your Pinecone index name

## Deployment Instructions

When deploying this application, make sure to:

1. Set up the required environment variables in your deployment platform
2. Build the application using:
   ```bash
   npm run build
   ```
3. The built files will be in the `dist` directory
4. Configure your deployment platform to serve the application from the `dist` directory

### Platform-Specific Instructions

#### Vercel
- Import your repository
- Set the environment variables in the Vercel dashboard
- Vercel will automatically detect and build the Vite application

#### Netlify
- Import your repository
- Set the environment variables in the Netlify dashboard
- Build command: `npm run build`
- Publish directory: `dist`

#### Railway/Heroku
- Connect your repository
- Set the environment variables in the platform's dashboard
- The platform will use the build command from package.json

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/c3824e2a-aa57-492e-8308-05eed3ad6a0e) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Set up your environment variables by copying .env.example
cp .env.example .env
# Then edit .env with your actual values

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/c3824e2a-aa57-492e-8308-05eed3ad6a0e) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)
