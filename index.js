import express, {json} from "express";
import cors from "cors";
import {MongoClient} from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs"

dotenv.config()

//Servidor
const app = express();
app.use(json())
app.use(cors())
const port = process.env.PORTA;

//Banco de dados
let db;
const mongoClient = new MongoClient(process.env.MONGO)
const promise = mongoClient.connect();
promise.then(() => {
    db = mongoClient.db(process.env.BANCO);
    console.log("DB conectado")
});
promise.catch((e) => console.log("erro no DB", e));

//POST de participantes (insere no DB)
app.post("/participants", async (req, res) => {
    const participant = req.body;
    const participantSchema = joi.object({name: joi.string().required()});
    const {error} = participantSchema.validate(participant);
    if(error){
        return res.sendStatus(422);
    }

    try {
        const participantExists = await db.collection("participants").findOne({name: participant.name});
        if (participantExists){
            return res.sendStatus(409);
        }

        await db.collection("participants").insertOne({name : participant.name, lastStatus: Date.now()});
        await db.collection("messages").insertOne({
            from: participant.name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().format('HH:mm:ss')
          });
        res.sendStatus(201);
        
    } catch (e) {
        return res.status(500);
    }
})

//GET de participantes (busca no DB)
app.get("/participants", async (req, res) => {
    try {
      const participants = await db.collection("participants").find().toArray();
      res.send(participants);
    } catch (e) {
    }
  });

//Remoção de usuários inativos
setInterval(async () => {
  const timeUp = Date.now() - (10000);
  try {
    const inactives = await db.collection("participants").find({lastStatus: {$lte: timeUp}}).toArray();
    if (inactives.length >= 1) {
      const msgInative = inactives.map(inactive => {
        return {
          from: inactive.name,
          to: 'Todos',
          text: 'sai da sala...',
          type: 'status',
          time: dayjs().format("HH:mm:ss")
        }
      });
      
      await db.collection("messages").insertMany(msgInative);
      await db.collection("participants").deleteMany({lastStatus:{$lte: timeUp}});
    }
  } catch (e) {
  }
}, 15000);

//POST de mensagens
app.post("/messages", async (req, res) => {
  const message = req.body;
  const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid('message', 'private_message').required()
  });
  const {msgError} = messageSchema.validate(message);
  if (msgError) {
    return res.status(422);
  }

  const {user} = req.headers;
  try {
    const participant = await db.collection("participants").findOne({name: user});
    if (!participant) {
      return res.sendStatus(422);
    }
    
    const { to, text, type } = message;
    await db.collection("messages").insertOne({
      to,
      text,
      type,
      from: user,
      time: dayjs().format('HH:mm:ss')
    });
    res.sendStatus(201);
  } catch (e) {
    return res.status(422);
  }
});

//GET de mensagens
app.get("/messages", async (req, res) => {
  const limit = parseInt(req.query.limit);
  const {user} = req.headers;

  try {
    const messages = await db.collection("messages").find().toArray();
    const filteredMessages = messages.filter(message => {
      const {from, to, type} = message;
      const toUser = to === "Todos" || from === user || to === user;
      const toPublic = type === "message";
      return toUser || toPublic;
    });

    if (limit) {
      return res.send(filteredMessages.slice(-limit));
    }
    res.send(filteredMessages);
  } catch (e) {
    return res.sendStatus(500);
  }
});

//POST status
app.post("/status", async (req, res) => {
  const {user} = req.headers; 
  try {
    const participant = await db.collection("participants").findOne({name: user});
    if (!participant) return res.sendStatus(404);
    await db.collection("participants").updateOne({name: user}, {$set: {lastStatus: Date.now()}});
    res.sendStatus(200);
  } catch (e) {
    return res.sendStatus(500);
  }
});

//DELETE mensagens (em construção)












app.listen(port, () => {
    console.log(`servidor porta ${port}`)
});