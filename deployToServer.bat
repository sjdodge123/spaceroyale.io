set "curpath=%cd%"
winscp sftp://ubuntu@54.145.214.4 /command "synchronize remote %curpath% /home/ubuntu/spacepirates.io" exit
