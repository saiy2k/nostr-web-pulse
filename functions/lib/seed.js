"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedByPubkey = exports.seedFirestore = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
const indexer_1 = require("./indexer");
const nostr_1 = require("./nostr");
exports.seedFirestore = (0, https_1.onRequest)({
    timeoutSeconds: 3600,
    memory: '1GiB',
}, async (req, res) => {
    const sinceParam = req.query.since;
    const since = sinceParam ? parseInt(sinceParam, 10) : 0;
    firebase_functions_1.logger.info(`Seeding from timestamp: ${since}`);
    const start = Date.now();
    try {
        const result = await (0, indexer_1.runIndexer)(since, since);
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        const summary = {
            reactionsWritten: result.reactionsWritten,
            zapsWritten: result.zapsWritten,
            elapsedSeconds: elapsed,
            since,
        };
        firebase_functions_1.logger.info('Seed complete', summary);
        res.json(summary);
    }
    catch (err) {
        firebase_functions_1.logger.error('Seed failed', err);
        res.status(500).json({ error: String(err) });
    }
});
exports.seedByPubkey = (0, https_1.onRequest)({
    timeoutSeconds: 3600,
    memory: '1GiB',
}, async (req, res) => {
    const pubkey = req.query.pubkey;
    if (!pubkey) {
        res.status(400).json({ error: 'Missing required query param: pubkey (hex)' });
        return;
    }
    const sinceParam = req.query.since;
    const since = sinceParam ? parseInt(sinceParam, 10) : 0;
    firebase_functions_1.logger.info(`Seeding zaps for pubkey=${pubkey} since=${since}`);
    const start = Date.now();
    try {
        const zapEvents = await (0, nostr_1.fetchEvents)({
            kinds: [9735],
            '#p': [pubkey],
            since,
        });
        firebase_functions_1.logger.info(`Fetched ${zapEvents.length} kind 9735 events for pubkey`);
        const parsedZaps = zapEvents
            .map(nostr_1.parseZapReceiptEvent)
            .filter((z) => z !== null);
        firebase_functions_1.logger.info(`Parsed ${parsedZaps.length} URL-targeted zaps`);
        const zapsWritten = await (0, indexer_1.writeZaps)(parsedZaps);
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        const summary = {
            pubkey,
            since,
            fetched: zapEvents.length,
            parsedUrlZaps: parsedZaps.length,
            zapsWritten,
            elapsedSeconds: elapsed,
        };
        firebase_functions_1.logger.info('Seed by pubkey complete', summary);
        res.json(summary);
    }
    catch (err) {
        firebase_functions_1.logger.error('Seed by pubkey failed', err);
        res.status(500).json({ error: String(err) });
    }
});
//# sourceMappingURL=seed.js.map