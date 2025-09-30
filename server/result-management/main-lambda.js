// main-lambda.js
// Lambda entrypoint for NestJS using @vendia/serverless-express
const serverlessExpress = require('@vendia/serverless-express');
const { createApp } = require('./dist/main-lambda-bootstrap');

let cachedServer;
exports.handler = async (event, context) => {
    if (!cachedServer) {
        console.log('[Lambda] Creating NestJS app for serverless-express...');
        const app = await createApp();
        const expressApp = app.getHttpAdapter().getInstance();
        cachedServer = serverlessExpress({ app: expressApp });
        console.log('[Lambda] NestJS app ready for serverless-express.');
    }
    console.log('[Lambda] Event received:', JSON.stringify(event));
    return cachedServer(event, context);
};
