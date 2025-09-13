import { Client, Storage, Account, ID, Databases, Permission, Role, Query, Models } from 'appwrite';
import type { GameData, GameSessionDocument } from '../types';

let client: Client | null = null;
let storage: Storage | null = null;
let account: Account | null = null;
let databases: Databases | null = null;

let BUCKET_ID: string | null = null;
let DATABASE_ID: string | null = null;
const GAMES_COLLECTION_ID = 'games';


interface AppwriteConfig {
    endpoint: string;
    projectId: string;
    bucketId: string;
    databaseId: string;
}

export function initAppwrite(config: AppwriteConfig) {
    if (!config.endpoint || !config.projectId || !config.bucketId || !config.databaseId) {
        console.error("Appwrite configuration is incomplete.");
        return;
    }
    
    client = new Client();
    client
        .setEndpoint(config.endpoint)
        .setProject(config.projectId);

    storage = new Storage(client);
    account = new Account(client);
    databases = new Databases(client);
    BUCKET_ID = config.bucketId;
    DATABASE_ID = config.databaseId;
    
    console.log("Appwrite initialized with:", {
        endpoint: config.endpoint,
        projectId: config.projectId,
        bucketId: config.bucketId,
        databaseId: config.databaseId,
    });
}

// FIX: Add a function to test the Appwrite connection and bucket permissions from the client.
/**
 * Tests the connection to Appwrite by attempting to create a session and list files.
 * @param config - The Appwrite configuration to test.
 * @returns A promise that resolves to an object indicating success or failure.
 */
export async function testAppwriteConnection(config: AppwriteConfig): Promise<{ success: boolean; error?: string }> {
    if (!config.endpoint || !config.projectId || !config.bucketId) {
        return { success: false, error: "Configuration is incomplete." };
    }

    const testClient = new Client();
    testClient
        .setEndpoint(config.endpoint)
        .setProject(config.projectId);

    const testAccount = new Account(testClient);
    const testStorage = new Storage(testClient);

    try {
        // Attempt to create a new anonymous session for a clean test.
        try {
            // If a session exists from a previous test or run, delete it.
            await testAccount.deleteSession('current');
        } catch (e) {
            // No session existed, which is fine.
        }
        await testAccount.createAnonymousSession();

        // The most reliable, non-destructive test for client-side permissions
        // is to attempt to list files. This confirms the endpoint, project ID,
        // bucket ID are all correct and that the bucket allows at least read access
        // to anonymous users.
        await testStorage.listFiles(config.bucketId);

        return { success: true };

    } catch (error: any) {
        console.error("Appwrite connection test failed:", error);
        let errorMessage = "An unknown error occurred during connection test.";
        if (error.message) {
             errorMessage = `Connection failed: ${error.message}. Check your Endpoint, Project ID, and Bucket ID. Ensure the bucket has read/write permissions for anonymous users.`;
        }
        return { success: false, error: errorMessage };
    }
}

/**
 * Ensures the user has a session to interact with Appwrite.
 * Creates an anonymous session if no active session exists.
 * Returns the user object.
 */
const getSession = async () => {
    if (!account) throw new Error("Appwrite Account service not initialized.");
    
    try {
        return await account.get();
    } catch (error) {
        console.log("No existing session, creating anonymous session...");
        await account.createAnonymousSession();
        // After creating session, get the user details
        return await account.get();
    }
};

/**
 * Converts a base64 data URL into a Blob object.
 * @param base64 - The base64 data URL (e.g., "data:image/png;base64,...").
 * @returns A Blob object representing the image.
 */
function base64ToBlob(base64: string): Blob {
    const parts = base64.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
}

/**
 * Uploads an image from a base64 data URL to the configured Appwrite bucket.
 * @param base64Image - The base64 data URL of the image to upload.
 * @param fileName - The desired name for the file in the bucket.
 * @returns A promise that resolves to the public URL of the uploaded file.
 */
