import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';
const isWindows = process.platform === 'win32';

const VALID_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
const envLevel = process.env.LOG_LEVEL?.toLowerCase();
const level = VALID_LEVELS.includes(envLevel) ? envLevel : (isDev ? 'info' : 'warn');

const pinoInstance = pino({
    level,
    ...(isDev && {
        transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' }
        }
    })
});

// Windows console can't render emoji even with UTF-8 code page — strip them at the logger level
const EMOJI_RE = /[\p{Extended_Pictographic}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;
const sanitize = isWindows
    ? (s) => String(s).replace(EMOJI_RE, '').replace(/  +/g, ' ').trim()
    : (s) => s;

function log(pinoFn, message, data) {
    const msg = sanitize(message);
    if (data !== undefined && data !== '') {
        typeof data === 'object' ? pinoFn(data, msg) : pinoFn({ data }, msg);
    } else {
        pinoFn(msg);
    }
}

const Logger = {
    debug: (msg, data) => log(pinoInstance.debug.bind(pinoInstance), msg, data),
    info:  (msg, data) => log(pinoInstance.info.bind(pinoInstance), msg, data),
    warn:  (msg, data) => log(pinoInstance.warn.bind(pinoInstance), msg, data),
    error: (msg, data) => log(pinoInstance.error.bind(pinoInstance), msg, data),
};

export default Logger;
