import dotenv from 'dotenv';
import mongoose from 'mongoose';
if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}
const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_CLUSTER;


export async function mongoConnection() {
    console.log("Conectando con MongoDB Atlas...");
    console.log("URI:", uri);
    try {
        await mongoose.connect(uri);
        console.log("\n¡Conectado a MongoDB Atlas!");
        const db = mongoose.connection.db;
        // Verifica si la conexión es exitosa
        await db.command({ ping: 1 });

        console.log(`Conexión a la base de datos '${dbName}' exitosa`);
        return db;  // Devuelve la conexión a la base de datos
    } catch (error) {
        console.error("Error al conectar a MongoDB: ", error);
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

export default mongoConnection;