export async function uploadImageToBucket(base64Image: string, fileName: string): Promise<string> {
    if (!storage || !account || !BUCKET_ID) {
        throw new Error("Appwrite service is not initialized. Please check your configuration.");
    }

    try {
        await getSession();
        
        const imageBlob = base64ToBlob(base64Image);
        const imageFile = new File([imageBlob], fileName, { type: imageBlob.type });

        const uploadedFile = await storage.createFile(
            BUCKET_ID,
            ID.unique(),
            imageFile
        );

        // Get the public URL for viewing the file
        const url = storage.getFileView(
            BUCKET_ID,
            uploadedFile.$id
        );

        return url.toString();

    } catch (error) {
        console.error("Failed to upload image to Appwrite:", error);
        throw new Error("Could not save generated image to storage. Please check your Appwrite configuration and bucket permissions.");
    }
}

/**
 * Saves a completed game session to the Appwrite database.
 * @param gameData - The complete game data including images, differences, and prompt.
 * @param timerDuration - The configured timer for the game.
 * @returns The ID of the newly created document.
 */
export async function saveGameSession(gameData: GameData, timerDuration: number): Promise<string> {
    console.log("Attempting to save game session...");
    if (!databases || !account || !DATABASE_ID) {
        console.error("Save failed: Appwrite Databases service not initialized.");
        throw new Error("Appwrite Databases service not initialized.");
    }
    
    try {
        const user = await getSession();
        console.log("Appwrite session obtained for user:", user.$id);
        
        const documentData = {
            prompt: gameData.prompt,
            original_image_url: gameData.original,
            modified_image_url: gameData.modified,
            differences_json: JSON.stringify(gameData.differences),
            timer_duration: timerDuration
        };
        console.log("Document data prepared for saving:", documentData.prompt);

        const doc = await databases.createDocument(
            DATABASE_ID,
            GAMES_COLLECTION_ID,
            ID.unique(),
            documentData,
            [
                Permission.read(Role.any()),
                Permission.update(Role.user(user.$id)),
                Permission.delete(Role.user(user.$id)),
            ]
        );
        console.log('SUCCESS: Game session saved with document ID:', doc.$id);
        return doc.$id;
    } catch (error) {
        console.error("ERROR: Failed to save game session to Appwrite:", error);
        throw error; // Re-throw the error so the UI can catch it
    }
}

/**
 * Updates an existing game session in the Appwrite database.
 * @param documentId The ID of the document to update.
 * @param gameData The complete game data to save.
 * @param timerDuration The timer duration for the game.
 * @returns The updated document.
 */
export async function updateGameSession(documentId: string, gameData: GameData, timerDuration: number): Promise<Models.Document> {
    console.log(`Attempting to update document ID: ${documentId}`);
    if (!databases || !DATABASE_ID || !account) {
        console.error("Update failed: Appwrite Databases service not initialized.");
        throw new Error("Appwrite Databases service not initialized.");
    }
    
    try {
        await getSession();
        
        const documentData = {
            prompt: gameData.prompt,
            original_image_url: gameData.original,
            modified_image_url: gameData.modified,
            differences_json: JSON.stringify(gameData.differences),
            timer_duration: timerDuration
        };
        console.log("Update data prepared for document:", documentId);

        const doc = await databases.updateDocument(
            DATABASE_ID,
            GAMES_COLLECTION_ID,
            documentId,
            documentData
        );
        console.log('SUCCESS: Game session updated for document ID:', doc.$id);
        return doc;
    } catch(error) {
        console.error(`ERROR: Failed to update document ${documentId}:`, error);
        throw error;
    }
}


/**
 * Fetches all available game sessions from the Appwrite database.
 * @returns A promise that resolves to an array of game session documents.
 */
export async function listGameSessions(): Promise<GameSessionDocument[]> {
    if (!databases || !DATABASE_ID) {
        throw new Error("Appwrite Databases service not initialized.");
    }

    try {
        // Await a session to ensure we are authenticated (even if anonymously)
        await getSession();
        const response = await databases.listDocuments<GameSessionDocument>(
            DATABASE_ID,
            GAMES_COLLECTION_ID,
            // Add a query to fetch up to 100 documents, the maximum per request
            [Query.limit(100)]
        );
        return response.documents;
    } catch (error) {
        console.error("Failed to list game sessions from Appwrite:", error);
        throw new Error("Could not fetch game list. Please check your Appwrite configuration and database permissions.");
    }
}