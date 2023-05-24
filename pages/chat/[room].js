import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { FaArrowLeft } from 'react-icons/fa';
import Head from 'next/head';
import styles from '../../styles/chat.module.css';
import { TopicClient, CacheClient, CredentialProvider, Configurations, CacheListFetch } from '@gomomento/sdk-web';

const Chat = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [credentials, setCredentials] = useState(null);
  const [topicClient, setTopicClient] = useState(null);
  const [cacheClient, setCacheClient] = useState(null);
  const topicClientRef = useRef(topicClient);
  const cacheClientRef = useRef(cacheClient);
  const messagesRef = useRef(messages);
  const chatWindowRef = useRef(null);

  const updateTopicClient = (client) => {
    topicClientRef.current = client;
    setTopicClient(client);
  };

  const updateCacheClient = (client) => {
    cacheClientRef.current = client;
    setCacheClient(client);
  };

  const updateMessages = (newMessages) => {
    messagesRef.current = newMessages;
    setMessages(newMessages);
    console.log('test', messages);
  };

  useEffect(() => {
    topicClientRef.current = topicClient;
  }, [topicClient]);

  useEffect(() => {
    cacheClientRef.current = cacheClient;
  }, [cacheClient]);

  useEffect(() => {
    messagesRef.current = messages;
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    const storedCredentials = sessionStorage.getItem('credentials');
    if (storedCredentials) {
      const creds = JSON.parse(storedCredentials);
      // if (!creds.user?.claims?.momento?.exp || creds.user?.claims?.momento?.exp < Date.now()) {
      //   sessionStorage.removeItem('credentials');
      //   router.push('/');
      // } else {
      setCredentials(creds);
      //   }
      // } else {
      //   router.push('/');
    }
  }, []);

  useEffect(() => {
    async function setupMomento() {
      initializeTopicClient();
      initializeCacheClient();
      loadChatHistory();
    }

    if (credentials && !topicClient) {
      setupMomento();
    }

    if (credentials?.user?.username) {
      setName(credentials?.user?.username);
    }
  }, [credentials, router]);

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
    if (!topicClient && router.query.room) {
      topicClient = new TopicClient({
        configuration: Configurations.Browser.v1(),
        credentialProvider: CredentialProvider.fromString({ authToken: credentials.user.claims.momento.token })
      });

      updateTopicClient(topicClient);
      await topicClient.subscribe('chat', `${router.query.room}-chat`, {
        onItem: async (data) => await saveMessage(data.value()),
        onError: (err) => console.log(err)
      });
    }
  };

  const loadChatHistory = async () => {
    const chatHistoryResponse = await cacheClient.listFetch('chat', router.query.room);
    if (chatHistoryResponse instanceof CacheListFetch.Hit) {
      const history = chatHistoryResponse.valueListString().map(msg => JSON.parse(msg));
      updateMessages(history);
    }
  };

  const saveMessage = async (newMessage) => {
    console.log(newMessage);
    const detail = JSON.parse(newMessage);
    updateMessages([detail, ...messagesRef.current]);
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const msg = JSON.stringify({ username: name, message: message });
    topicClient.publish('chat', `${router.query.room}-chat`, msg);
    setMessage("");
    cacheClient.listPushFront('chat', router.query.room, msg);
  };



  return (
    <div>
      <Head>
        <title>{router.query.room} Chat | Momento</title>
      </Head>
      <div className={styles['header']}>
        <div onClick={() => router.push('/')} className={styles['back-button']}>
          <FaArrowLeft size={30} color='white'/>
        </div>
        <h1 className={styles.h1}>{router.query.room} Chat</h1>
      </div>
      <div className={styles['chat-container']}>
        <ul className={styles.messages}>
          {messages.map((msg, index) => (
            <li key={index} className={msg.username === name ? styles['my-message'] : styles['message']}>
              <strong>{msg.username}: </strong>{msg.message}
            </li>
          ))}
        </ul>
        <div ref={chatWindowRef} />
        <div className={styles['user-info']}>You are logged in as {name}</div>
        <div className={styles['input-container']}>
          <input
            type="text"
            className={styles['text-input']}
            placeholder="Type your message here"
            value={message}
            onChange={event => setMessage(event.target.value)}
            onKeyPress={event => event.key === 'Enter' ? sendMessage(event) : null}
          />
          <button className={styles.btn} onClick={e => sendMessage(e)}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
