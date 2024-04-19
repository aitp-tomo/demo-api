#!/bin/bash
sudo rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql-2023
sudo yum -y update
sudo dnf -y localinstall https://dev.mysql.com/get/mysql80-community-release-el9-3.noarch.rpm
sudo dnf -y install mysql mysql-community-client
sudo yum install mysql