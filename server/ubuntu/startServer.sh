#!/bin/sh
screen -d -m -S webserver nodemon /home/ubuntu/spacepirates.io/runServer.js
sudo iptables -A PREROUTING -t nat -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 3000