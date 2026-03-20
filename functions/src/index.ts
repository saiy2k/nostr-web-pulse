import * as admin from 'firebase-admin';

admin.initializeApp();

export { hourlyIndexer } from './indexer';
export { seedFirestore, seedByPubkey } from './seed';
