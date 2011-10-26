Welcome to paddle-meister, the brains behind Vir-Pong's masterpiece human-powered pong game.

== Installation ==

You're going to need a machine running *nix or Mac OSX. These instructions were generated on a machine running Ubuntu 11.04 already connected to the internet. These commands (each line) should be typed or copy/pasted into a unix shell (or converted into a shell script).


To install node and the node package manager (npm):

echo 'export PATH=$HOME/local/bin:$PATH' >> ~/.bashrc
. ~/.bashrc
mkdir ~/local
mkdir ~/node-v0.4.9
cd ~/node-v0.4.9
curl http://nodejs.org/dist/node-v0.4.9.tar.gz | tar xz --strip-components=1
./configure --prefix=~/local
make install # ok, fine, this step probably takes more than 30 seconds...
curl http://npmjs.org/install.sh | sh

To install the express web framework and socket.io:

npm install -g express socket.io #installs express server (expressjs.org) and socket.io
cd <your directory name>
express express-test && cd express-test
npm install -d #resolve dependencies
node app.js #runs test server with node
#point browser to localhost:3000 (default) -- should see welcome message

To use paddle-meister:

First, clone this repository using any method you choose (github tutorial pages are helpful with this).


Then, navigate to the socket-test folder and execute

node server.js

The server will run at whichever port you specified in the server.js file.