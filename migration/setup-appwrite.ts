// This script sets up the required Appwrite database and collection for the Spot the Diff app.
// It is intended to be run once from a Node.js environment.
// Before running, make sure to set the following environment variables:
// - APPWRITE_ENDPOINT: Your Appwrite project endpoint
// - APPWRITE_PROJECT_ID: Your Appwrite project ID
// - APPWRITE_API_KEY: A secret Appwrite API key with database write permissions.
// - APPWRITE_DATABASE_ID: The ID of the database you created in your Appwrite project.

// FIX: Import IndexType to use for creating indexes.
import { Client, Databases, ID, IndexType, Permission, Role } from 'node-appwrite';

// The user provided the database ID.
const DATABASE_NAME = 'spot-the-diff';
const COLLECTION_ID = 'games';
const COLLECTION_NAME = 'Games';

const requiredEnv = ['APPWRITE_ENDPOINT', 'APPWRITE_PROJECT_ID', 'APPWRITE_API_KEY', 'APPWRITE_DATABASE_ID'];
for (const key of requiredEnv) {
    if (!process.env[key]) {
        console.error(`Error: Missing required environment variable ${key}.`);
        // FIX: Replaced process.exit(1) to fix a type error where 'exit' is not found on 'process'.
        // Throwing an error will stop the script and result in a non-zero exit code.
        throw new Error(`Missing required environment variable: ${key}`);
    }
}

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!;

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

async function setupDatabase() {
    console.log('Starting Appwrite setup...');

    try {
        await databases.get(DATABASE_ID);
        console.log(`Database with ID '${DATABASE_ID}' found.`);
    } catch (e) {
        console.error(`Database with ID '${DATABASE_ID}' not found. Please ensure it has been created in your Appwrite console first.`);
        // The user said they already created it, so this is a helpful check.
        return;
    }

    try {
        await databases.getCollection(DATABASE_ID, COLLECTION_ID);
        console.log(`Collection '${COLLECTION_NAME}' already exists. Setup complete.`);
        return;
    } catch (e: any) {
        // If it throws a 404, the collection doesn't exist, so we create it.
        if (e.code === 404) {
            console.log(`Collection '${COLLECTION_NAME}' not found, creating...`);
            await createCollection();
        } else {
            console.error('Error checking for collection:', e);
            throw e;
        }
    }
}

async function createCollection() {
    try {
        await databases.createCollection(
            DATABASE_ID,
            COLLECTION_ID,
            COLLECTION_NAME,
            [
                // Allow any authenticated user (including anonymous) to create games
                Permission.create(Role.users()),
                // Allow anyone to read games (for potential sharing features)
                Permission.read(Role.any()),
                // Only the user who created a document can update or delete it
                Permission.update(Role.users()),
                Permission.delete(Role.users()),
            ]
        );
        console.log(`Collection '${COLLECTION_NAME}' created successfully.`);

        console.log('Creating attributes...');
        await Promise.all([
            databases.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'prompt', 255, true),
            // FIX: The createUrlAttribute method does not take a size argument. Removed the invalid '2048' argument.
            databases.createUrlAttribute(DATABASE_ID, COLLECTION_ID, 'original_image_url', true),
            // FIX: The createUrlAttribute method does not take a size argument. Removed the invalid '2048' argument.
            databases.createUrlAttribute(DATABASE_ID, COLLECTION_ID, 'modified_image_url', true),
            // Max size for string attribute is 10485760 bytes (10MB)
            databases.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'differences_json', 20000, true),
            databases.createIntegerAttribute(DATABASE_ID, COLLECTION_ID, 'timer_duration', true)
        ]);
        console.log('Attributes created.');

        // It can take a moment for attributes to be available for indexing.
        console.log('Waiting for attributes to be available for indexing...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('Creating indexes...');
        await Promise.all([
            // FIX: Used the IndexType enum for the index type instead of a string literal to match the expected type.
            databases.createIndex(DATABASE_ID, COLLECTION_ID, 'by_prompt', IndexType.Key, ['prompt']),
        ]);
        console.log('Indexes created.');

        console.log('Database setup complete!');
    } catch (error) {
        console.error('Failed to create collection or attributes:', error);
        throw error;
    }
}

setupDatabase().catch(e => {
    console.error("Setup script failed:", e);
    // FIX: Replaced process.exit(1) to fix a type error where 'exit' is not found on 'process'.
    // Re-throwing the error will cause an unhandled promise rejection, stopping the script
    // with a non-zero exit code in Node.js.
    throw e;
});
