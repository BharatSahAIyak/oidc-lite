# User Service

## Overview
The User Service is a part of a NestJS application that handles user-related operations such as creating, retrieving, updating, and deleting users.

> If th used authorization key is `tenant-scoped` then `X-Stencil-Tenantid` is also required as a header specifying the tenant to be used

## Sequence Diagrams

![Users Sequence Diagram](../assets/sequence-diagrams/users.png)

## Create A User
### Request 
#### Create A User with random id
`POST /user`

#### Create A User with given id
`POST /user/:id`

#### Request Headers 
- authorization : `string`

#### Request body
- data: `{"active" : boolean, "additionalData" ?: "string", "membership" : string[], "userData" : UserDataDto, "email" : "string"}`

### Response

#### Response Codes

| Code | Description |
|------|-------------|
| 200  | The request was successful. The response will contain a JSON body. |
| 400  | The request was invalid and/or malformed. The response will contain an Errors JSON Object with the specific errors. This status will also be returned if a paid Auth Service license is required and is not present. |
| 401  | You did not supply a valid Authorization header. The header was omitted or your API key was not valid. The response will be empty
| 404  | The object you are trying to update doesn't exist. The response will be empty. |
| 500  | There was an internal error. A stack trace is provided and logged in the Auth Service log files. The response will be empty. |

- **Sample cURL**:
  ```sh
  curl -X POST http://localhost:3000/user \
    -H "Content-Type: application/json" \
    -H "Authorization: Basic <your_authorization_key>" \
    -d '{
      "name": "<user_name>",
      "email": "<user_email>"
    }'
- **Sample HTTPie**:
  ```sh
  http POST http://localhost:3000/user \
  Authorization:"Basic <your_authorization_key>"
  data:='{
    "name": "<user_name>",
    "email": "<user_email>"
  }'

## Return a User
### Reqeust 
#### Retrieves a user by their ID.
`GET /user/:id`
- **Description** : 
- **Authorization-Header**: Required
- **Parameters:**
    - `id`: string - The unique identifier of the user
    - `headers`: object - The request headers

#### Request Headers 
- authorization : `string`

#### Request Parameter
- id: `string`

### Response

#### Response Codes

| Code | Description |
|------|-------------|
| 200  | The request was successful. The response will contain a JSON body. |
| 400  | The request was invalid and/or malformed. The response will contain an Errors JSON Object with the specific errors. This status will also be returned if a paid Auth Service license is required and is not present. |
| 401  | You did not supply a valid Authorization header. The header was omitted or your API key was not valid. The response will be empty
| 404  | The object you are trying to update doesn't exist. The response will be empty. |
| 500  | There was an internal error. A stack trace is provided and logged in the Auth Service log files. The response will be empty. |

- **Sample cURL**:
  ```sh
  curl -X GET http://localhost:3000/user/<id> \
  -H "Authorization: Bearer <your_access_token>"

- **Sample HTTPie**:
  ```sh
  http GET http://localhost:3000/user/<id> \
  Authorization:"Bearer <your_access_token>"


## Update a User
### Request 
####  Updates an existing user's information
`POST /user/:id`

#### Request Headers 
- authorization : `string`

#### Request body
- data: `{"active" : boolean, "additionalData" ?: "string", "membership" : string[], "userData" : UserDataDto}`

#### Request Parameter
- id: `string`

### Response

#### Response Codes

| Code | Description |
|------|-------------|
| 200  | The request was successful. The response will contain a JSON body. |
| 400  | The request was invalid and/or malformed. The response will contain an Errors JSON Object with the specific errors. This status will also be returned if a paid Auth Service license is required and is not present. |
| 401  | You did not supply a valid Authorization header. The header was omitted or your API key was not valid. The response will be empty
| 404  | The object you are trying to update doesn't exist. The response will be empty. |
| 500  | There was an internal error. A stack trace is provided and logged in the Auth Service log files. The response will be empty. |

- **Sample cURL**:
  ```sh
  curl -X POST http://localhost:3000/user/<id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic <your_authorization_key>" \
  -d '{
    "name": "<updated_name>",
    "email": "<updated_email>"
  }'

- **Sample HTTPie**:
  ```sh
  http POST http://localhost:3000/user/<id> \
  Authorization:"Basic <your_authorization_key>"
  data:='{
    "name": "<updated_name>",
    "email": "<updated_email>"
  }'


