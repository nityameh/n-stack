// The docs drift logic lives in the project kit (so CI can run it without the plugin);
// the plugin re-exports it.
export { checkDocs, stampDoc } from '../project-kit/n-stack/bin/docs.mjs';
