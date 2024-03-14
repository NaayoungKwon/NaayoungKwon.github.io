---
date: 2023-10-25
title: "비동기와 Reactive Programming의 연결고리"
category :
  - Java & Spring
permalink: /java-spring/비동기와 Reactive Programming의 연결고리/

toc: true
toc_sticky: true
---

<blockquote>
<p>Mono, Flux를 사용하면서 리액티브라는 용어를 정확히 알고있다고 생각하지 않아, 기본 개념부터 하나 씩 이해해보려고 한다.
JS를 할때는 V8 engine이 어떻게 이벤트 루프를 처리하는지 등의 내용을 읽어봤는데, Java의 동작 방식은 잘 나와있지 않아 이에대한 궁금증도 풀어보려한다.</p>
</blockquote>
<h2 id="공부하기-전-자기-객관화">공부하기 전 자기 객관화</h2>
<h3 id="내가-알고-있던-것">내가 알고 있던 것</h3>
<p>JavaScript로 시작하면서 Async/Sync, Blocking/Non-blocking에 대한 개념은 학습했으나, Java로 언어를 바꾸면서 Asnyc annotation을 사용하거나 Multi threading이 아직은 어색했다.
Mono, Flux API를 사용하면 요청을 Non blocking으로 활용할 수 있다.</p>
<h3 id="궁금한-것">궁금한 것</h3>
<ul>
<li>netty, tomcat의 차이</li>
<li>mvc의 servlet이 webflux에서 어떻게 구성되어 있는가</li>
<li>reactive programming, reactor, mono/flux가 어떤 관계를 지니고 있는지</li>
<li>백프레셔가 무엇인지</li>
<li>netty의 event driven 동작 방식</li>
</ul>
<h2 id="reactive">Reactive</h2>
<blockquote>
<p>변화에 반응하는 것을 중심에 두고 만든 프로그래밍 모델로 데이터를 비동기적으로 처리하고 이벤트 기반 아키텍쳐를 통해 실시간으로 데이터의 변화에 반응할 수 있게 프로그래밍을 할 수 있다.</p>
</blockquote>
<p>Reactive stream의 주 목적은 subscriber가 publisher의 데이터 생산 속도를 제어하는데 있다.</p>
<p><strong>backpressure</strong> : publisher의 생산 속도를 subscriber가 따라잡지 못하는 상황을 말한다. Reactor에서의 Backpressure 처리 방식은 뒤에서 알아본다.</p>
<h3 id="nonblocking과-reactive">Nonblocking과 Reactive</h3>
<ul>
<li>Non blocking은 멈춰서 기다리지 않고, operation이 완료되거나 data 사용이 가능할 때 notification에 반응(reacting)하기 때문에 Non blocking은 reactive다.</li>
<li>Non blocking code에서 Producer 속도가 Consumer 속도보다 크게 차이나지 않도록 이벤트 속도를 제어한다.</li>
</ul>
<h3 id="reactive-api">Reactive API</h3>
<ul>
<li>Reactor : Spring Webflux가 선택한 Reactive (stream) Library</li>
<li>Mono/Flux : Reactor가 제공하는 API</li>
<li>Webflux는 Reactor를 핵심 라이브러리로 사용하지만, 다른 리액티브 라이브러리를 써도 Reactive Stream으로 상호작용할 수 잇다.</li>
<li>함수형 API (ex. Webclient)는 일반적인 Webflux API와 규칙이 동일하다.<ul>
<li>Reactive Stream Publisherfmf input으로 받고 Flux, Mono를 리턴한다.</li>
<li>Publisher가 custom하거나 다른 reactive library를 제공받아도 의미를 알 수 없는 semantic (0..N)으로 처리한다.</li>
<li>만약 Semantics를 알고있다면, raw Publisher를 전달하는 대신 Flux나 Mono.from(Publisher) 를 사용할 수 있다.</li>
</ul>
</li>
</ul>
<h2 id="webflux">WebFlux</h2>
<h3 id="programming-models">Programming Models</h3>
<ul>
<li><code>spring-web</code> module은 Spring-Webflux에 기본이 되는 reactive foundation (HTTP 추상화, Reactive Stream adapter)를 가지고 있다.</li>
<li>Spring Webflux는 두 가지 프로그래밍 모델을 지원한다.<ul>
<li>Annotated Controllers : spring mvc와 동일하게 spring-web module에 있는 같은 annotation을 사용하며, mvc/webflux 둘을 구분하기가 어렵다. -> 우리가 주로 사용하고 있는 것</li>
<li>Functional Endpoints : 경량화된 람다 기반 함수형 프로그래밍 모델로 annotation controller와 큰 차이점은 application이 요청 시작부터 끝까지 제어한다.<ul>
<li>어떻게 생겼는지 궁금해서 간단한 예시를 찾아봤다.</li>
</ul>
</li>
</ul>
</li>
</ul>
<pre><code class="language-java">
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.web.reactive.function.server.RequestPredicates.*;
import static org.springframework.web.reactive.function.server.RouterFunctions.route;

