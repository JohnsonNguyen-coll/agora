export const loggerOptions = {
  level: 'info',
  redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]', '*.latchToken', '*.strategy', '*.password', '*.accessToken', '*.appSecret', '*.access_token', '*.refresh_token', '*.tokenHash']
};
