import { addErrorHandler, createMedlinkServer } from '../../server/app.ts';

// Netlify Server entry: serves the MedLink API and the /ws video-call signaling socket.
// The React frontend is served as static files from the publish directory (dist).
const { app, server } = createMedlinkServer();
addErrorHandler(app);

export const config = {
  path: ['/api/*', '/ws'],
};

export default server;
