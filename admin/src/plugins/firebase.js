import firebase from 'firebase/app';
import 'firebase/storage';
import config from '../../firebase.config';

firebase.initializeApp(config);
export const storage = firebase.storage();
export default firebase;