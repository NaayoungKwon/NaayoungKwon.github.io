<h2 id="들어가기">들어가기</h2>
<p>이 글은 java spring 프로젝트에서 websocket stomp 메세지를 전달하는 기능을 구현하기 위해 찾아본 사혼의 조각을 정리한 것이다.</p>
<p>전체 코드는 진행 중인 spring 프로젝트 <a href="https://github.com/Eagle2gle/wealth-marble-backend">github</a>에 있다.
Websocket은 알고있는 전제로 설명한다.</p>
<h3 id="하고-싶은-것">하고 싶은 것</h3>
<p>Websocket STOMP 프로토콜을 사용해서 클라이언트가 보낸 정보를 다른 클라이언트들에게 그대로 broadcasting하고 싶다.</p>
<h1 id="요구사항을-위한-기본-개념">요구사항을 위한 기본 개념</h1>
<h2 id="stomp">STOMP</h2>
<p>Simple Text Oriented Messaging Protocol의 약자로, 메시징 전송을 효율적으로 하기 위한 프로토콜로, pub/sub 기반으로 동작한다.
구독을 통해 전달되는 Client를 구분하고 있기 때문에 <code>Socket.IO</code>의 room처럼 어떤 방에 속한 Client에게 전달한다고 생각하면 된다.
<img alt="" src="https://velog.velcdn.com/images/kny8092/post/d65badfe-6050-4fad-ae0f-00073b77e572/image.png" /></p>
<p>위의 그림에서 전송자는 /app, /topic을 prefix로 한 path를 서버로 보내면 서버는 이를 받아 처리한다.
/topic을 prefix로 하여 들어온 요청은 broker에게 전달해 구독하고 있는 Client에게 전달하도록 맡긴다.</p>
<h1 id="코드에-적용하기">코드에 적용하기</h1>
<h2 id="step-1-websocket-stomp-server-구축">Step 1. Websocket STOMP Server 구축</h2>
<p>우선 stomp 프로토콜부터 구현해보자.
config 파일을 생성한다.</p>
<ul>
<li>websocket config : websocket 연결 요청 처리, pub/sub path 지정</li>
</ul>
<p>build.gradle 추가할 의존성</p>
<pre><code class="language-gradle">implementation 'org.springframework.boot:spring-boot-starter-websocket'</code></pre>
<h3 id="config-설정파일">config 설정파일</h3>
<p>여기서 3개의 설정을 해주고있다.</p>
<ol>
<li>socket 최초 연결을 위한 path 설정 : <code>registry.addEndpoint("/ws-market")</code></li>
<li>client -&gt; server로 요청(pub)이 들어올 prefix path 설정 : <code>config.setApplicationDestinationPrefixes</code></li>
<li>client가 listen(구독)할 path prefix path 설정 : <code>config.enableSimpleBroker</code></li>
</ol>
<pre><code class="language-java">@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws-market")
                .setAllowedOriginPatterns("*");
    } // 연결 요청

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.setApplicationDestinationPrefixes("/order"); // client -&gt; server
        config.enableSimpleBroker("/topic","/queue"); // 구독 요청
    }

}
</code></pre>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/ad152d16-90ad-4f2a-9226-26d8805c72c1/image.png" />
그림에서는 /app이나 /topic으로 요청을 받아 /topic으로 오는 요청은 message broker에서 전달 대상들을 처리한다.
나는 /topic, /queue를 prefix로 하는 구독 정보를 전달하도록 했고, /order로 요청을 전달한다.</p>
<h3 id="messagemapping">MessageMapping</h3>
<p>위의 2번의 path로 client가 server로 data를 전달했을 때 맵핑을 해서 처리해준다. controller mapping으로 보면 될 것 같다.</p>
<p>설정파일에서 prefix를 <code>/order</code> 로 설정했고, 밑의 파일에서 MessageMapping을 <code>/purchase</code>로 지정했다. 
-&gt; <code>/order/purchase</code> 로 client가 요청이 오면 해당 메소드로 라우팅된다.
-&gt; 비지니스 로직 처리 후에 <code>/topic/market/{marketId}</code> (예시 /topic/market/1) 을 listen (구독) 하고 있는 클라이언트들에게 전부 전달한다.</p>
<pre><code class="language-java">@RestController
@RequiredArgsConstructor
@Slf4j
public class OrderController {
    private final SimpMessagingTemplate template;

    @MessageMapping("/purchase") //   url : "order/purchase" 로 들어오는 정보 처리
    public void purchase(MessageDto message){

        template.convertAndSend("/topic/market/" + message.getMarketId(), message); // topic/market/{마켓아이디}를 듣고있는 client에 전송
    }

}
</code></pre>
<h2 id="step-2-client-연결해서-테스트하기">Step 2. Client 연결해서 테스트하기</h2>
<p>Client를 만들 면 되지만.. chrome extension을 사용해서 stomp test가 가능하다.
APIC을 다운받아서 연결 수립을 위한 path, stomp 구독 url을 적고 connect를 한다.</p>
<p>data를 보낼 때는 아래 destination queue에 path를 적으면 된다.</p>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/b41d8f19-2759-4f2b-a635-c517f04a53b0/image.gif" /></p>
<h2 id="step-3-error-handling">Step 3. ERROR handling</h2>
<p>비지니스 로직 처리 중 에러가 발생하면 요청 Client에게 처리 중 에러가 발생했다는 1:1 메세지 전달이 필요하다.
이 부분이 한국어로된 설명이 잘 없어서 해맸다.
<code>@MessageExceptionHandler</code> : message 처리 중 발생한 에러를 이쪽으로 전달 받는다.
<code>@SendToUser(구독url)</code> : 사용자는 error 처리에 대한 내용을 들을 url도 구독하고 있어야한다. 이때 /queue/errors로 지정하고, 사용자는 /user/queue/errors 로 구독 요청을 해야 제대로 들을 수 있다.
공식 문서를 찾아보면 관련 내용이 나오는데 알아서 session을 찾아 해당 사용자를 mapping 해준다.</p>
<pre><code class="language-java">// OrderController.java class
    @MessageExceptionHandler // message 처리 
    @SendToUser("/queue/errors") // '/user/queue/errors' 를 구독하고 있으면 보낸 사람에게만 ErrorDto가 전달된다.
    public ErrorDto handleException(SocketException exception) { 
        // throw new SocketException('message custom')을 던지면 이리로 들어온다.
        log.warn(exception.getMessage());
        ErrorDto errorMessage = ErrorDto.builder().status("fail").message(exception.getMessage()).build();
        return errorMessage;
    }</code></pre>
<h1 id="소감">소감</h1>
<p>소감..?
JavaScript Socket.IO를 사용하다가 해보니 Socket.IO가 정말 편하고 직관적이고 좋았다.
Java Spring 보다 더 편리하다고 느낀 것들 중 하나가 Socket.IO인 것 같다.</p>
<hr />
<p>참고
<a href="https://brunch.co.kr/@springboot/695">https://brunch.co.kr/@springboot/695</a>
<a href="https://spring.io/guides/gs/messaging-stomp-websocket/">https://spring.io/guides/gs/messaging-stomp-websocket/</a>
<a href="https://dydtjr1128.github.io/spring/2019/05/26/Springboot-react-chatting.html">https://dydtjr1128.github.io/spring/2019/05/26/Springboot-react-chatting.html</a></p>