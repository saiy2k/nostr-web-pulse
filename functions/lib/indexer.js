"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.hourlyIndexer = void 0;
exports.writeZaps = writeZaps;
exports.runIndexer = runIndexer;
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
const nostr_1 = require("./nostr");
const db = admin.firestore();
const BATCH_LIMIT = 450;
async function getSyncState() {
    const doc = await db.doc('Nostr_syncState/config').get();
    if (doc.exists) {
        return doc.data();
    }
    const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
    return {
        lastReactionSyncTimestamp: oneHourAgo,
        lastZapSyncTimestamp: oneHourAgo,
    };
}
async function getExistingIds(collection, ids) {
    const existing = new Set();
    const chunks = [];
    for (let i = 0; i < ids.length; i += 100) {
        chunks.push(ids.slice(i, i + 100));
    }
    for (const chunk of chunks) {
        const refs = chunk.map(id => db.doc(`${collection}/${id}`));
        const docs = await db.getAll(...refs);
        for (const doc of docs) {
            if (doc.exists)
                existing.add(doc.id);
        }
    }
    return existing;
}
async function writeReactions(reactions) {
    if (reactions.length === 0)
        return 0;
    const ids = reactions.map(r => r.eventId);
    const existing = await getExistingIds('Nostr_reactions', ids);
    const newReactions = reactions.filter(r => !existing.has(r.eventId));
    let batch = db.batch();
    let opCount = 0;
    let written = 0;
    for (const r of newReactions) {
        const reactionRef = db.doc(`Nostr_reactions/${r.eventId}`);
        batch.set(reactionRef, {
            eventId: r.eventId,
            kind: 17,
            url: r.url,
            domain: r.domain,
            content: r.content,
            reactionType: r.reactionType,
            pubkey: r.pubkey,
            createdAt: admin.firestore.Timestamp.fromMillis(r.createdAt * 1000),
        });
        opCount++;
        const urlDocId = (0, nostr_1.urlToDocId)(r.url);
        const urlRef = db.doc(`Nostr_urls/${urlDocId}`);
        batch.set(urlRef, {
            url: r.url,
            domain: r.domain,
            totalReactions: admin.firestore.FieldValue.increment(1),
            totalZaps: admin.firestore.FieldValue.increment(0),
            totalZapAmountMsats: admin.firestore.FieldValue.increment(0),
            likes: admin.firestore.FieldValue.increment(r.reactionType === 'like' ? 1 : 0),
            dislikes: admin.firestore.FieldValue.increment(r.reactionType === 'dislike' ? 1 : 0),
            emojis: admin.firestore.FieldValue.increment(r.reactionType === 'emoji' ? 1 : 0),
            lastActivity: admin.firestore.Timestamp.fromMillis(r.createdAt * 1000),
        }, { merge: true });
        opCount++;
        const domainRef = db.doc(`Nostr_domains/${r.domain}`);
        batch.set(domainRef, {
            domain: r.domain,
            totalReactions: admin.firestore.FieldValue.increment(1),
            totalZaps: admin.firestore.FieldValue.increment(0),
            totalZapAmountMsats: admin.firestore.FieldValue.increment(0),
            likes: admin.firestore.FieldValue.increment(r.reactionType === 'like' ? 1 : 0),
            dislikes: admin.firestore.FieldValue.increment(r.reactionType === 'dislike' ? 1 : 0),
            emojis: admin.firestore.FieldValue.increment(r.reactionType === 'emoji' ? 1 : 0),
            updatedAt: admin.firestore.Timestamp.now(),
        }, { merge: true });
        opCount++;
        written++;
        if (opCount >= BATCH_LIMIT) {
            await batch.commit();
            batch = db.batch();
            opCount = 0;
        }
    }
    if (opCount > 0)
        await batch.commit();
    return written;
}
async function writeZaps(zaps) {
    if (zaps.length === 0)
        return 0;
    const ids = zaps.map(z => z.eventId);
    const existing = await getExistingIds('Nostr_zaps', ids);
    const newZaps = zaps.filter(z => !existing.has(z.eventId));
    let batch = db.batch();
    let opCount = 0;
    let written = 0;
    for (const z of newZaps) {
        const zapRef = db.doc(`Nostr_zaps/${z.eventId}`);
        batch.set(zapRef, {
            eventId: z.eventId,
            kind: 9735,
            url: z.url,
            domain: z.domain,
            amountMsats: z.amountMsats,
            senderPubkey: z.senderPubkey,
            recipientPubkey: z.recipientPubkey,
            comment: z.comment,
            createdAt: admin.firestore.Timestamp.fromMillis(z.createdAt * 1000),
        });
        opCount++;
        const urlDocId = (0, nostr_1.urlToDocId)(z.url);
        const urlRef = db.doc(`Nostr_urls/${urlDocId}`);
        batch.set(urlRef, {
            url: z.url,
            domain: z.domain,
            totalReactions: admin.firestore.FieldValue.increment(0),
            totalZaps: admin.firestore.FieldValue.increment(1),
            totalZapAmountMsats: admin.firestore.FieldValue.increment(z.amountMsats),
            likes: admin.firestore.FieldValue.increment(0),
            dislikes: admin.firestore.FieldValue.increment(0),
            emojis: admin.firestore.FieldValue.increment(0),
            lastActivity: admin.firestore.Timestamp.fromMillis(z.createdAt * 1000),
        }, { merge: true });
        opCount++;
        const domainRef = db.doc(`Nostr_domains/${z.domain}`);
        batch.set(domainRef, {
            domain: z.domain,
            totalReactions: admin.firestore.FieldValue.increment(0),
            totalZaps: admin.firestore.FieldValue.increment(1),
            totalZapAmountMsats: admin.firestore.FieldValue.increment(z.amountMsats),
            likes: admin.firestore.FieldValue.increment(0),
            dislikes: admin.firestore.FieldValue.increment(0),
            emojis: admin.firestore.FieldValue.increment(0),
            updatedAt: admin.firestore.Timestamp.now(),
        }, { merge: true });
        opCount++;
        written++;
        if (opCount >= BATCH_LIMIT) {
            await batch.commit();
            batch = db.batch();
            opCount = 0;
        }
    }
    if (opCount > 0)
        await batch.commit();
    return written;
}
async function runIndexer(sincReaction, sinceZap) {
    const syncState = await getSyncState();
    const reactionSince = sincReaction ?? syncState.lastReactionSyncTimestamp;
    const zapSince = sinceZap ?? syncState.lastZapSyncTimestamp;
    firebase_functions_1.logger.info(`Fetching reactions since ${reactionSince}, zaps since ${zapSince}`);
    // Reactions pass
    const reactionEvents = await (0, nostr_1.fetchEvents)({
        kinds: [17],
        '#k': ['web'],
        since: reactionSince,
    });
    firebase_functions_1.logger.info(`Fetched ${reactionEvents.length} kind 17 events`);
    const parsedReactions = reactionEvents
        .map(nostr_1.parseReactionEvent)
        .filter((r) => r !== null);
    firebase_functions_1.logger.info(`Parsed ${parsedReactions.length} valid reactions`);
    const reactionsWritten = await writeReactions(parsedReactions);
    // Zaps pass
    const zapEvents = await (0, nostr_1.fetchEvents)({
        kinds: [9735],
        since: zapSince,
    });
    firebase_functions_1.logger.info(`Fetched ${zapEvents.length} kind 9735 events`);
    const parsedZaps = zapEvents
        .map(nostr_1.parseZapReceiptEvent)
        .filter((z) => z !== null);
    firebase_functions_1.logger.info(`Parsed ${parsedZaps.length} URL-targeted zaps`);
    const zapsWritten = await writeZaps(parsedZaps);
    // Update sync state
    const maxReactionTs = parsedReactions.reduce((max, r) => Math.max(max, r.createdAt), reactionSince);
    const maxZapTs = parsedZaps.reduce((max, z) => Math.max(max, z.createdAt), zapSince);
    await db.doc('Nostr_syncState/config').set({
        lastReactionSyncTimestamp: Math.max(maxReactionTs, reactionSince),
        lastZapSyncTimestamp: Math.max(maxZapTs, zapSince),
    });
    firebase_functions_1.logger.info(`Done: ${reactionsWritten} reactions, ${zapsWritten} zaps written`);
    return { reactionsWritten, zapsWritten };
}
exports.hourlyIndexer = (0, scheduler_1.onSchedule)({
    schedule: 'every 5 minutes',
    timeoutSeconds: 360,
    memory: '512MiB',
}, async () => {
    await runIndexer();
});
//# sourceMappingURL=indexer.js.map