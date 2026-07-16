import * as admin from 'firebase-admin';

export const initializeFirebaseAdmin = () => {
    if (!admin.apps.length) {
        const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

        if (!base64) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is missing from environment variables');
        }

        const serviceAccount = JSON.parse(
            Buffer.from(base64, 'base64').toString('utf-8'),
        ) as admin.ServiceAccount;

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    }

    return admin;
};