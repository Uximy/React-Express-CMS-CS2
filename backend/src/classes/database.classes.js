import mysql from "mysql2/promise";
import config from "../../config.json" assert { type: "json" };

export default class Database {
    constructor() {
        this.pool = mysql.createPool({
            host: config.database.ip_db,
            user: config.database.user,
            password: config.database.password,
            database: config.database.database,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        })
    }

    pool = {}

    query = async (request, values) => {
        return new Promise((resolve, reject) => {
            this.pool.query(request, values, (error, results, fields) => {
                if (error) reject(error);
                resolve(results);
            });
        });
    };
}

