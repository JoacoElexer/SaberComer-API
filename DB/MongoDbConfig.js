import { MongoClient, ServerApiVersion } from 'mongodb';
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGO_CLUSTER;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function mongoConnection() {
    console.log("Conectando con MongoDB Atlas");
    try {
        await client.connect();
        console.log("Conectado a MongoDB Atlas");
        const db = client.db(dbName);
        // Verifica si la conexión es exitosa
        await db.command({ ping: 1 });

        console.log(`Conexión a la base de datos '${dbName}' exitosa`);
        return db;  // Devuelve la conexión a la base de datos
    } catch (error) {
        console.error("Error al conectar a MongoDB", error);
        throw error; // Propaga el error para un manejo adecuado
    }
}

async function disconnect() {
    try {
        await client.close();
        console.log("Desconectado de MongoDB Atlas");
    } catch (error) {
        console.error("Error al desconectar de MongoDB", error);
    }
}

export default { mongoConnection, disconnect };