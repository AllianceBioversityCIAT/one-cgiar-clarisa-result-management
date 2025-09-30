// main-lambda.js
// Lambda entrypoint for NestJS using @vendia/serverless-express
const serverlessExpress = require('@vendia/serverless-express');
const { createApp } = require('./dist/main-lambda-bootstrap');

const stripStageFromPath = (event) => {
  const stage = event?.requestContext?.stage;
  if (!stage) {
    return;
  }
  const prefix = `/${stage}`;
  const strip = (value) => {
    if (typeof value !== 'string') {
      return value;
    }
    return value.startsWith(prefix) ? value.slice(prefix.length) || '/' : value;
  };

  if (event.path) {
    event.path = strip(event.path);
  }
  if (event.rawPath) {
    event.rawPath = strip(event.rawPath);
  }
  if (event.requestContext?.path) {
    event.requestContext.path = strip(event.requestContext.path);
  }
  if (event.requestContext?.http?.path) {
    event.requestContext.http.path = strip(event.requestContext.http.path);
  }
  if (event.requestContext?.resourcePath) {
    event.requestContext.resourcePath = strip(event.requestContext.resourcePath);
  }
  if (Array.isArray(event.resourcePaths)) {
    event.resourcePaths = event.resourcePaths.map(strip);
  }
  if (event.pathParameters) {
    event.pathParameters = {
      ...event.pathParameters,
      proxy: event.pathParameters.proxy ?? (event.path?.startsWith('/') ? event.path.slice(1) : event.path),
    };
  }
};

let cachedServer;
exports.handler = async (event, context) => {
  stripStageFromPath(event);

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
