import { Strategy as SteamStrategy } from "passport-steam";
import config from "../../config.json" assert { type: "json" };
import jwt from "jsonwebtoken";


export default function (passport) {
    passport.use(new SteamStrategy({
        returnURL: `http://${config.hostname}:${config.port}/auth/steam/return`,
        realm: `http://${config.hostname}:${config.port}/`,
        apiKey: config.steamApiKey
    }, (identifier, profile, done) => {
        process.nextTick(() => {
            const steamid = identifier.split('/').pop(); // Устанавливаем steamid из идентификатора

            const accessToken = jwt.sign(steamid, config.secretKey);

            return done(null, {token: accessToken, steamid: steamid });
        });
    }));

    passport.serializeUser((user, done) => {
        done(null, user);
    });

    passport.deserializeUser((obj, done) => {
        done(null, obj);
    });
}