PersonRepository repository = ...
PersonHandler handler = new PersonHandler(repository);

// RouterFunction은 들어오는 요청을 핸들러 함수로 라우팅한다.
// 라우터 함수가 매칭되면 핸들러 함수를 반환하고, 매칭되는 것이 없으면 빈 Mono를 반환
RouterFunction<ServerResponse> route = route()
    .GET("/person/{id}", accept(APPLICATION_JSON), handler::getPerson)
    .GET("/person", accept(APPLICATION_JSON), handler::listPeople)
    .POST("/person", handler::createPerson)
    .build();


public class PersonHandler {

    private final PersonRepository repository;

    public PersonHandler(PersonRepository repository) {
        this.repository = repository;
    }

    public Mono<ServerResponse> listPeople(ServerRequest request) { (1)
        Flux<Person> people = repository.allPeople();
        return ok().contentType(APPLICATION_JSON).body(people, Person.class);
    }

    public Mono<ServerResponse> createPerson(ServerRequest request) { (2)
        Mono<Person> person = request.bodyToMono(Person.class);
        return ok().build(repository.savePerson(person));
    }

    public Mono<ServerResponse> getPerson(ServerRequest request) { (3)
        int personId = Integer.valueOf(request.pathVariable("id"));
        return repository.getPerson(personId)
            .flatMap(person -> ok().contentType(APPLICATION_JSON).bodyValue(person))
            .switchIfEmpty(ServerResponse.notFound().build());
    }
}</code></pre>
<h3 id="applicability">Applicability</h3>
<ul>
<li>Spring MVC냐 Webflux냐를 이분법 적으로 생각하기는 좀 무리가 있다.</li>
<li>이 둘은 지속성과 일관성을 위해서 설계했고, 함께 쓸 수 있다.</li>
</ul>
<p>제일 많이 봤던 그림
<img alt="" src="https://velog.velcdn.com/images/kny8092/post/cdedeeee-c842-48c2-99a2-df0369aeddb0/image.png" /></p>
<ul>
<li>Spring MVC application에서 외부 서비스를 호출한다면 Webclient를 사용해서 Spring MVC Controller 메소드에서도 리액티브 타입을 반환할 수 있다.</li>
<li>application이 spring mvc와 webflux 둘 다 사용한다면 default는 spring mvc를 사용하도록 되어있다.<ul>
<li>만약 webflux 로 사용하고 싶다면 다음 설정을 추가해줘야한다.</li>
</ul>
</li>
</ul>
<pre><code>SpringApplication.setWebApplicationType(WebApplicationType.REACTIVE)</code></pre><p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/af9feee9-bf53-41dd-baa9-f89aba415548/image.png" /></p>
<h3 id="server">Server</h3>
<ul>
<li>Spring Webflux는 Tomcat, Jetty, Servlet container, Netty, Underflow를 지원한다.</li>
<li>Spring Webflux에 서버를 시작하거나 멈추는 built in 기능은 없지만, Spring Boot가 Webflux starter를 가지고 자동으로 해준다.</li>
<li>stater는 Netty를 default로 사용하고 gradle로 다른 내장서버로 바꿀 수 있다.</li>
</ul>
<h3 id="concurrency-model">Concurrency Model</h3>
<blockquote>
<p><strong>Spring MVC와 Spring Webflux가 둘 다 annotated controller를 지원한하고 해도, 동시성 모델과 blocking, thread의 기본 전략이 다르다.</strong></p>
</blockquote>
<p>궁금했던 내용이 나와서 너무 기쁨...</p>
<ul>
<li>Spring MVC (servlet app) : application은 처리중인 현재 thread에서 block되기 때문에, servlet container가 큰 thread pool을 만들어둔다.</li>
<li>Spring Webflux (non blocking server) : application은 blcoking 되지않고, non-blocking server는 작고 고정된 크기의 thread pool인 event worker가 요청을 핸들링한다.</li>
</ul>
<p><strong>Invoking a Blocking API</strong>
blocking 라이브러리를 사용하려면, Reactor/RxJava 모두 다른 스레드로 요청을 처리해주는 publishOn operator를 지원한다.</p>
<p><strong>Mutable State</strong>
Reactive pipeline은 구분된 환경에서 data가 sequential하게 처리된다.
파이프라인 안의 코드는 절대 동시에 실행되지 않아 mutable state를 신경쓰지 않아도 된다.</p>
<p><strong>Threading Model</strong></p>
<p>그러면 Spring Webflux를 사용하는 Application은 무슨 스레드를 얼마나 실행하고 있을까</p>
<ul>
<li>외부 dependency가 없이 webflux server를 뛰우면 서버는 스레드 1개로 운영하고, 몇몇(보통 CPU core 수 만큼)은 request processing에 쓰인다.<ul>
<li>Servlet container는 servlet (blocking) I/O and servlet 3.1 (non-blocking) I/O를 둘 다 지원해서 더 많은 스레드를 만들어서 시작한다.</li>
<li>보통 톰캣은 10개의 스레드를 생성한다.</li>
<li>netty는 default로 core *2 만큼의 thread pool을 생성한다.</li>
</ul>
</li>
<li>reactive Webclient는 event loop를 사용하면서 더 적은 스레드를 고정시켜두고 사용한다. <ul>
<li>Reactor netty connector를 쓰면 <code>reactor-http-nio-</code> 로 시작하는 쓰레드를 볼 수 있다.</li>
<li>Client와 Server가 모두 Netty를 사용하면, default로 event loop를 공유한다.</li>
</ul>
</li>
<li>데이터에 접근하는 라이브러리나 third party dependency는 새로운 스레드를 만들어서 사용할 수도 있다.</li>
</ul>
<h3 id="webflux에서-성능이-저하되는-원인">WebFlux에서 성능이 저하되는 원인</h3>
<p>CPU 사용이 많은 작업 및 Blocking IO가 많은 경우
-> runnable 한 thread가 CPU를 점유하고 있으면 이벤트 루프가 이벤트 queue에 있는 작업을 처리할 수 없다.</p>
<h3 id="reactor에서의-backpressure-처리-방식">Reactor에서의 Backpressure 처리 방식</h3>
<p>앞서 Backpressure는 Publisher가 빠르게 데이터 emit 시 Subscriber의 처리 속도가 느려서 처리되지 못한 데이터가 계속 쌓이는 현상을 해결하려는 것이다.</p>
<p>방법 1. Subscriber가 처리할 수 있는 수준의 양을 Publisher에게 알려주는 방식 -> subscriber가 이벤트 처리에 주도권을 가진다.
방법2. Backpressure 전략을 사용한다 (버퍼에 가득차면 Exception 발생시키기, 버퍼 밖에 대기하는 데이터 Drop 시키기 등..)</p>
<p><a href="https://devfunny.tistory.com/914">처리 방식 참고</a></p>
<h2 id="netty">Netty</h2>
<p>Netty의 Event loop가 어떻게 생겼는지 볼 차례다.</p>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/9e786165-56bc-4e7d-a279-376a8eac7e18/image.png" /></p>
<ol>
<li>모든 요청은 unique socket으로 전달 받으며 SocketChannel이라고하는 채널과 연결된다.</li>
<li>단일 Eventloop thread가 SocketChannel과 연관되어있어서 모든 요청은 Socket->SocketChannel에서 같은 Eventloop로 전달된다.</li>
<li>EventLoop의 요청은 channel pipeline을 통과하며, 여기서 필요한 처리를 위해 다수의 Inbound channel handler 나 WebFilter가 구성된다.</li>
<li>이후에 Eventloop가 application 코드를 실행시킨다.</li>
<li>끝나면 Eventloop는 configured processing을 위해 다시 여러 outbound channel handler를 통과한다.</li>
<li>Evnetloop는 응답을 같은 SocketChannel/Socket에 전달한다.</li>
<li>1~6을 반복</li>
</ol>
<h3 id="application에서-앞서-말한-blocking이-발생해-eventloop을-차단하게-된다면">Application에서 앞서 말한 Blocking이 발생해 Eventloop을 차단하게 된다면?</h3>
<ul>
<li>위 단계 중 4번에서 eventloop가 block 되는 상황이 발생할 수 있다.</li>
<li>추가로 Eventloop를 만드는건 해결책이 아니다.<ul>
<li>이미 socket들이 이 단일 Eventloop와 묶여서 다른 Eventloop가 대신 작동하도록하지 않는다.</li>
</ul>
</li>
<li>**사용자 Application은 다른 thread에 위임하고 결과는 async로 반환 받아서 새로운 요청을 또 처리하기위해 Eventloop를 unblock 시켜줘야한다.</li>
<li>*</li>
</ul>
<h3 id="eventloop-v2">Eventloop v2</h3>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/2eb554a8-d64c-4120-ba97-e22a3a5c0f01/image.png" /></p>
<ol>
<li>앞의 1~3번은 동일</li>
<li><strong>eventloop는 요청을 새로운 worker thread에 위임한다.</strong> 
worker thread는 이 task를 계속 수행하고, 끝나면 task에 응답을 작성해서 ScheduledTaskQueue에 넣는다.</li>
<li>Eventloop는 ScheduledTaskQueue라는 task queue에 task가 있는지 확인해보고 있으면 5~6 단계를 수행한다.</li>
</ol>
<h3 id="장점">장점</h3>
<ul>
<li>경량 요청 처리 스레드다.</li>
<li>하드웨어 리소스의 최적으로 활용한다.</li>
<li>단일 이벤트 루프는 HTTP 클라이언트와 요청 처리 간에 공유될 수 있다.</li>
<li>하나의 스레드가 여러 소켓(즉, 다른 클라이언트)을 통해 요청을 처리할 수 있다.</li>
<li>이 모델은 무한 stream 응답 시 backpressure 처리를 지원한다.</li>
</ul>
<h2 id="handler">Handler</h2>
<ul>
<li>spring mvc이 DispatcherServlet가 있다면, spring webflux에서는 DispatcherHandler가 있다.
DispatcherHandler의 동작 방식은 다음에!</li>
</ul>
<hr />
<p>참고</p>
<p><a href="https://mumomu.tistory.com/176">https://mumomu.tistory.com/176</a>
<a href="https://velog.io/@youngmin-mo/%EC%96%B4%EB%96%BB%EA%B2%8C-%EB%8B%A4%EB%A5%B8-%EC%84%9C%EB%B2%84%EC%99%80-%ED%86%B5%EC%8B%A0%ED%95%A0%EA%B9%8C%EC%9A%94">https://velog.io/@youngmin-mo/%EC%96%B4%EB%96%BB%EA%B2%8C-%EB%8B%A4%EB%A5%B8-%EC%84%9C%EB%B2%84%EC%99%80-%ED%86%B5%EC%8B%A0%ED%95%A0%EA%B9%8C%EC%9A%94</a>
<a href="https://madplay.github.io/post/spring-webflux-references-functional-endpoints">https://madplay.github.io/post/spring-webflux-references-functional-endpoints</a>
<a href="https://www.youtube.com/watch?v=I0zMm6wIbRI">https://www.youtube.com/watch?v=I0zMm6wIbRI</a>
<a href="https://dzone.com/articles/spring-webflux-eventloop-vs-thread-per-request-mod">https://dzone.com/articles/spring-webflux-eventloop-vs-thread-per-request-mod</a>
<a href="https://stackoverflow.com/questions/51377675/dont-spring-boot-starter-web-and-spring-boot-starter-webflux-work-together">https://stackoverflow.com/questions/51377675/dont-spring-boot-starter-web-and-spring-boot-starter-webflux-work-together</a></p>