import pino from "pino";
import pinoCaller from "pino-caller";

const infoTransport = pino.transport({
    targets: [
        {
            target: 'pino-pretty',
            options: {
                destination: './logs/info.log',
                mkdir: true,
                colorize: false,
                translateTime: 'UTC:dd.mm.yyyy HH:MM:ss',
                level: 'info'
            }
        },
        {
            target: 'pino-pretty',
            options: {
                destination: process.stdout.fd,
                translateTime: 'UTC:dd.mm.yyyy HH:MM:ss',
                level: 'info'
            }
        }
    ]
});

const errorTransport = pino.transport({
    targets: [
        {
            target: 'pino-pretty',
            options: {
                destination: './logs/error.log',
                mkdir: true,
                colorize: false,
                translateTime: 'UTC:dd.mm.yyyy HH:MM:ss',
                level: 'error'
            }
        },
        {
            target: 'pino-pretty',
            options: {
                destination: process.stderr.fd,
                translateTime: 'UTC:dd.mm.yyyy HH:MM:ss',
                level: 'error'
            }
        }
    ]
});

const infoLogger = pino(infoTransport);
const errorLogger = pinoCaller(pino(errorTransport));

const logger = new Proxy(infoLogger, {
    get(target, prop) {
        if (['error', 'fatal'].includes(prop)) {
            return errorLogger[prop].bind(errorLogger);
        }
        return target[prop].bind(target);
    }
});

export default logger;
