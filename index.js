import express from "express";
import dotenv from "dotenv";

dotenv.config()

const app = express();
const port = process.env.PORTA;

app.listen(port, () => {
    console.log(`Servidor up ${port}`)
})