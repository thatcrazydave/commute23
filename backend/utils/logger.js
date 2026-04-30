const isProd = process.env.NODE_ENV === 'production';

const fmt = (level, msg, meta) => {
  const ts = new Date().toISOString();
  const metaStr = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${ts}] [${level}] ${msg}${metaStr}`;
};

const Logger = {
  info: (msg, meta) => console.log(fmt('INFO', msg, meta)),
  warn: (msg, meta) => console.warn(fmt('WARN', msg, meta)),
  error: (msg, meta) => console.error(fmt('ERROR', msg, meta)),
  debug: (msg, meta) => {
    if (!isProd) console.log(fmt('DEBUG', msg, meta));
  },
};

module.exports = Logger;