## Delete a User
### Request 
#### Deletes a user or sets them as inactive.
`POST /user/:id`

#### Request Headers 
- authorization : `string`

#### Request body
- hardDelete: `boolean`

#### Request Parameter
- id: `string`

### Response

#### Response Codes

| Code | Description |
|------|-------------|
| 200  | The request was successful. The response will contain a JSON body. |
| 400  | The request was invalid and/or malformed. The response will contain an Errors JSON Object with the specific errors. This status will also be returned if a paid Auth Service license is required and is not present. |
| 401  | You did not supply a valid Authorization header. The header was omitted or your API key was not valid. The response will be empty
| 404  | The object you are trying to update doesn't exist. The response will be empty. |
| 500  | There was an internal error. A stack trace is provided and logged in the Auth Service log files. The response will be empty. |

- **Sample cURL**:
  ```sh
  curl -X POST http://localhost:3000/user/<id> \
  -H "Authorization: Basic <your_authorization_key>" \
  -d '{
    "hardDelete": "<true_or_false>"
  }'

- **Sample HTTPie**:
  ```sh
  http POST http://localhost:3000/user/<id> \
  Authorization:"Basic <your_authorization_key>"
  hardDelete="<true_or_false>"


<br>

# User Registration Service

The User Registration Service is part of a NestJS application that handles user registration operations, including creating, retrieving, updating, and deleting user registrations. It also provides functionality to create both a user and their registration in a single operation.


## Create A User Registration
### Request 
#### Creates a new user registration.
`POST /registration/:userId`

#### Request Headers 
- authorization : `string`

#### Request body
- data: `{"generateAuthenticationToken" ?: boolean, "applicationId" : string, "data" ?: string, "registrationId" ?: string}`

#### Request Parameter
- userId: `string`

### Response

#### Response Codes

| Code | Description |
|------|-------------|
| 200  | The request was successful. The response will contain a JSON body. |
| 400  | The request was invalid and/or malformed. The response will contain an Errors JSON Object with the specific errors. This status will also be returned if a paid Auth Service license is required and is not present. |
| 401  | You did not supply a valid Authorization header. The header was omitted or your API key was not valid. The response will be empty
| 404  | The object you are trying to update doesn't exist. The response will be empty. |
| 500  | There was an internal error. A stack trace is provided and logged in the Auth Service log files. The response will be empty. |

- **Sample cURL**:
  ```sh
  curl -X POST http://localhost:3000/registration/<userId> \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic <your_authorization_key>" \
  -d '{
    "applicationId": "<application_id>",
    "status": "<status>"
  }'

- **Sample HTTPie**:
  ```sh
  http POST http://localhost:3000/registration/<userId> \
  Authorization:"Basic <your_authorization_key>"
  data:='{
    "applicationId": "<application_id>",
    "status": "<status>"
  }'



## Return A User Registration
### Request 
#### Retrieves a user registration by user ID and application ID.
`GET registration/:userId/:applicationId`

#### Request Headers 
- authorization : `string`

#### Request Parameter
- userId: `string`
- applicationID: `string`

### Response

#### Response Codes

| Code | Description |
|------|-------------|
| 200  | The request was successful. The response will contain a JSON body. |
| 400  | The request was invalid and/or malformed. The response will contain an Errors JSON Object with the specific errors. This status will also be returned if a paid Auth Service license is required and is not present. |
| 401  | You did not supply a valid Authorization header. The header was omitted or your API key was not valid. The response will be empty
| 404  | The object you are trying to update doesn't exist. The response will be empty. |
| 500  | There was an internal error. A stack trace is provided and logged in the Auth Service log files. The response will be empty. |

- **Sample cURL**:
  ```sh
  curl -X GET http://localhost:3000/registration/<userId>/<applicationId> \
  -H "Authorization: Bearer <your_access_token>"


- **Sample HTTPie**:
  ```sh
  http GET http://localhost:3000/registration/<userId>/<applicationId> \
  Authorization:"Bearer <your_access_token>"



## Update A User Registration
### Request 
#### Updates an existing user registration.
`PATCH /registration/:userId/:applicationId`

#### Request Headers 
- authorization : `string`

#### Request Body 
- data : `{"data" ?: UserRegistrationData, "roles" : string[]}`

#### Request Parameter
- userId: `string`
- applicationID: `string`

### Response

