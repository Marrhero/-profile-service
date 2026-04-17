# Profile Intelligence Service

A REST API that enriches names using Genderize, Agify, and Nationalize APIs and stores the results.

## Stack

- Node.js
- Express
- PostgreSQL
- Axios

## Endpoints

### Create Profile

POST /api/profiles
Body: { "name": "john" }

### Get All Profiles

GET /api/profiles
Optional filters: ?gender=male&country_id=NG&age_group=adult

### Get Profile by ID

GET /api/profiles/:id

### Delete Profile

DELETE /api/profiles/:id

## Live URL

profile-service-production-e850.up.railway.app
