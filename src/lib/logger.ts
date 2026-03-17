const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  info: (msg: string, data?: unknown) => {
    if (isDev) {
      console.log(`[INFO] ${msg}`, data !== undefined ? data : "");
    }
  },
  error: (msg: string, data?: unknown) => {
    console.error(`[ERROR] ${msg}`, data !== undefined ? data : "");
  },
};
