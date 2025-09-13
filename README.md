
# Gemini Spot the Difference Generator

**A submission for the Google AI Multi-Modal Challenge.**

This web application leverages the power of Google's Gemini and Imagen models to dynamically generate playable "Spot the Difference" games from a single text prompt.

## 🌟 Inspiration

The goal was to create a truly interactive and generative experience using a multi-modal AI workflow. Instead of just generating an image or text, this project uses AI as a creative partner in a two-step process: first to create a world (the base image), and then to subtly alter it (the modified image). The challenge of programmatically *finding* those differences without further AI calls led to an interesting blend of cutting-edge AI generation and classic computer vision techniques.

## ✨ Key Features

-   **AI-Powered Game Creation**: Describe any scene, and the AI will generate a unique game for you.
-   **Dynamic Difference Generation**: The app uses a multi-modal prompt with `gemini-2.5-flash-image-preview` to intelligently add or remove elements from a base image.
-   **Client-Side Analysis**: Differences are detected mathematically in the browser using JavaScript and Canvas APIs. This provides instant, precise results without the cost and latency of another AI call.
-   **Manual Editing**: A powerful editor allows users to add, remove, or resize differences after the automated analysis, giving full creative control.
-   **Database Persistence**: Manually curated games are saved to an Appwrite database for future use or sharing.
-   **Interactive Gameplay**: A clean, responsive interface with a timer, scoring, and clickable regions to find the differences.
-   **Debug Mode**: An included "Debug Mode" visualizes the mathematically-found differences before starting the game, aiding in development and tuning.
-   **Responsive Design**: Playable on both desktop and mobile devices.

## 🤖 How It Works: The Tech Stack

The application employs a fascinating multi-stage process to create each game.

**Tech Stack:**

-   **Frontend**: React, TypeScript, Tailwind CSS
-   **AI Models**:
    -   **`imagen-4.0-generate-001`**: Used for generating the high-quality base image from the user's text prompt.
    -   **`gemini-2.5-flash-image-preview`**: The core of the difference generation. This multi-modal model takes the base image and a text prompt instructing it to make several subtle but significant changes.
-   **Analysis**: JavaScript, HTML Canvas API
-   **Backend**: Appwrite (Storage for images, Database for game data)

**The Generation & Analysis Pipeline:**

1.  **Prompt**: The user enters a theme, like "A whimsical fantasy library with floating books."
2.  **Base Image Generation**: The prompt is sent to **Imagen 4** to create the detailed, original image.
3.  **Difference Generation**: The original image, along with a carefully crafted prompt, is sent to **Gemini 2.5 Flash Image Preview**. The prompt instructs the model to act as an image editor and introduce 3-5 structural changes (e.g., adding/removing an object), explicitly telling it to avoid simple color or brightness shifts.
4.  **Image Storage**: The original and modified images are uploaded to Appwrite Storage.
5.  **Mathematical Analysis**: The two images are drawn onto hidden HTML canvases on the client. The application then performs a pixel-by-pixel comparison.
6.  **Region Finding & Filtering**: A custom algorithm groups differing pixels into connected regions. These regions are then filtered to remove noise and merged if they are close together to form a single, cohesive "difference."
7.  **Manual Curation**: The user can enter an editing mode to add, delete, or resize the computer-generated differences.
8.  **Database Save**: When the user starts the game from the editor, the final game data (image URLs, curated differences, settings) is saved to the Appwrite database.
9.  **Game Ready**: The final, curated difference regions are presented to the user on the game board, ready to be found!

## 🚀 Running the Application

### Configuration

This application requires several environment variables to be set. For deployment (e.g., Cloud Run), the web server should make these available to the client-side JavaScript. For local development, see the setup instructions below.

-   `API_KEY`: Your Google AI API key for Gemini models. You can get one from [Google AI Studio](https://aistudio.google.com/app/apikey).
-   `APPWRITE_ENDPOINT`: The API endpoint for your Appwrite instance (e.g., `https://cloud.appwrite.io/v1`).
-   `APPWRITE_PROJECT_ID`: The Project ID from your Appwrite console.
-   `APPWRITE_BUCKET_ID`: The Storage Bucket ID where generated images will be stored. The bucket must have permissions configured to allow the 'Users' role (anonymous users) to 'Create' files.
-   `APPWRITE_DATABASE_ID`: The Database ID from your Appwrite project where the 'games' collection will be created.

*Note: The application code accesses these variables from the global scope, for example `(self as any).environment.API_KEY`. It does not use `process.env`.*

### Appwrite Platform Setup

For the application to communicate with Appwrite Cloud from your local machine, you must register your local development environment as a Web Platform in your Appwrite project. This is a crucial security step that tells Appwrite to accept API requests originating from `localhost`.

1.  Navigate to your project in the [Appwrite Console](https://cloud.appwrite.io).
2.  From the sidebar menu, click on **Platforms**.
3.  Click the **Add Platform** button and select **New Web App**.
4.  Provide a name for your platform (e.g., "Local Development").
5.  In the **Hostname** field, type `localhost`.
6.  Click **Create**.

Without this configuration, you will encounter authentication errors when running the app locally, which will prevent images from being saved.

### Database Setup

The application uses Appwrite Databases to save curated games. You must run a one-time setup script to prepare your database.

1.  **Create a Database:** In your Appwrite project console, go to **Databases** and create a new database. You can name it "spot-the-diff". Note its **Database ID**.

2.  **Create an API Key:** In your Appwrite console, go to **API Keys**. Create a new API key with the `databases.write` permission. Note the **Secret**.

3.  **Run the Setup Script:**
    The `migrations/setup-appwrite.ts` script creates the necessary collection and attributes. To run it, you'll need a Node.js environment with `ts-node` and `node-appwrite` installed.
    
    ```bash
    # Install dependencies locally or globally
    npm install ts-node node-appwrite
    ```
    
    Execute the script from the project root, providing your credentials as environment variables. Replace the placeholder values.

    ```bash
    APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1" \
    APPWRITE_PROJECT_ID="<YOUR_PROJECT_ID>" \
    APPWRITE_API_KEY="<YOUR_SECRET_API_KEY>" \
    APPWRITE_DATABASE_ID="<YOUR_DATABASE_ID>" \
    npx ts-node migrations/setup-appwrite.ts
    ```
    The script will connect to your Appwrite instance and create a `games` collection inside the database you created.

### Local Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/seehiong/gemini-spot-the-diff-generator.git
    cd gemini-spot-the-diff-generator
    ```

2.  **Set Environment Variables:**
    For local development, you will need a way to serve the static files while making the environment variables available to the JavaScript code. One common method is to use a simple server that can inject these variables.

3.  **Serve the application:**
    Serve the static files (like `index.html`) using a local web server. All dependencies are loaded via CDN, so no `npm install` is required for the web app itself.

## 🔮 Future Improvements

-   **Game Loading**: Load previously saved games from the database.
-   **Difficulty Levels**: Allow users to select a difficulty, which would adjust the subtlety of the AI's changes and the number of differences.
-   **"Zen" Mode**: A relaxing game mode with no timer.
-   **Shareable Games**: Generate a unique URL for each saved game so users can challenge their friends.
-   **Leaderboards**: A global leaderboard for the fastest times.
