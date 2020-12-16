import { init, identify } from 'logrocket';

if (process.env.NODE_ENV === 'production') {
  init('vpress/vpress-wp-plugin');
  
  if (window.userSettings && window.userSettings.uid) {
    if (window.userSettings.uid == 2) {
      var currentUser = {
        name: 'savethechildren'
      };
    }
    identify(window.userSettings.uid, currentUser);
  }
}