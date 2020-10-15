import LogRocket from 'logrocket';

LogRocket.init('vpress/vpress-wp-plugin');

if (window.userSettings && window.userSettings.uid) {
  if (window.userSettings.uid == 2) {
    var currentUser = {
      name: 'savethechildren'
    };
  }
  LogRocket.identify(window.userSettings.uid, currentUser);
}
