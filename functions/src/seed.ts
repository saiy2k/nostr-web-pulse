import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { runIndexer, writeZaps } from './indexer';
import { fetchEvents, parseZapReceiptEvent, type ParsedZap } from './nostr';

export const seedFirestore = onRequest(
  {
    timeoutSeconds: 3600,
    memory: '1GiB',
  },
  async (req, res) => {
    const sinceParam = req.query.since as string | undefined;
    const since = sinceParam ? parseInt(sinceParam, 10) : 0;

    logger.info(`Seeding from timestamp: ${since}`);
    const start = Date.now();

    try {
      const result = await runIndexer(since, since);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);

      const summary = {
        reactionsWritten: result.reactionsWritten,
        zapsWritten: result.zapsWritten,
        elapsedSeconds: elapsed,
        since,
      };

      logger.info('Seed complete', summary);
      res.json(summary);
    } catch (err) {
      logger.error('Seed failed', err);
      res.status(500).json({ error: String(err) });
    }
  },
);

export const seedByPubkey = onRequest(
  {
    timeoutSeconds: 3600,
    memory: '1GiB',
  },
  async (req, res) => {
    const pubkey = req.query.pubkey as string | undefined;
    if (!pubkey) {
      res.status(400).json({ error: 'Missing required query param: pubkey (hex)' });
      return;
    }

    const sinceParam = req.query.since as string | undefined;
    const since = sinceParam ? parseInt(sinceParam, 10) : 0;

    logger.info(`Seeding zaps for pubkey=${pubkey} since=${since}`);
    const start = Date.now();

    try {
      const zapEvents = await fetchEvents({
        kinds: [9735],
        '#p': [pubkey],
        since,
      });
      logger.info(`Fetched ${zapEvents.length} kind 9735 events for pubkey`);

      const parsedZaps = zapEvents
        .map(parseZapReceiptEvent)
        .filter((z): z is ParsedZap => z !== null);
      logger.info(`Parsed ${parsedZaps.length} URL-targeted zaps`);

      const zapsWritten = await writeZaps(parsedZaps);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);

      const summary = {
        pubkey,
        since,
        fetched: zapEvents.length,
        parsedUrlZaps: parsedZaps.length,
        zapsWritten,
        elapsedSeconds: elapsed,
      };

      logger.info('Seed by pubkey complete', summary);
      res.json(summary);
    } catch (err) {
      logger.error('Seed by pubkey failed', err);
      res.status(500).json({ error: String(err) });
    }
  },
);
