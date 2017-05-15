set "curpath=%cd%"
winscp sftp://ubuntu@54.145.214.4 /command "synchronize remote %curpath%\client /home/ubuntu/spacepirates.io/client" exit
winscp sftp://ubuntu@54.145.214.4 /command "synchronize remote %curpath%\server /home/ubuntu/spacepirates.io/server" exit
winscp sftp://ubuntu@54.145.214.4 /command "synchronize remote %curpath%\runServer.js /home/ubuntu/spacepirates.io/runServer.js" exit
