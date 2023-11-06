---
date: 2023-11-6
title: "spring-boot-starter-web과 webflux를 동시에 사용하면 어떻게할까"
category :
  - Java & Spring
permalink: /java-spring/spring-boot-starter-web과 webflux를 동시에 사용하면 어떻게할까/

toc: true
toc_sticky: true
---<blockquote>
<p>팀에서 개발하고있는 project가 spring-boot-starter-web, spring-boot-starter-webflux 둘 다 dependency에 추가 하고 사용하고 있어, 어떻게 돌아가는지 궁금해서 알아보기로 했다.</p>
</blockquote>
<h3 id="우선-application은">우선 Application은</h3>
<pre><code class="language-gradle">implementation("org.springframework.boot:spring-boot-starter-web")
implementation("org.springframework.boot:spring-boot-starter-webflux")</code></pre>
<p>우선 spring-boot-starter-web안에 spring mvc를 가지고 있다.
앞서 알아본 것 처럼 별도로 설정하지 않으면 spring mvc를 기본으로 동작한다.
<img alt="" src="https://velog.velcdn.com/images/kny8092/post/0521056e-ec1c-4bd9-877d-fb8edfbcf97f/image.png" /></p>
<h2 id="spring-mvc">Spring MVC</h2>
<p>그러면 기본적으로 Spring MVC를 사용하면 내장 Tomcat이 thread를 얼마나 가지고 어떻게 처리하는지를 알아봤다.</p>
<h3 id="one-thread-per-request">One thread per Request</h3>
<ul>
<li>spring mvc에서 blocking 으로 동작할 때, 하나의 thread는 하나의 특정 request 만을 처리한다.</li>
<li>모든 연산은 해당 thread에서만 이루어지고, blocking I/O request가 있을 때 마다(DB 요청), thread는 blocking 요청이 끝날 때 까지 기다린다</li>
<li>RestTemplate는 low level의 HTTP client library이나, non-blocking, reactive가 나오기 전의 http 요청 표준이었다.<ul>
<li>요청이 들어오면 thread pool에서  thread가 비지니스 로직을 처리하다가, RestTemplate 으로 HTTP 요청이 필요하면 미리 HTTP connection pool을 만들어두고 거기서 가져다 쓴다.<ul>
<li>connection pool : 클라이언트와 서버간에 연결을 맺어 놓은 상태(3way HandShake 완료 상태)를 여러개 유지하고 필요시 마나 하나씩 사용하고 반납하는 형태</li>
</ul>
</li>
<li>main worker thread가 HTTP request를 만들고, RestTemplate이 pool의 기존 HTTP connection을 사용한다.</li>
<li>thread는 connection의 결과를 기다려야만한다.
<img alt="" src="https://velog.velcdn.com/images/kny8092/post/39599a57-85e2-4988-b5b5-362ef8bc0120/image.png" /></li>
</ul>
</li>
</ul>
<h3 id="tomcat은-몇-개의-thread를-생성하는가">Tomcat은 몇 개의 thread를 생성하는가</h3>
<blockquote>
<p>Tomcat :  Java 표준 인터페이스인 서블릿을 지원하기 위한 미들웨어로 OS로부터 네트워크 요청 정보를 받아와 자바 객체로 만들고 이를 서블릿 컨테이너로 위임한다. </p>
</blockquote>
<pre><code>server:
  tomcat:
    threads:
      max: 200 # 생성할 수 있는 thread의 총 개수
      min-spare: 10 # 항상 활성화 되어있는(idle) thread의 개수 (tomcat default는 25개인데, 스프링부트(ServerProperties)에선 10개로 잡았음)
    accept-count: 100 # 작업 큐의 사이즈 (tomdat default 는 Integer.MAX -&gt; 무한 대기열 전략)</code></pre><ul>
<li>첫 작업이 들어오면, core size 만큼의 스레드를 생성한다.</li>
<li>요청이 들어올 때 마다 task queue에 넣는다.</li>
<li>idle인 thread가 있으면 task queue에서 꺼내 스레드에 작업 할당<ul>
<li>idle thread가 없으면 task queue에 대기</li>
<li>task queue가 다 차면 이후 요청들은 connection refused error return</li>
</ul>
</li>
<li>task 완료 후 thread는 다시 idle 상태가 된다.</li>
<li>task queue가 비어있고 core size 이상의 thread가 있으면 그 thread들은 없앤다. -&gt; 스레드 풀을 최대한 core size로 유지하려함</li>
<li>무한 대기열 전략 : 요청이 아무리 많이들어와도 thread를 늘리지 않고 대기열에 두겠다.</li>
<li>아래와 같은 상황이라면 어떻게 될까?</li>
</ul>
<pre><code>Q. min-spare : 5, max : 6, accept-count : 1일 때, 동시에 요청이 10개가 들어온다면?
A. 5개는 스레드 풀에서 바로 할당받아 사용하고(min-spare) 
   1개는 새로 스레드를 생성하여 할당 받는다 (max)
   1개는 queue에 대기 할 수 있지만 나머지 3개는 reject 당할 것이다.</code></pre><ul>
