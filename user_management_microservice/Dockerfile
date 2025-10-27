FROM node:20.19.1-bullseye

# Ορίζουμε το working directory
WORKDIR /usr/src/app

# Αντιγραφή μόνο package αρχείων για caching
COPY package*.json ./

# Εγκατάσταση εξαρτήσεων
RUN npm install

# Δε χρειάζεται COPY . . — θα γίνει μέσω volume στο docker-compose

# Εξαγωγή θύρας
EXPOSE 3000

# Εκκίνηση με nodemon
CMD ["npm", "run", "dev"]


