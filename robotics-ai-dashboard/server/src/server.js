import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import api from './routes/api.js';
import {attachSocket} from './socket/index.js';
const app=express();
app.use(helmet());
app.use(compression());
app.use(cors({origin:(process.env.CLIENT_ORIGIN||'http://localhost:5173').split(','),credentials:false}));
app.use(express.json({limit:'1mb'}));
app.use('/api',rateLimit({
        windowMs:60_000,
        limit:180,
        standardHeaders:true,
        legacyHeaders:false
    }),
    api
);
app.get('/health',(req,res)=>res.json({ok:true,service:'robotics-dashboard'}));
app.use((err,req,res,next)=>{
    console.error(err);
    res.status(err.status||500).json({
        error:process.env.NODE_ENV==='production'
        ?'Internal server error'
        :err.message
    });
});
const server=http.createServer(app);

const io = attachSocket(server);

app.set('io', io);

console.log('Socket.IO attached to Express');
server.listen(process.env.PORT||5000,()=>{
    console.log(`API listening on ${process.env.PORT||5000}`)
});
process.on('unhandledRejection',e=>{
    console.error('Unhandled rejection',e)
});
