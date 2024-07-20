import database from "./database.classes";
import config from "../../config.json" assert { type: "json" };
import io from "socket.io";
let databaseObj = new database();

const pool = mysql.createPool({
    host: config.database_lvlrank.ip_db,
    user: config.database_lvlrank.user,
    database: config.database_lvlrank.database,
    password: config.database_lvlrank.password,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const connection = io(server, {
    cors: {
        origin: [`https://${config.hostname}`], // Разрешите вашему клиенту на этом домене подключаться
        methods: ["GET", "POST"]
    }
});

export default class socket {
    static start() {
        connection.on('connection', async (sockets) => {
            console.log('Клиент подключился');

            sockets.on('disconnect', () => {
                console.log('Клиент отключился');
            });
        })
    }
} 