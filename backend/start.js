import http from "http";
import express from "express";
import passport from "passport";
import session from "express-session";
import cookies from "cookie-parser";
import cors from "cors";
import routes from "./src/routes/routes.js";
import initializePassport from "./src/config/passportSteam.js";
import Database from "./src/classes/database.classes.js";
import User from "./src/classes/user.classes.js";
import config from "./config.json" assert { type: "json" };
import logger from "./src/config/logger.js";

const app = express();
const DatabaseObj = new Database();
const UserObj = new User();

// Initialize Passport
initializePassport(passport);

// Middleware
app.use(session({
    secret: config.secretKey,
    saveUninitialized: false,
    resave: false,
    cookie: {
        maxAge: 3600000,
        httpOnly: false,
        secure: true
    }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use(cookies());
app.use(cors({
    origin: [`http://${config.hostname}:5173`, `http://${config.hostname}:4173`],
    methods: ['GET', 'POST', 'OPTIONS', 'PATCH'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Routes
app.use(routes);

// Server
const server = http.createServer(app);
server.listen(config.port, async () => {
    DatabaseObj.pool = UserObj.pool;
    try {
        const rows = await DatabaseObj.query(`
            SELECT COUNT(*) AS index_exists
            FROM information_schema.statistics
            WHERE table_schema = database() 
            AND table_name = 'wp_player_skins'
            AND index_name = 'unique_steamid_weapon_defindex';
        `);

        if (rows[0].index_exists === 0) {
            await DatabaseObj.query(`
                ALTER TABLE wp_player_skins ADD UNIQUE INDEX unique_steamid_weapon_defindex (steamid, weapon_defindex)
            `);
            console.log('Index added to wp_player_skins.');
        } else {
            console.log('Index already exists.');
        }
    } catch (err) {
        console.error('Error: ', err);
    }

    logger.info(`Server listening on port ${config.port}`);
});