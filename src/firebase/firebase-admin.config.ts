import * as admin from 'firebase-admin';
import serviceAccount from '../../firebase-service-account.json';

export const initializeFirebaseAdmin = () => {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(
                serviceAccount as admin.ServiceAccount,
            ),
        });
    }

    return admin;
};