pipeline {
    agent any

    environment {
        DOCKER_COMPOSE_PATH = "${WORKSPACE}/docker-compose.yml"
        BACKEND_ENV = credentials('backend-env')
        FRONTEND_ENV = credentials('frontend-env')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Prepare ENV') {
            steps {
                sh 'rm -f backend/.env'
                sh 'cp $BACKEND_ENV backend/.env'
                sh 'rm -f frontend/.env'
                sh 'cp $FRONTEND_ENV frontend/.env'
            }
        }
        stage('Build Docker Images') {
            steps {
                sh 'docker-compose build'
            }
        }
        stage('Deploy') {
            steps {
                sh 'docker-compose down'
                sh 'docker-compose up -d'
            }
        }
    }
} 