#### Response Codes

| Code | Description |
|------|-------------|
| 200  | The request was successful. The response will contain a JSON body. |
| 400  | The request was invalid and/or malformed. The response will contain an Errors JSON Object with the specific errors. This status will also be returned if a paid Auth Service license is required and is not present. |
| 401  | You did not supply a valid Authorization header. The header was omitted or your API key was not valid. The response will be empty
| 404  | The object you are trying to update doesn't exist. The response will be empty. |
| 500  | There was an internal error. A stack trace is provided and logged in the Auth Service log files. The response will be empty. |

- **Sample cURL**:
  ```sh
  curl -X PATCH http://localhost:3000/registration/<userId>/<applicationId> \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic <your_authorization_key>" \
  -d '{
    "status": "<updated_status>"
  }'


- **Sample HTTPie**:
  ```sh
  http PATCH http://localhost:3000/registration/<userId>/<applicationId> \
  Authorization:"Basic <your_authorization_key>"
  data:='{
    "status": "<updated_status>"
  }'



## Delete A User Registration
### Request 
#### Deletes a user registration.
`DELETE /registration/:userId/:applicationId`

#### Request Headers 
- authorization : `string`

#### Request Parameter
- userId: `string`
- applicationID: `string`

### Response

#### Response Codes

| Code | Description |
|------|-------------|
| 200  | The request was successful. The response will contain a JSON body. |
| 400  | The request was invalid and/or malformed. The response will contain an Errors JSON Object with the specific errors. This status will also be returned if a paid Auth Service license is required and is not present. |
| 401  | You did not supply a valid Authorization header. The header was omitted or your API key was not valid. The response will be empty
| 404  | The object you are trying to update doesn't exist. The response will be empty. |
| 500  | There was an internal error. A stack trace is provided and logged in the Auth Service log files. The response will be empty. |

- **Sample cURL**:
  ```sh
  curl -X DELETE http://localhost:3000/registration/<userId>/<applicationId> \
  -H "Authorization: Bearer <your_access_token>"


- **Sample HTTPie**:
  ```sh
  http DELETE http://localhost:3000/registration/<userId>/<applicationId> \
  Authorization:"Bearer <your_access_token>"



## Create A User And User Registration
### Request 
#### Creates both a user and their registration in a single operation.
`POST /registration/combined`

#### Request Headers 
- authorization : `string`

#### Request Body 
- data : `CreateUserAndUserRegistration`

#### Request Parameter
- userId: `string`

### Response

#### Response Codes

| Code | Description |
|------|-------------|
| 200  | The request was successful. The response will contain a JSON body. |
| 400  | The request was invalid and/or malformed. The response will contain an Errors JSON Object with the specific errors. This status will also be returned if a paid Auth Service license is required and is not present. |
| 401  | You did not supply a valid Authorization header. The header was omitted or your API key was not valid. The response will be empty
| 404  | The object you are trying to update doesn't exist. The response will be empty. |
| 500  | There was an internal error. A stack trace is provided and logged in the Auth Service log files. The response will be empty. |

- **Sample cURL**:
  ```sh
  curl -X POST http://localhost:3000/registration/combined \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic <your_authorization_key>" \
  -d '{
    "user": {
      "name": "<user_name>",
      "email": "<user_email>"
    },
    "registration": {
      "applicationId": "<application_id>",
      "status": "<status>"
    }
  }'


- **Sample HTTPie**:
  ```sh
  http POST http://localhost:3000/registration/combined \
  Authorization:"Basic <your_authorization_key>"
  data:='{
    "user": {
      "name": "<user_name>",
      "email": "<user_email>"
    },
    "registration": {
      "applicationId": "<application_id>",
      "status": "<status>"
    }
  }'




## Authorization
All endpoints are protected by authorization headers which requires authorization and x-stencil-tenanid values to be passed in headers, which are verified using the `HeaderAuthService`.

## Error Handling

The service uses standard NestJS exceptions to handle errors:
- `UnauthorizedException`: Thrown when authorization fails.
- `BadRequestException`: Thrown when required parameters are missing or invalid.
- `InternalServerErrorException`: Thrown when a server error occurs during an operation.

## Response Format
All endpoints return a standardized response object containing:
- `success`: Boolean indicating operation success
- `message`: Descriptive message about the operation result
- `data`: The requested or manipulated data (when applicable)

