pipeline {
    agent any

    environment {
        DOCKER_COMPOSE_PATH = "${WORKSPACE}/docker-compose.yml"
        BACKEND_ENV = credentials('backend-env')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Prepare ENV') {
            steps {
                sh 'rm -f backend/.env'           // Xóa file .env cũ nếu có
                sh 'cp $BACKEND_ENV backend/.env' // Copy file credential vào đúng chỗ
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