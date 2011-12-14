Welcome to paddle-meister, the brains behind VirPong's human-powered pong game.

# Installation

## Game server (server.js)

### Requirements

* A relatively new machine (read: purchased/built in the last six years or so) running Linux or Mac OS X (these instructions were generated on a machine running Ubuntu 11.10 -- the configuration used for the generation of these installation instructions will henceforth be denoted with *italics in parentheses*.

* Basic UNIX tools should already be installed, but other requirements that might not be present in a standard operating system installation are: Curl (*we used 7.21.6*), Git (*we used 1.7.5.4*), and build-essential (a myriad of tools including Make (*we used 3.8.1*).

** Any of these can be installed on Ubuntu or a debian-based system with the aptitude package manager installed (*we used 0.8.16~exp5ubuntu13*) with the following command:
    sudo apt-get install curl git build-essential

* Connection to the internet!

### Instructions

Each line is a BASH command, so each command must be typed into the shell. These instructions will install the node server framework and libraries required to run paddle-meister in the current directory, so make sure you're somewhere where you have permissions to install lots of stuff!

#### Installing node and the node package manager.

    > echo 'export PATH=$HOME/local/bin:$PATH' >> ~/.bashrc
    > . ~/.bashrc
    > mkdir ~/local
    > mkdir ~/node-v0.6.1
    > cd ~/node-v0.6.1
    > curl http://nodejs.org/dist/node-v0.6.1.tar.gz | tar xz --strip-components=1
    > ./configure --prefix=~/local
    > make install
    > curl http://npmjs.org/install.sh | sh

#### Installing the express web framework and socket.io

    > npm install -g express socket.io

Now, you can test the installation with the following commands:

    > cd <a test directory name>
    > express express-test && cd express-test
    > npm install -d #resolves dependencies
    > node app.js #runs test server with node

If you point your browser to localhost:3000, you should see a welcome message!


## Running paddle-meister

First, clone this repository using any method you choose (the github tutorial pages are helpful with this).

    > git clone git://github.com/VirPong/paddle-meister.git

This should create a `paddle-meister` directory in your current location, navigate to it with the command

    > cd paddle-meister

If you want to change the port the server runs on, edit the server.js file with any text editor, and change the `PORT` variable at the very top to your desired port. Make sure nothing else is running on this port!

To run the server, all you need to do is execute:

    > node server.js

and log in with any VirPong client.