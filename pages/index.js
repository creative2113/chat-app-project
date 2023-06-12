import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { FaPlus } from 'react-icons/fa';
import Link from 'next/link';
import { faker } from '@faker-js/faker';
import { TopicClient, CacheClient, CredentialProvider, Configurations, CacheSetFetch, CollectionTtl } from '@gomomento/sdk-web';

export default function Home() {

	const [topicClient, setTopicClient] = useState(null);
	const [cacheClient, setCacheClient] = useState(null);
	const [chatRooms, setChatRooms] = useState([]);
	const [credentials, setCredentials] = useState(null);
	const topicClientRef = useRef(topicClient);
	const cacheClientRef = useRef(cacheClient);

	const updateTopicClient = (client) => {
		topicClientRef.current = client;
		setTopicClient(client);
	};

	const updateCacheClient = (client) => {
		cacheClientRef.current = client;
		setCacheClient(client);
	};

	useEffect(() => {
		topicClientRef.current = topicClient;
	}, [topicClient]);

	useEffect(() => {
		cacheClientRef.current = cacheClient;
	}, [cacheClient]);

	useEffect(() => {
		const storedCredentials = sessionStorage.getItem('credentials');
		if (storedCredentials) {
			const creds = JSON.parse(storedCredentials);
			if (!creds.user?.claims?.momento?.exp || creds.user?.claims?.momento?.exp < Date.now()) {
				sessionStorage.removeItem('credentials');
				login();
			} else {
				setCredentials(creds);
			}
		} else {
			login();
		}
	}, []);

	useEffect(() => {
		async function setupMomento() {
			initializeTopicClient();
			initializeCacheClient();
			getRoomList();
		}

		if (credentials && !topicClient) {
			setupMomento();
		}
	}, [credentials]);

	const getRoomList = async () => {
		const roomListResponse = await cacheClientRef.current.setFetch('chat', 'chat-room-list');
		if (roomListResponse instanceof CacheSetFetch.Hit) {
			setChatRooms(roomListResponse.valueArrayString().sort());
		} else {
			setChatRooms([]);
		}
	};

	const initializeCacheClient = () => {
		if (!cacheClient) {
			cacheClient = new CacheClient({
				configuration: Configurations.Browser.v1(),
				credentialProvider: CredentialProvider.fromString({ authToken: credentials.user.claims.momento.token }),
				defaultTtlSeconds: 3600
			});

			updateCacheClient(cacheClient);
		}
	};

	const initializeTopicClient = async () => {
		if (!topicClient) {
			topicClient = new TopicClient({
				configuration: Configurations.Browser.v1(),
				credentialProvider: CredentialProvider.fromString({ authToken: credentials.user.claims.momento.token })
			});

			updateTopicClient(topicClient);

			await topicClient.subscribe('chat', 'chat-room-created', {
				onItem: async () => await getRoomList(),
				onError: (err) => console.log(err)
			});
		}
	};

	const login = async () => {
		const username = `${faker.color.human()}-${faker.animal.type()}`.toLowerCase();
		const response = await fetch(`${process.env.NEXT_PUBLIC_AUTH_BASE_URL}/authenticate`, {
			method: 'POST',
			body: JSON.stringify({
				username
			})
		});

		const token = await response.json();
		console.log("fetching auth");
		const userInfoResponse = await fetch(`${process.env.NEXT_PUBLIC_AUTH_BASE_URL}/userinfo`);
		//console.log(`userInfoResponse is ${JSON.stringify(await userInfoResponse.json())}`);
		console.log(`userInfoResponse is ${JSON.stringify(userInfoResponse, null, 2)}`);

		const userInfo = await userInfoResponse.json();
		const credentials = {
			auth: token,
			user: { ...userInfo, username }
		};

		sessionStorage.setItem('credentials', JSON.stringify(credentials));
		setCredentials(credentials);
	};

	const handleCreateChatRoom = async () => {
		const chatRoomName = faker.science.chemicalElement().name;
		initializeCacheClient();
		await cacheClientRef.current.setAddElement('chat', 'chat-room-list', chatRoomName, { ttl: new CollectionTtl(3600) });
		await topicClientRef.current.publish('chat', 'chat-room-created', JSON.stringify({ name: chatRoomName }));
	};

	return (
		<div>
			<Head>
				<title>Chat Rooms | Momento</title>
			</Head>
			<div className="toolbar">
				<h1>Momento Instant Messenger⚡</h1>
				<button className="create-button" onClick={handleCreateChatRoom}>
					<FaPlus />
				</button>
			</div>
			<div className="chat-rooms-container">
				{chatRooms.map((room) => (
					<Link key={room} href={`/chat/${room}`}>
						<a className="chat-room-link">{room}</a>
					</Link>
				))}
			</div>
		</div>
	);
}
