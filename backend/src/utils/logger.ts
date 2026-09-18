export const logger = {
  info: (msg: string, ...args: unknown[]) => console.log([INFO] , ...args),
  warn: (msg: string, ...args: unknown[]) => console.warn([WARN] , ...args),
  error: (msg: string, ...args: unknown[]) => console.error([ERROR] , ...args),
  debug: (msg: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug([DEBUG] , ...args);
    }
  },
};

export default logger;
