# MLA Fitness App

A simple and interactive fitness tracking application built with multiple microservices and programming languages. This application allows users to track their exercises and monitor their progress over time.

The Activity Tracking functionality uses the MERN stack (MongoDB, Express.js, React, Node.js), the Analytics service uses Python/Flask and the Authentication Microservice using Java.

![Screenshot](screenshots/frontpage.png)  

### Project Setup Instructions

- One fork per group: Before you begin, one member of your group should fork this repository.
- Each group member should clone the forked version of the repository to their local environment or GitHub Codespace.
- All project work should be done in your group's fork.

**Important -- Add .env and application.properties files:**
Files containing environment variables and secret keys are not uploaded to the github repository for security reasons. These files must be added before you can run the app.
To do so manually:
- In the **activity-tracking**, **analytics**, **graphql-gateway**, and **ai-speech-parser** directories there is an `.env.example` file.
- In each directory, copy the contents of the `.env.example` into a new `.env` file.
- Replace any placeholder values with the real values (such as JWT Secret Key)
- The real values can be found in the group's shared Google Drive.
- In `authservice/src/main/resources`, copy the contents of `application.properties.example` into a new `application.properties` file.
- Again, replace any placeholder values with the real values.

Alternatively, run the script `create-env-files.sh` from the root directory to have the files and a JWT secret key automatically generated for you.
You will still need to insert the API Key for **ai-speech-parser**.

### Current Features

- User registration for personalized tracking
- Log various types of exercises with descriptions, duration, and date
- See weekly and overall statistics
- Interactive UI with Material-UI components
- Real-time data persistence with MongoDB

### Prerequisites

- Node.js
- MongoDB
- npm or yarn
- Python Flask
- Java 8
(all already installed in the devcontainer)
- Access to the group's Google Drive for secrets

## Development in Github Codespaces

#### Starting a new Devcontainer

1. Click on "Code"
2. Switch to the "Codespaces" tab
3. Create new Codespace from main
<img src="screenshots/codespaces.png" width="300"/>


4. Open Codespace in VS code for best experience:
<img src="screenshots/codespaces2.png" width="300"/>


Walktrough:

https://docs.github.com/en/codespaces/developing-in-a-codespace/using-github-codespaces-in-visual-studio-code


#### Check needed packages are installed:
```sh
sh .devcontainer/check-installation.sh 
```

expected output:

```
Checking installations...
node is /usr/local/bin/node
node is installed with version: v18.16.0
npm is /usr/local/bin/npm
npm is installed with version: 9.5.1
python3 is /usr/bin/python3
python3 is installed with version: Python 3.9.2
pip3 is /usr/bin/pip3
pip3 is installed with version: pip 20.3.4 from /usr/lib/python3/dist-packages/pip (python 3.9)
gradle is /usr/bin/gradle
gradle is installed with version: 
------------------------------------------------------------
Gradle 4.4.1
------------------------------------------------------------
......
Done checking installations.
```

if you're missing any version, please contact your course administrator. 


### Building entire project with Docker (+ starting containers up)
```sh
docker-compose up --build
```

### Start existing containers (no rebuild of images)
```sh
docker-compose up
```

#### Spinning up a single service
```sh
docker-compose up [servicename]
```

#### Shutting down a service
```sh
docker-compose down [servicename]
```


## Development without using Docker-Compose

#### Running Node.js Activity Tracker

```sh
cd activity-tracking
npm install
nodemon server
```

#### Running Flask application
```sh
cd analytics
flask run -h localhost -p 5050
```

#### Running Java application
```sh
cd authservice
./gradlew clean build
./gradlew bootRun
```

#### Start the Frontend 

```sh
cd frontend
npm install
npm start
```

#### spin up MongoDB without docker-compose:
```
docker run --name mongodb -d -p 27017:27017 -v mongodbdata:/data/db mongo:latest
```

### Connect to MongoDB

```
mongosh -u root -p cfgmla23 --authenticationDatabase admin --host localhost --port 27017
```

show registered activities:
```
db.exercises.find()
```

show registered users:
```
db.users.find()
```


## Deployment
The application is containerized using Docker and can be deployed on any platform that supports Docker containers. For AWS deployment, a GitHub Actions pipeline is configured for CI/CD.
