# Bricked Lemons

## Introduction

**Bricked Lemons** is a website about a non-existent company that takes old useless computer parts **(Lemons)** and refurbishes them into fully operation and **premium gaming components** for your next PC build.

![Home Page Image](https://i.ibb.co/pr4Z927m/Screenshot-2026-08-12-015243.png)

## Tech Stack

#### **Frontend:**

- Vite (To set up the project)
- React (The frontend framework)
- Tailwind CSS (Just an overall help with styling)
- Typescript (For Typing)

#### **Backend:**

- Express (The backend framework)
- PostgreSQL (The database that stores all the users and products)
- Prisma (The ORM we're using instead of writing plain SQL queries and for seeding and setting up schema)
- Jest & Supertest (For testing)
- Typescript (For Typing)

#### **Shared:**

- Docker (For standardizing the project environment and setting up a postgreSQL database)

# Payment

## Test Payment Credentials **(For Reviewers/Testers only)**

### Card Information

- Card number: `4242 4242 4242 4242`
- Expiration date: `12/34`
- CVC: `123` (any 3/4 digit number)

### Card Holder Name

- Full name on card: `Testy McTesterson` (any name)

### Billing address

- Any Address Should work
- Postal Code: `12345` (any 5 digit number)

## Setup

### Via Docker **(Recommended)**

#### **Prerequisites:**

- Have [Git](https://git-scm.com/) installed
- Have [Docker](https://www.docker.com/get-started/) installed
- A Gmail address with **app** password ([Get from Here](https://nodejs.org/https://myaccount.google.com/apppasswords))
- [Cloudflare R2 Bucket](#cloudflare-r2-bucket-setup)
- Have a [Stripe](https://stripe.com/) Account
- An [Upstash Redis Database](https://upstash.com/) for rate limiting

#### **Quick Start:**

Run:

```sh
git clone https://github.com/Fareskingtube/bricked-lemons-private.git
cd bricked-lemons-private
cp ./backend/.example.env ./backend/.env
cp ./frontend/.example.env ./frontend/.env
```

Open the `.env` files in both `/frontend` and `/backend` directories and set the variables accordingly

Run:

```sh
docker compose up -d --build
```

Now if you open up `http://localhost:5173/` You should see the home page and that everything is working

### Native (Windows)

#### **Prerequisites:**

- Have [Git](https://git-scm.com/) installed
- Have [NodeJS](https://nodejs.org/) v24.11.1 or higher installed
- A Gmail address with **app** password ([Get from Here](https://nodejs.org/https://myaccount.google.com/apppasswords))
- [Cloudflare R2 Bucket](#cloudflare-r2-bucket-setup)
- [PostgreSQL](https://www.postgresql.org/) Database (**Local** or **Remote**)
- [MongoDB](https://www.mongodb.com/) Database (**Local** or **[Remote](https://www.mongodb.com/products/platform/atlas-database)**)
- Have a [Stripe](https://stripe.com/) Account
- An [Upstash Redis Database](https://upstash.com/) for rate limiting

Run:

```sh
git clone https://github.com/Fareskingtube/bricked-lemons-private.git
cd bricked-lemons-private
cp ./backend/.example.env ./backend/.env
cp ./frontend/.example.env ./frontend/.env
```

Open the `.env` files in both `/frontend` and `/backend` directories and set the variables accordingly **(Especially `/backend/.env`)**

Run:

```sh
# Start the backend server
cd backend
npm i
npm run generate
npm run migrate
npm run seed:pg
npm run build
npm run start

# Start the frontend server
cd ../frontend
npm i
npm run build
npm run start
```

Now if you open up `http://localhost:5173/` You should see the home page and that everything is working

<!-- TODO: Add the routs to the endpoints -->

## Endpoints

### Frontend:

- `http://localhost:5173`
  - `/` The homepage
  - `/login` For logging into an account
  - `/register` For creating an account
  - `/products` For browsing the products
  - `/products/:id` For for seeing a product info by id
  - `/cart` For seeing the cart and checking out
  - `/profile` For seeing/editing your account info
  - `/admin` For adding products/making people other accounts admin
  - `/payment/success` For after completing a payment and creating an order

### Backend:

- Express Server: `http://localhost:5000/api` (Port `5000` by default edit at `/backend/.env`)
  - `/health` For health check
  - `/products` For creating/getting products
  - `/auth` For login/registering
  - `/orders` For creating orders (Deprecated)/getting orders
  - `/cart` For all the cart operations
  - `/checkout` For creating a checkout session
  - `/webhooks` For webhooks

#### Review Microservice

- Express Server: `http://localhost:5001/api` you have to use separate express server at: [This Repo](https://github.com/FerooBasha/30907150100496-ShopSphere-ReviewService)
  - `/reviews/health` For health check
  - `/reviews/` For creating/getting reviews

#### Docker:

- PostgreSQL: `http://localhost:5433` (In docker container port is `5432`)
- MongoDB: `http://localhost:27017`

## Deployment

### Live site: [You can visit here](https://30907150100496-shop-sphere.vercel.app/)

#### Review Microservice: [Root API](https://30907150100496-shop-sphere-review-s-murex.vercel.app/api)

### Platforms used:

- [Vercel](https://vercel.com/) for frontend and backend deployment
- [Atlas](https://www.mongodb.com/products/platform/atlas-database) for MongoDB database
- [Supabase](https://supabase.com/) for PostgreSQL database

#### Admin Account for testing:

- Email: `admin@brickedlemons.com`
- Password: `Change_Me`

Same as account in `backend/.example.env`

### Health Check

If deployment is healthy `/api/health` gives `{"message":"Healthy","status":200}`

Monitor uptime at our [Uptime Robot Status Page](https://stats.uptimerobot.com/pGVMtU2Jtu)

### Any borrowed code has it's sources stated clearly above it

## Cloudflare R2 Bucket Setup

### Creating Bucket

1. Go to [Cloudflare website](https://www.cloudflare.com/) and **Login** or **Register** to an account
1. Go to your [dashboard](https://dash.cloudflare.com/)
1. Click on Sidebar -> Build -> Storage & Databases -> R2 Object Storage -> Overview
1. Create a bucket
1. On Overview -> Account Details -> API Tokens -> Manage
1. Create **Account API token** with settings:
   - Object **Read & Write**: Allows the ability to read, write, and list objects in specific buckets.
   - Apply to a specific buckets only (Set it yo the bucket you just created)
1. Take the **API Credentials** and put them in the `/backend/.env`
1. Go back into your **bucket** -> Settings -> CORS Policy
1. Click `+ Add` and set CORS Policy to:
   ```json
   [
   	{
   		"AllowedOrigins": ["http://localhost:5173", "http://localhost:3000"],
   		"AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
   		"AllowedHeaders": ["*"],
   		"ExposeHeaders": ["ETag"],
   		"MaxAgeSeconds": 3600
   	}
   ]
   ```

# Kubernetes

You must have a k8s cluster running already on your device

## **Step 1**

Make 4 `.env` files

- 2 For `./backend`
  1. `.env.aws-simulation`
  1. `.env.gcp-simulation`
- 2 For `./frontend`
  1. `.env.aws-simulation`
  1. `.env.gcp-simulation`

Set the variables fo both and remove all the `"` characters

## **Step 2**

Run

```bash
chmod +x deploy.sh
./deploy.sh
```

Use git bash instead of cmd/powershell if on windows

## **Step 3**

Forward all the ports you set in the [.env files](#step-1) for the `FRONTEND_URL` & `VITE_API_URL` variables using

```sh
# AWS simulation
kubectl port-forward svc/frontend <YOUR_HOST_PORT>:5173 -n aws-simulation

kubectl port-forward svc/backend <YOUR__HOST_PORT>:<YOUR_POD_PORT> -n aws-simulation

# GCP simulation
kubectl port-forward svc/frontend <YOUR_HOST_PORT>:5173 -n gcp-simulation

kubectl port-forward svc/backend <YOUR__HOST_PORT>:<YOUR_POD_PORT> -n gcp-simulation
```

If setup correctly you should see the the frontend running at `http://localhost:<YOUR_HOST_PORT>`

To see your logs for debugging run:
`kubectl logs -f <CONTAINER_NAME> -n <SIMULATION_NAME>`
