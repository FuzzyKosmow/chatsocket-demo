    'use strict';

    var usernamePage = document.querySelector('#username-page');
    var chatPage = document.querySelector('#chat-page');
    var usernameForm = document.querySelector('#usernameForm');
    var messageForm = document.querySelector('#messageForm');
    var messageInput = document.querySelector('#message');
    var messageArea = document.querySelector('#messageArea');
    var connectingElement = document.querySelector('.connecting');

    var stompClient = null;
    var username = null;
    var typing = false;
    var timeout = undefined;
    messageInput.addEventListener('input', onTyping, true);
    var colors = [
        '#2196F3', '#32c787', '#00BCD4', '#ff5652',
        '#ffc107', '#ff85af', '#FF9800', '#39bbb0'
    ];

    function connect(event) {
        username = document.querySelector('#name').value.trim();

        if(username) {
            usernamePage.classList.add('hidden');
            chatPage.classList.remove('hidden');

            var socket = new SockJS('/ws');
            stompClient = Stomp.over(socket);

            stompClient.connect({}, onConnected, onError);
        }
        event.preventDefault();
    }


    function onConnected() {
        // Subscribe to the Public Topic
        stompClient.subscribe('/topic/public', onMessageReceived);

        // Tell your username to the server
        stompClient.send("/app/chat.addUser",
            {},
            JSON.stringify({sender: username, type: 'JOIN'})
        )

        connectingElement.classList.add('hidden');
    }


    function onError(error) {
        connectingElement.textContent = 'Could not connect to WebSocket server. Please refresh this page to try again!';
        connectingElement.style.color = 'red';
    }


    function sendMessage(event) {
        var messageContent = messageInput.value.trim();
        if(messageContent && stompClient) {
            var chatMessage = {
                sender: username,
                content: messageInput.value,
                type: 'CHAT'
            };
            stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
            messageInput.value = '';
        }
        event.preventDefault();
    }


    function onMessageReceived(payload) {
        var message = JSON.parse(payload.body);
        if (message.type === 'TYPING') {
                displayTypingNotification(message.sender);
                return;
            }
        var messageElement = document.createElement('li');

        if(message.type === 'JOIN') {
            messageElement.classList.add('event-message');
            message.content = message.sender + ' joined!';
        } else if (message.type === 'LEAVE') {
            messageElement.classList.add('event-message');
            message.content = message.sender + ' left!';
        } else {
            messageElement.classList.add('chat-message');

            var avatarElement = document.createElement('i');
            var avatarText = document.createTextNode(message.sender[0]);
            avatarElement.appendChild(avatarText);
            avatarElement.style['background-color'] = getAvatarColor(message.sender);

            messageElement.appendChild(avatarElement);

            var usernameElement = document.createElement('span');
            var usernameText = document.createTextNode(message.sender);
            usernameElement.appendChild(usernameText);
            messageElement.appendChild(usernameElement);
        }

        var textElement = document.createElement('p');
        var messageText = document.createTextNode(message.content);
        textElement.appendChild(messageText);

        messageElement.appendChild(textElement);

        messageArea.appendChild(messageElement);
        messageArea.scrollTop = messageArea.scrollHeight;
    }


    function getAvatarColor(messageSender) {
        var hash = 0;
        for (var i = 0; i < messageSender.length; i++) {
            hash = 31 * hash + messageSender.charCodeAt(i);
        }
        var index = Math.abs(hash % colors.length);
        return colors[index];
    }

    // ############# TYPING ###########
    function displayTypingNotification(sender) {
        //Exclude self from typing notification
        if (sender === username) {
            return;
        }
        var typingElement = document.querySelector('#typing-notification');
        typingElement.textContent = sender + ' is typing...';
        typingElement.style.visibility = 'visible'; // Show typing notification

        // Hide typing notification after X seconds
        setTimeout(function() {
            typingElement.style.visibility = 'hidden';
            typingElement.textContent = '';
        }, 2000);
    }
    function onTyping() {
        if (!typing) {
            typing = true;
            sendTypingNotification();
            timeout = setTimeout(stopTyping, 2000); // Stop typing notification after X seconds of no activity
        } else {
            clearTimeout(timeout);
            timeout = setTimeout(stopTyping, 2000);
        }
    }

    function sendTypingNotification() {
        if (stompClient) {
            var typingMessage = {
                sender: username,
                type: 'TYPING'
            };
            stompClient.send("/app/chat.typing", {}, JSON.stringify(typingMessage));
        }
    }

    function stopTyping() {
        typing = false;
    }


    usernameForm.addEventListener('submit', connect, true)
    messageForm.addEventListener('submit', sendMessage, true)




