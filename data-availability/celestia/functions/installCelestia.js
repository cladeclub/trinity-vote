const childProcess = require('child_process');
const path = require('path');

const INSTALL_LIGHT_NODE_COMMAND = 'docker compose up --detach';
const LIGHT_NODE_ALREADY_INSTALLED_REGEX = /Container (.*?) Running/;

/**
 * @callback installCelestiaCallback
 * @param {string|null} err
 */

/**
 * @param {installCelestiaCallback} callback
 * @returns {void}
 */
module.exports = callback => {
  childProcess.exec(
    INSTALL_LIGHT_NODE_COMMAND,
    { cwd: path.join(__dirname, '../light-node') },
    (err, stdout, stderr) => {
      if (err)
        return callback('terminal_error');

      console.log(stdout, stderr);

      if (LIGHT_NODE_ALREADY_INSTALLED_REGEX.test(stderr))
        return callback('already_installed');

      return callback(null);
    }
  );
};