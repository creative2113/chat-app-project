# Momento Chat Application

Momento Chat is a real-time chat application built with Next.js and the Momento SDK. It provides a simple and intuitive chat interface for users to communicate in different chat rooms using [Momento Topics](https://docs.momentohq.com/introduction/momento-topics) as a broadcast WebSocket and [Momento Cache](https://docs.momentohq.com/) as a temporary data store.

## Features

- Real-time communication
- Support for multiple chat rooms
- User authentication*
- Message persistence

## How It Works

![Picture of the different Momento components in play to make the chat work](./public/how-it-works.png)

When a user logs into the application, an auth endpoint is hit to receive a temporary Momento auth token. Once the auth token is received, the application initializes the Momento Web SDK and subscribes to a topic for chat room creation. When a user creates a new chat room, a message will be published to the topic and indicate to all other browsers with the chat room list open to refresh. The browsers will pull from a [Momento set cache item](https://docs.momentohq.com/develop/datatypes#sets) containing the list of chat rooms available. 

When entering a chat room, the browser will first initialize the cache client and pull the chat history from a [Momento list cache item](https://docs.momentohq.com/develop/datatypes#lists). The list contains an ordered sequence of all messages sent in that chat room. After the chat history is fetched, it subscribes to the chat topic to be notified when a new message is sent. When a message is sent, the topic `onItem` event handler is triggered and it will add the new message to the view.

When a message is sent, the browser will publish to the chat topic and push the message to the list cache item in order to maintain the chat history. 

After 1 hour, the room and chat history will expire and be automatically deleted from the cache.

## Authentication

Authentication is a crucial part of this application. It ensures that only authorized users can access the chat services, and also provides a mechanism for controlling the scope of actions that a user can perform.

### Token Vending Machine

This example chat application uses a concept known as a Token Vending Machine (TVM) for handling user authentication. In this model, the server generates a temporary authorization token when a user logs in. This token is then passed to the client, which uses it to initialize the Momento SDK.

The temporary authorization token has scoped permissions, meaning it only grants the level of access necessary for the user to perform their intended actions within the application. For instance, a user may be granted permissions to read and write messages in a specific chat room, but not to do administrative tasks like creating or deleting an entire cache.

### Token Expiration

The temporary authorization token has an expiry time of one hour. Once the token expires, the user will need to obtain a new token to continue interacting with the application. This is an important security measure that helps to limit the potential damage if a token is compromised. By ensuring that tokens are short-lived, we reduce the window of opportunity for an attacker to use a stolen token.

By using a combination of a TVM, scoped permissions, and token expiration, we ensure robust and secure user authentication while maintaining a user-friendly experience. This approach strikes a balance between security and usability, allowing users to communicate safely and effectively.

## Installation

Before you can run the application, make sure that you have Node.js installed on your machine. If you don't have Node.js installed, you can download it from [here](https://nodejs.org/).

After cloning the repository, navigate to the project's directory and install the dependencies by running the following command:

```bash
npm install
```

## Running the Application

First, you will need to create your auth mechanism and token vending machine. After you create the auth, you can add a `.env` file to the root directory with an environment variable name of `NEXT_PUBLIC_AUTH_BASE_URL` that contains the base url to your API.

After setting up the environment variables, you can start the application by running the following command:

```bash
npm run dev
```

You should now be able to access the application at `http://localhost:3000`.

## Usage

When you open the application, you will automatically be signed in and issued an auth token. The app will randomly generate a name for you. When you create a new chat room, the chat will receive a randomly generated name from the Periodic Table of Elements (why not?). Enter a chat and type away!
