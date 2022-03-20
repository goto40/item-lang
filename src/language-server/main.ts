import { startLanguageServer } from 'langium';
import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';
import { createItemLanguageServices } from './item-language-module';

// Create a connection to the client
const connection = createConnection(ProposedFeatures.all);

// Inject the shared services and language-specific services
const { shared } = createItemLanguageServices({ connection });

// Start the language server with the shared services
startLanguageServer(shared);
