---
date: 2022-12-20
title: "Socket Multi Namespace Connect 옳은가?"
categories:
  - Asnity

permalink: /asnity/Socket-Multi-Namespace-Connect-옳은가?/

toc: true
toc_sticky: true
---


> Sock.IO의 Multi Namespace를 사용하며 고민한 글입니다.


## 발단


우리 서비스의 socket event는 Socket.IO의 Namespace와 room 단위로 구분하여, 하나의 커뮤니티를 하나의 Namespace에 연결되고, 서버는 특정 채널의 이벤트를 채널 참여자들에게만 전송하는 형식이다.


![0](/assets/img/2022-12-20-Socket-Multi-Namespace-Connect-옳은가?.md/0.png)


Server는 Dynamic Namespace가 가능하여 `/socket/commu-{커뮤니티 _id}` 형식으로 Namespace 연결이 들어왔을 때 받아들이도록 구현했다.
{% raw %}

```typescript
@WebSocketGateway({
  namespace: /\/socket\/commu-.+/
})
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
}
```
{% endraw %}


## 전개


Backend에서는 커뮤니티 - Namespace, 채널 - Room 으로 Mapping하는 것은 코드가 직관적이고 바로 Client에서 어떤 커뮤니티/채널에서 온 이벤트인지 확인 가능했다.


그러나 Frontend는 사용자가 많은 커뮤니티에 참여하고 있다면, Namespace 별로 연결 요청을 보내고, Namespace 별 Socket 객체가 구분되어있기 때문에 Socket 객체들을 계속 가지고 있어야했다.


## 의문


Socket Server를 구축하고 Frontend와 자세한 명세를 이야기 하면서 `꼭 Namespace 별로 구분해 연결할 필요가 있을까?` 하는 질문이 생겼고, Namespace 별로 연결을 시도한다면 Namespace 마다 구분된 길로 가는지, handshaking에 대한 비용이 궁금해졌다.


### Multiplexing


다음은 Socket.IO 공식문서에서 확인할 수 있는 내용이다.


![1](/assets/img/2022-12-20-Socket-Multi-Namespace-Connect-옳은가?.md/1.png)


[https://socket.io/docs/v3/namespaces/](https://socket.io/docs/v3/namespaces/)


> Namespace는 multiplexing을 통해 application logic 분할이 가능하다.


multiplexing은 단일 링크를 통해 여러 개의 신호를 동시에 전송할 수 있도록 해주는 기술이다.


다시 말하면, 하나의 Client는 여러 Namespace 에서 송수신하는 event들을 모아 하나의 연결에 보낸다는 뜻이다.


여기서 처음에 `Multiplexing이면 연결 비용은 어차피 하나이니 오버헤드는 Multi Namespace, Multi Room 이던, Room으로 커뮤니티와 채널 두가지를 구분하던 똑같구나` 라고 이해했다.


**아니다...!**


Namespace 별로 connection이 될 때 Server에서는 connection event handler가 실행되는 점을 생각해보면 Namespace별로 추가 동작이 있을거란 생각이 든다.


Socket.IO Namespace가 어떤 동작 과정을 거치는지 다시 찾아보기로 했다.


### Handshaking


![2](/assets/img/2022-12-20-Socket-Multi-Namespace-Connect-옳은가?.md/2.png)


websocket은 초기 연결 시 handshaking 과정을 거친다.


여기서 Socket.io의 프로토콜 문서를 찾아보았다.


![3](/assets/img/2022-12-20-Socket-Multi-Namespace-Connect-옳은가?.md/3.png)


> 각각의 namespace에 대해서 client는 처음에 CONNECT packet을 보내고 server가 Socket의 id를 포함한 CONNECT packet을 응답으로 보낸다.


![4](/assets/img/2022-12-20-Socket-Multi-Namespace-Connect-옳은가?.md/4.png)


기본적으로 client는 HTTP long-polling 방식으로 연결이 성립된다. → 여러 이유에 의해 항상 WebSocket connection이 가능한건 아니기 때문


사용자 관점에서, 성공적이지 않은 websocket 연결은 data 교환 시작까지 최대 10초 이상을 기다려야하는데 이는 사용자 경험을 해진다.


따라서 Engine.IO는 안정성과 사용자 경험에 우선 중점을 두고 그 다음 서버 성능 향상을 하도록 되어있다.


websocket으로 연결이 가능하다면, handshaking 후에 websocket으로 업그레이드하는 과정이 일어난다.


감이 잘 안와서 그냥 Chrome DevTool을 열어서 공식 문서와 하나하나 비교했다.


현재 참여중인 커뮤니티는 왼쪽 GNB와 같이 3가지이다.


![5](/assets/img/2022-12-20-Socket-Multi-Namespace-Connect-옳은가?.md/5.png)


![6](/assets/img/2022-12-20-Socket-Multi-Namespace-Connect-옳은가?.md/6.png)


![7](/assets/img/2022-12-20-Socket-Multi-Namespace-Connect-옳은가?.md/7.png)


1) Engine.IO open packet. response data는 the Engine.IO handshake data이다. t query는 브라우저에서 요청이 캐싱되지 않게 하려고 사용한다.


---


![8](/assets/img/2022-12-20-Socket-Multi-Namespace-Connect-옳은가?.md/8.png)


![9](/assets/img/2022-12-20-Socket-Multi-Namespace-Connect-옳은가?.md/9.png)


2) namespace connection POST request를 보내고 namespace connection이 승인되었는지를 GET으로 확인한다.

- POST 요청을 보내는 시점이 client에서 각 namespace에 대해 연결 요청을 하는 시점이다.
- 이때 Authorization token도 같이 전달한다.

---


![10](/assets/img/2022-12-20-Socket-Multi-Namespace-Connect-옳은가?.md/10.png)


3) WebSocket으로 upgrade 하기 위한 요청을 보낸다.


---


![11](/assets/img/2022-12-20-Socket-Multi-Namespace-Connect-옳은가?.md/11.png)


4) 2번과 동일하게 namespace connection POST request를 보내는데, 두개의 namespace 요청이 한번에 전달되고있다.


---


![12](/assets/img/2022-12-20-Socket-Multi-Namespace-Connect-옳은가?.md/12.png)


5) Websocket event는 3번에서 upgrade 한 websocket 연결 후 event가 계속 로깅된다.


### 그래서요?


정리해보면, Namespace 별로 connection 시에 handshaking은 발생하지만 하나의 통로로 전달된다.


## 결말


한 번 연결하고 나면 큰 비용은 들지않으나, 최초 handshaking을 namespace 수 만큼 진행하고 client에서 socket 여러 객체들을 관리해야한다는 점이 있다.


지금 Namespace와 Room기반 구현이 쉽고 직관적이었으나, 하나의 Namespace에서 커뮤니티와 채널의 정보를 담아 한번에 보내주고, Room을 커뮤니티와 채널 조합한 key로 만드는 것도 나쁘지 않은 것 같다.


참고


[Namespaces | Socket.IO](https://socket.io/docs/v3/namespaces/)


[[인터넷:원리] 다중화와 역다중화란?: Multiplexing and Demultiplexing: 네트워크 프로토콜 계층](https://the-brain-of-sic2.tistory.com/52)


[How it works | Socket.IO](https://socket.io/docs/v3/how-it-works/#WebSocket)


[GitHub - socketio/socket.io-protocol: Socket.IO Protocol specification](https://github.com/socketio/socket.io-protocol#sample-session)

