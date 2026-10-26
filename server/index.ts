import { createServer } from 'node:http';
import { Effect, Layer } from 'effect';
import { HttpRouter } from 'effect/http';
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node';
import { readConfig } from './config';
import { clipStoreLayer } from './ClipStore';
import { fishLayer } from './FishProvider';
import { takeServiceLayer } from './TakeService';
import { routes } from './app';

const config = readConfig();
console.log(`Starting Dub Saboteur at http://${config.host}:${config.port}`);
const store = clipStoreLayer(config);
const services = takeServiceLayer(config).pipe(Layer.provide(fishLayer(config)), Layer.provideMerge(store));
const app = routes(config).pipe(Layer.provide(services));
const server = HttpRouter.serve(app, { disableLogger: true }).pipe(
  Layer.provide(NodeHttpServer.layer(() => createServer(), { host: config.host, port: config.port, gracefulShutdownTimeout: '2 seconds' })),
);
NodeRuntime.runMain(Layer.launch(server).pipe(Effect.tapError(() => Effect.logError(`Cannot start http://${config.host}:${config.port}. Check port collisions and local audio permissions.`))));
