import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import User from "../classes/user.classes.js";
import config from "../../config.json" assert { type: "json" };
import logger from "../config/logger.js";
import YMoney from "../classes/YMoney.classes.js";

const router = express.Router();
const UserObj = new User();

const authenticateToken = (req, res, next) => {
    const token = req.cookies.access_token;

    if (!token) return res.sendStatus(404);

    jwt.verify(token, config.secretKey, (err, steamid) => {
        if (err) return res.sendStatus(403);
        req.session.steamid = steamid;
        next();
    });
};

router.get('/auth/steam', passport.authenticate('steam', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/');
});

router.get('/auth/steam/return', passport.authenticate('steam', { failureRedirect: '/' }), async (req, res) => {
    req.session.steamid = req.user.steamid;
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 7);
    res.cookie('access_token', req.user.token, {
        domain: config.hostname,
        httpOnly: true,
        secure: true,
        expires: currentDate
    });
    res.cookie('steamID', req.user.steamid, {
        domain: config.hostname,
        httpOnly: false,
        secure: true,
        expires: currentDate
    });
    res.redirect(`http://${config.hostname}:4173`);
});

router.post('/getUser', authenticateToken, async (req, res) => {
    if (req.session.steamid) {
        try {
            res.json(await UserObj.profile(req.session.steamid));
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else {
        res.status(404).json({ error: 'SteamID not found' });
    }
});

router.post('/getProfile', async (req, res) => {
    if (req.body.SteamID) {
        try {
            res.json(await UserObj.profile(req.body.SteamID));
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else {
        res.status(404).json({ error: 'SteamID not found' });
    }
});

router.post('/getSkinsPlayer', async (req, res) => {
    if (req.body.SteamID) {
        try {
            res.json(await UserObj.getSkins(req.body.SteamID));
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else {
        res.status(404).json({ error: 'SteamID not found' });
    }
});

router.patch('/updateSkinPlayer', authenticateToken, async (req, res) => {
    if (req.session.steamid) {
        try {
            UserObj.updateSkin(req.session.steamid, req.body).then(() => {
                res.sendStatus(200);
            })
            .catch((err) => {
                logger.error('Error: ', err);
            })
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else {
        res.status(404).json({ error: 'Object not found' });
    }
});


router.get('/payment', async (req, res) => {
    try {
        const YMoneyObj = new YMoney();
        let result = await YMoneyObj.payment(req);
        res.redirect(result.confirmation.confirmation_url);
    } catch (error) {
        console.error(error.message);
    }
});

router.post('/notificationPayment', async (req, res) => {
    try {
        const YMoneyObj = new YMoney();
        let result = await YMoneyObj.notificationPayment(req);
        res.status(result.status).send(result.message);
    } catch (error) {
        console.error('Error in /notificationPayment route:', error.message);
        res.status(500).send('Internal Server Error');
    }
})

export default router;
