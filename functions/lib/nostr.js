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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_RELAYS = void 0;
exports.classifyReaction = classifyReaction;
exports.normalizeUrl = normalizeUrl;
exports.extractDomain = extractDomain;
exports.urlToDocId = urlToDocId;
exports.parseReactionEvent = parseReactionEvent;
exports.parseZapReceiptEvent = parseZapReceiptEvent;
exports.fetchEvents = fetchEvents;
const ws_1 = __importDefault(require("ws"));
globalThis.WebSocket = ws_1.default;
const nostr_tools_1 = require("nostr-tools");
const crypto = __importStar(require("crypto"));
exports.DEFAULT_RELAYS = [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.nostr.band',
    'wss://purplepag.es',
    'wss://relay.snort.social',
];
const ZAP_URL_KIND_PREFIX = '39735';
function classifyReaction(content) {
    if (content === '+' || content === '')
        return 'like';
    if (content === '-')
        return 'dislike';
    return 'emoji';
}
function normalizeUrl(url) {
    try {
        const parsed = new URL(url);
        parsed.hash = '';
        let normalized = parsed.toString();
        if (normalized.endsWith('/')) {
            normalized = normalized.slice(0, -1);
        }
        return normalized.toLowerCase();
    }
    catch {
        return url.toLowerCase();
    }
}
function extractDomain(url) {
    try {
        return new URL(url).hostname.toLowerCase();
    }
    catch {
        return '';
    }
}
function urlToDocId(url) {
    let key = url
        .replace(/^https?:\/\//, '')
        .replace(/\//g, '__')
        .toLowerCase();
    if (key.endsWith('__')) {
        key = key.slice(0, -2);
    }
    if (key.length > 1400) {
        const hash = crypto.createHash('sha256').update(key).digest('hex').slice(0, 8);
        key = key.slice(0, 1392) + '_' + hash;
    }
    return key;
}
function getTagValue(event, tagName) {
    const tag = event.tags.find(t => t[0] === tagName);
    return tag?.[1];
}
function getAllTags(event, tagName) {
    return event.tags.filter(t => t[0] === tagName);
}
function parseReactionEvent(event) {
    const kTag = getTagValue(event, 'k');
    if (kTag !== 'web')
        return null;
    const iTag = getTagValue(event, 'i');
    if (!iTag)
        return null;
    try {
        new URL(iTag);
    }
    catch {
        return null;
    }
    if (!iTag.startsWith('http://') && !iTag.startsWith('https://'))
        return null;
    const url = normalizeUrl(iTag);
    const domain = extractDomain(url);
    if (!domain)
        return null;
    return {
        eventId: event.id,
        url,
        domain,
        content: event.content,
        reactionType: classifyReaction(event.content),
        pubkey: event.pubkey,
        createdAt: event.created_at,
    };
}
function parseZapReceiptEvent(event) {
    const aTags = getAllTags(event, 'a');
    let targetUrl;
    for (const tag of aTags) {
        const val = tag[1];
        if (val && val.startsWith(ZAP_URL_KIND_PREFIX + ':')) {
            const parts = val.split(':');
            // Format: 39735:<pubkey>:<url> — rejoin from index 2 for URLs with colons
            const urlCandidate = parts.slice(2).join(':');
            if (urlCandidate.startsWith('http://') || urlCandidate.startsWith('https://')) {
                targetUrl = urlCandidate;
                break;
            }
        }
    }
    if (!targetUrl)
        return null;
    const url = normalizeUrl(targetUrl);
    const domain = extractDomain(url);
    if (!domain)
        return null;
    let amountMsats = 0;
    let senderPubkey = '';
    let comment = '';
    const descriptionTag = getTagValue(event, 'description');
    if (descriptionTag) {
        try {
            const zapRequest = JSON.parse(descriptionTag);
            const amountTag = zapRequest.tags?.find((t) => t[0] === 'amount');
            if (amountTag?.[1]) {
                amountMsats = parseInt(amountTag[1], 10) || 0;
            }
            comment = zapRequest.content || '';
            senderPubkey = zapRequest.pubkey || '';
        }
        catch {
            // Malformed description — continue with defaults
        }
    }
    if (!senderPubkey) {
        senderPubkey = getTagValue(event, 'P') || '';
    }
    const recipientPubkey = getTagValue(event, 'p') || '';
    return {
        eventId: event.id,
        url,
        domain,
        amountMsats,
        senderPubkey,
        recipientPubkey,
        comment,
        createdAt: event.created_at,
    };
}
async function fetchEvents(filter, relays = exports.DEFAULT_RELAYS, timeoutMs = 15000) {
    const pool = new nostr_tools_1.SimplePool();
    try {
        const events = await pool.querySync(relays, filter);
        return events;
    }
    finally {
        pool.close(relays);
    }
}
//# sourceMappingURL=nostr.js.map