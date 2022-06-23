import express, {json} from "express";
import dotenv from "dotenv";
import {MongoClient} from "mongodb";
import joi from "joi";

dotenv.config()

const app = express();
app.use(json())
const port = process.env.PORTA;

let db;
const mongoClient = new MongoClient(process.env.MONGO_URL)

const promise = mongoClient.connect();
promise.then(() => {
    db = mongoClient.db(process.env.BANCO);
    console.log("DB conectado")
});

promise.catch((e) => console.log("Error", e))

app.post("/participants", (req, res) => {
    const participant = req.body;
    const participantSchema = joi.object({name: joi.string().required()});
    participantSchema.validate(participant);
})


app.listen(port, () => {
    console.log(`Servidor up porta ${port}`)
});