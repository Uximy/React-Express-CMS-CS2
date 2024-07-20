import axios from "axios";
import config from "../../config.json" assert { type: "json" };
import Database from "./database.classes.js";
import mysql from "mysql2";
import SteamAccount from "steamid";
import logger from "../config/logger.js";
import { getCache, setCache } from "../config/redisCache.js";
const DatabaseObj = new Database();

export default class User {
    constructor()  {
        this.pool = mysql.createPool({
            host: config.databaseSkins.ip_db,
            user: config.databaseSkins.user,
            password: config.databaseSkins.password,
            database: config.databaseSkins.database,
            waitForConnections: true,
            multipleStatements: true,
            connectionLimit: 10,
            queueLimit: 0
        })
    }

    async profile(steamid) {
        if (!steamid) {
            throw new Error('User not authenticated or Steam ID not set.');
        }

        let steamProfile = null;
        const cacheKey = `profile:${steamid}`;
        let cachedProfile = await getCache(cacheKey);
        if (cachedProfile) {
            steamProfile = cachedProfile;
            console.log('востановил из кеша redis');
        }else{
            steamProfile = await axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${config.steamApiKey}&steamids=${steamid}`);
            steamProfile = steamProfile.data.response.players[0];
            await setCache(cacheKey, steamProfile);
            console.log('сохранил в кеш redis');
        }

        DatabaseObj.pool = mysql.createPool({
            host: config.database.ip_db,
            user: config.database.user,
            password: config.database.password,
            database: config.database.database,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        const [adminList] = await DatabaseObj.query(`
                SELECT 
                    iks_groups.name
                FROM
                    iks_admins
                LEFT JOIN
                    iks_groups
                ON
                    iks_admins.group_id = iks_groups.id
                WHERE iks_admins.sid = ?
            `, [steamid])
            .catch((err) => {
                logger.error('Error User Class: ', err)
                console.error('Error: ', err);
            });

        let account_id = new SteamAccount(steamid).accountid;
        const [VipList] = await DatabaseObj.query(`SELECT * FROM vip_users WHERE account_id = ?`, [account_id])
            .catch((err) => {
                logger.error('Error User Class: ', err)
                console.error('Error: ', err);
            });

        const jsonObjUser = {
            "nickName": steamProfile.personaname,
            "SteamID": steamProfile.steamid,
            "avatar": steamProfile.avatar,
            "avatarMedium": steamProfile.avatarmedium,
            "avatarFull": steamProfile.avatarfull,
            "adminGroup": adminList?.name,
            "vipGroup": VipList?.group
        }
        return jsonObjUser;
    }

    async getSkins(steamid){
        DatabaseObj.pool = this.pool;
        const response = await DatabaseObj.query(`
            SELECT 
                wp_player_skins.steamid, 
                wp_player_skins.weapon_defindex AS weapon_defindex, 
                wp_player_skins.weapon_paint_id,
                wp_player_knife.knife,
                wp_player_agents.agent_ct,
                wp_player_agents.agent_t,
                wp_player_gloves.weapon_defindex AS gloves_defindex,
                wp_player_music.music_id
            FROM 
                wp_player_skins 
            LEFT JOIN 
                wp_player_knife
            ON 
                wp_player_skins.steamid = wp_player_knife.steamid
            LEFT JOIN
                wp_player_agents
            ON
                wp_player_skins.steamid = wp_player_agents.steamid
            LEFT JOIN
                wp_player_gloves
            ON
                wp_player_skins.steamid = wp_player_gloves.steamid
            LEFT JOIN
                wp_player_music
            ON
                wp_player_skins.steamid = wp_player_music.steamid
            WHERE 
                wp_player_skins.steamid = ?
        `, [steamid, steamid])
        .catch((err) => {
            logger.error('Error User Class: ', err)
            console.log(err);
            return err;
        })

        const jsonObj = {
            weapons: [],
            knife: response[0].knife,
            gloves: response[0].gloves_defindex,
            music: response[0].music_id,
            agents: {
                agent_t: response[0].agent_ct,
                agent_ct: response[0].agent_t
            }
        };

        response.map((item) => {
            jsonObj.weapons.push(
                {
                    "weapon_defindex": item.weapon_defindex,
                    "weapon_paint_id": item.weapon_paint_id
                }
            )
        })
        
        return jsonObj;
    }

    async updateSkin(steamid, response){
        DatabaseObj.pool = this.pool;
        switch (response.type) {
            case 'Gloves':
                try {
                    await DatabaseObj.query(`
                        -- Для таблицы wp_player_skins
                        INSERT INTO wp_player_skins (steamid, weapon_defindex, weapon_paint_id) 
                        VALUES (?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                            weapon_defindex = VALUES(weapon_defindex), 
                            weapon_paint_id = VALUES(weapon_paint_id);
                        
                        -- Для таблицы wp_player_gloves
                        INSERT INTO wp_player_gloves (steamid, weapon_defindex) 
                        VALUES (?, ?)
                        ON DUPLICATE KEY UPDATE
                            weapon_defindex = VALUES(weapon_defindex);
                    `,
                    [
                        steamid, response.weapon_defindex, response.weapon_paint_id,
                        steamid, response.weapon_defindex
                    ])
                    .then(() => {
                        console.log('Запись на оружия добавлена или обновлена');
                    })
                    .catch((err) => {
                        logger.error('Error User Class: ', err)
                        console.error('Error: ', err);
                    })
                } catch (err) {
                    logger.error('Error User Class: ', err)
                    console.error('Error: ', err);
                }
                break;
            case 'weapon':
                    if((response.weapon_name).includes('knife') || response.weapon_name == 'weapon_bayonet') {
                        await DatabaseObj.query(`
                            -- Для таблицы wp_player_skins
                            INSERT INTO wp_player_skins (steamid, weapon_defindex, weapon_paint_id) 
                            VALUES (?, ?, ?)
                            ON DUPLICATE KEY UPDATE
                                weapon_defindex = VALUES(weapon_defindex), 
                                weapon_paint_id = VALUES(weapon_paint_id);
                            
                            -- Для таблицы wp_player_knife
                            INSERT INTO wp_player_knife (steamid, knife) 
                            VALUES (?, ?)
                            ON DUPLICATE KEY UPDATE
                                knife = VALUES(knife);
                        `,
                        [
                            steamid, response.weapon_defindex, response.weapon_paint_id,
                            steamid, response.weapon_name
                        ])
                        .then(() => {
                            console.log('Запись на нож добавлена или обновлена');
                        })
                        .catch((err) => {
                            logger.error('Error User Class: ', err)
                            console.error('Error: ', err);
                        })
                    }
                    else {
                        try {
                            await DatabaseObj.query(`
                                INSERT INTO wp_player_skins (steamid, weapon_defindex, weapon_paint_id)
                                VALUES (?, ?, ?)
                                ON DUPLICATE KEY UPDATE
                                weapon_paint_id = VALUES(weapon_paint_id)
                            `,
                            [
                                steamid, response.weapon_defindex, response.weapon_paint_id
                            ])
                            .then(() => {
                                console.log('Запись на оружия добавлена или обновлена');
                            })
                            .catch((err) => {
                                logger.error('Error User Class: ', err)
                                console.error('Error: ', err);
                            })
                            
                        } catch (err) {
                            console.error('Error: ', err);
                        }
                    }
                break;
            case 'agents':
                    try {
                        await DatabaseObj.query(`
                            INSERT INTO wp_player_agents (steamid, agent_ct, agent_t)
                            VALUES (?, 
                                    CASE WHEN ? = 3 THEN ? ELSE NULL END, 
                                    CASE WHEN ? = 2 THEN ? ELSE NULL END)
                            ON DUPLICATE KEY UPDATE
                                agent_ct = CASE WHEN VALUES(agent_ct) IS NOT NULL THEN VALUES(agent_ct) ELSE agent_ct END,
                                agent_t = CASE WHEN VALUES(agent_t) IS NOT NULL THEN VALUES(agent_t) ELSE agent_t END;
                        `,
                        [
                            steamid, response.team, response.agent, response.team, response.agent
                        ])
                        .then(() => {
                            console.log('Запись на агентов добавлена или обновлена');
                        })
                        .catch((err) => {
                            logger.error('Error User Class: ', err)
                            console.error('Error: ', err);
                        });
                        
                    } catch (err) {
                        logger.error('Error User Class: ', err)
                        console.error('Error: ', err);
                    }
                break;
            case 'music' :
                    try {
                        await DatabaseObj.query(`
                            INSERT INTO wp_player_music (steamid, music_id)
                            VALUES (?, ?)
                            ON DUPLICATE KEY UPDATE
                            music_id = VALUES(music_id)
                        `,
                        [
                            steamid, response.music
                        ])
                        .then(() => {
                            console.log('Запись на музыку добавлена или обновлена');
                        })
                        .catch((err) => {
                            logger.error('Error User Class: ', err)
                            console.error('Error: ', err);
                        })
                        
                    } catch (err) {
                        logger.error('Error User Class: ', err)
                        console.error('Error: ', err);
                    }
                break;
        }
    }
}