import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import helmet from "helmet";
import dotenv from "dotenv";
dotenv.config();

const app = express()
const Origin = process.env.CORS_ORIGIN
app.use(cors({
  origin: Origin,
  methods: ["GET", "POST", "PUT", "DELETE"], 
  credentials: true, 
}));

app.options('*', cors());
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', Origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204); // No content
});
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        },
      }
    })
  );
  app.use(helmet.xssFilter({ setOnOldIE: true }));
  app.use(express.json({limit : "16kb"}))
  app.use(express.static("public"))
  app.use(cookieParser())
  
  // routes Import
  import userRouter  from "./routes/user.router.js";
  import dataRouter from "./routes/data.router.js"


  // routes declaration
  app.use("/portal", userRouter)
  app.use("/api",dataRouter)
  


  
  
  
  





export { app }