<li>지금 spring boot 2.5에 tomcat 9를 사용하고 있는데, 이때 저렇게 설정하고 요청을 보내면 reject 당하지 않는다. 왜일까 -&gt; NIO connector의 등장 (뒤에 나옴)</li>
</ul>
<h3 id="tomcat-connector">Tomcat Connector</h3>
<blockquote>
<p>Connector : 소켓 연결을 받아 데이터 패킷을 획득하여 HttpServletRequest 객체로 변환하고, Servlet 객체에 전달하는 역할</p>
</blockquote>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/1a72c8c7-11eb-4939-a065-18cf346feb9c/image.png" /></p>
<pre><code>출처 https://velog.io/@jihoson94/BIO-NIO-Connector-in-Tomcat</code></pre><ul>
<li>버전마다 Connector의 동작 방식에는 차이가 있고, BIO, NIO, NIO2가 있다.</li>
<li>NIO는 New I/O의 약자 (Blocking, Non blocking 모두 지원)</li>
<li>회사에서 spring boot 2.5.15를 사용하고 있고, maven에서 찾아보니 Tomcat 9 버전을 사용함을 알 수 있었다. -&gt; NIO</li>
<li>BIO는 tomcat 8 부터 deprecated</li>
</ul>
<h4 id="bio-connector">BIO Connector</h4>
<ul>
<li>하나의 thread가 하나의 connection에만 계속 할당되어있다.</li>
<li>thread 수 = 동시에 처리할 수 있는 요청의 수</li>
<li>BIO는 client 단에서 keep alive로 연결이 되어있으면 계속 blocking 상태로 자원을 안놔준다. (이게 문제임)<ul>
<li>어차피 한 요청당 스레드 한번 쓰고 쓰레드 사용을 해제하게 되면 NIO도 결국 하나의 요청이 하나의 스레드를 잡고있는게 아닌가 계속 궁금했는데 해결 키워드는 <code>keep alive</code> 였다.</li>
<li><a href="https://stackoverflow.com/questions/11032739/what-is-the-difference-between-tomcats-bio-connector-and-nio-connector">https://stackoverflow.com/questions/11032739/what-is-the-difference-between-tomcats-bio-connector-and-nio-connector</a>
<img alt="" src="https://velog.velcdn.com/images/kny8092/post/98373c60-79ab-4197-a15b-a006cacb735c/image.png" /></li>
</ul>
</li>
</ul>
<ul>
<li>thread를 효율적으로 사용하기 위해 NIO Connector 가 등장</li>
</ul>
<h4 id="nio-connector">NIO Connector</h4>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/bc5f1bda-1a46-4c7f-b383-9f97cb04e0dd/image.png" /></p>
<pre><code>출처 https://velog.io/@jihoson94/BIO-NIO-Connector-in-Tomcat</code></pre><ul>
<li>Poller라는 별도의 스레드가 커넥션을 처리한다.</li>
<li>NioEndpoint
<img alt="" src="https://velog.velcdn.com/images/kny8092/post/aa53256c-cd4a-4cb0-9c2b-48bd709433de/image.png" /><ul>
<li>Acceptor : Socket connection accept. tomcat의 NioChannel 객체로 변환. event queue로 publish</li>
<li>Poller : <strong>Socket들을 캐시로 들고있다가 Data 처리가 가능한 순간에만 thread를 할당한다.</strong></li>
<li>Selector : <strong>하나의 Poller 스레드 속 Selector를 사용하여 하나의 스레드로 여러 채널을 처리한다.</strong></li>
<li>Max connection까지 수락하고, selector를 통해 channel(connection)을 관리해 작업 큐 사이즈와 관계 없이 추가로 커넥션을 refuse 하지 않고 받아놓을 수 있다.
<img alt="" src="https://velog.velcdn.com/images/kny8092/post/e615b298-4577-497a-ac6f-ba94fb2702b5/image.png" /></li>
</ul>
</li>
</ul>
<ul>
<li>이 NIO connector의 등장과 함께 <strong>client와 Servlet Container 간 communication은 non-blocking</strong>이 적용되었다. <ul>
<li>하지만 그 다음 단일 서블릿 컨테이너에서 서블릿 간의 커뮤니케이션은 여전히 blocking.</li>
<li>connection에 의해 thread가 blocking되는 것은 막았지만, 결국 리퀘스트를 처리하는 서블릿을 호출할 때 Servlet 3.0이전까지 이 서블릿 단은 아직 동기, 블로킹 방식으로 동작했기 때문에 스레드가 다시금 블로킹되는 현상이 발생한다.</li>
</ul>
</li>
</ul>
<h3 id="servlet">Servlet</h3>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/1e92bb26-3ad4-4807-978e-4b53f02c5c99/image.png" /></p>
<h4 id="servlet-container">Servlet Container</h4>
<ul>
<li>서블릿을 관리하는 역할</li>
<li>서블릿 클래스의 로드, 초기화, 호출, 소멸까지의 라이프사이클을 관리해줌</li>
<li>Tomcat이 Servlet Container</li>
<li>스프링 부트를 실행하면 내장 톰캣 서버를 띄어준다.</li>
</ul>
<h4 id="servlet-1">Servlet</h4>
<ul>
<li>톰캣 서버는 내부에 서블릿 컨테이너 기능이 있어서 요청이 오면 생성해준다.</li>
<li>MVC패턴에서 컨트롤러로 이용됨</li>
<li>컨테이너에서 실행</li>
</ul>
<h4 id="dispatcher-servlet">Dispatcher Servlet</h4>
<ul>
<li>스프링 MVC의 Front Controller 패턴으로 구현<ul>
<li>Front Controller<ul>
<li>각 클라이언트들은 Front Controller에 요청을 보내고, Front Controller은 각 요청에 맞는 컨트롤러를 찾아서 호출시킨다.</li>
<li>공통 코드 처리가 가능하다</li>
<li>Front Controller 외 다른 Controller에서 Servlet 사용하지 않아도 됨</li>
</ul>
</li>
</ul>
</li>
<li>조상 중에 HTTP Servlet이 있어 이를 상속받은 것</li>
</ul>
<h2 id="spring-mvc-with-webclient">Spring MVC with WebClient</h2>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/b1b3e6fd-949f-4e18-a148-e0d1ca313fca/image.png" /></p>
<ul>
<li>지금 Spring MVC으로 Application을 구성하기 때문에 DispatcherServlet, ThreadPoolExecutor, Controller bean이 여전히 존재한다.</li>
<li>하지만 처음 요청이 들어오면 main thread가 처리하는 과정부터 차이가 있다.</li>
<li>Webclient가 HTTP connection을 바로 쓰는 대신 Event loop group을 가지고 각 event loop가 외부와의 connection을 처리한다.</li>
<li>실제 HTTP connection은 event loop에서 시작된다.</li>
<li>request 전송 후, response callback handler가 등록되고 event loop가 끝난다.</li>
<li>이때 다른 작업을 할수 있으므로 group으로 돌아간다.(return)</li>
<li>외부 API가 요청을 처리하고 응답을 보낸다.</li>
<li>(그림에는 webclient에서 다루는 것같지만 단순하게 표기하기 위해 그렇게 그려둔 것)</li>
<li>요청한 webclient는 응답을 받으면 callback 실행이 트리거된다. response task가 생성되고 ScheduledTaskQueue에 넣어진다.</li>
<li>TaskQueue는 EventLoop Group에 바인딩되어 있으며, 이로 인해 사용 가능한 EventLoop 중 하나가 작업을 선택하게 된다.</li>
</ul>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/beea58fc-fad5-4f09-a5a3-b25ca563822f/image.png" /></p>
<ul>
<li><p>참고로 EventLoopGroup은 위의 그림 처럼 생겨서 여러 event loop를 관리하고 있고, 각 이벤트 루프가 socket channel을 통해 들어오는 request를 처리한다.</p>
</li>
<li><p>socket channel은 한번 만들어지면 동일한 event loop에 계속 binding된다.</p>
</li>
<li><p>이때문에 다른 event loop가 놀고있어도 자신을 맡은 event loop가 일하고있으면 queue에 계속 있게된다.</p>
<blockquote>
<p>Spring web mvc와 webflux의 webclient를 같이 써도 incoming(client to server), outgoing(server to other server) 요청들의 자원은 공유되지 않는다.
동일 library를 사용해도(ex. Jetty Servlet Container and Jetty Reactive HttpClient) 
서버 자체는 reactive가 아니고 blocking servlet을 사용하고있지만 client는 reactive이기때문.</p>
</blockquote>
</li>
</ul>
<hr />
<p>참고
그림은  <a href="https://excalidraw.com/">https://excalidraw.com/</a> 에서 직접
<a href="https://www.stefankreidel.io/blog/spring-webmvc-with-webclient">https://www.stefankreidel.io/blog/spring-webmvc-with-webclient</a> -&gt; 여기 그림이 유용함
<a href="https://www.stefankreidel.io/blog/spring-webflux">https://www.stefankreidel.io/blog/spring-webflux</a>
<a href="https://singhkaushal.medium.com/spring-webflux-eventloop-vs-thread-per-request-model-a42d07ee8502">https://singhkaushal.medium.com/spring-webflux-eventloop-vs-thread-per-request-model-a42d07ee8502</a>
<a href="https://sihyung92.oopy.io/spring/1">https://sihyung92.oopy.io/spring/1</a>
<a href="https://hadev.tistory.com/m/29">https://hadev.tistory.com/m/29</a>
<a href="https://jh-labs.tistory.com/334">https://jh-labs.tistory.com/334</a></p>