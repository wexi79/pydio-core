Pydio 7 Dockerfile
=============
The resulting image has everything you need:
- Operating System (Ubuntu)
- Database (MySQL)
- PHP (PHP7 & php-fpm & a bunch of libraries)
- WebServer (NGINX & configs)
- Some basic configs (see conf/)

## How to use this

### Step 1

1. Download those files.
2. Change to this directory:
3. Grab APIKEY and APISECRET from (pydio.com)[https://pydio.com]
4. Edit Dockerfile with APIKEY and APISECRET
5. Run the following command. 
```    
    docker build .
```

### Step 2
Now that you have an image you need to run it.

    docker run --name Pydio7 -it -d -p 80:80 -p 443:443 -p 8090:8090 <IMAGE_HASH>

You can add a shared directory as a volume directory with the argument *-v /your-path/files/:/pydio-data/files/ -v /your-path/personal/:/pydio-data/personal/* like this :

    docker run -it -d -p 80:80 -p 443:443 -p 8090:8090 -v /your-path/files/:/pydio-data/files/ -v /your-path/personal/:/pydio-data/personal/ <IMAGE_HASH>

A MySQL server with a database is ready, you can use it with this parameters :

  - url : localhost
  - database name : pydio
  - user name : pydio
  - user password : pydio

### Step 3 (OPTIONAL)
Docker-fu reminders:
    docker ps -a        # list existing containers
    docker stop 00hash00 && docker rm 00hash00
    docker images       # list images
    docker rmi 00hash00 # remove image

## Pydio Post-install

To make sure that share feature will work, go to Main Pydio Option and add  :

  * Server URL : https//your_server_name  **PROTIP**: don't end with a **/**
  * Download folder : /var/www/pydio-core/data/public
  * Server download URL : https//your_server_name/data/public

# Credits
Freely inspired from kdelfour/pydio-docker and other containers out there.
