import firebase from 'firebase/app';
import 'firebase/storage';
import 'firebase/firestore';
import config from '../../firebase.config';

firebase.initializeApp(config);

export const firestore = firebase.firestore();
export const storage = firebase.storage();
export default firebase;