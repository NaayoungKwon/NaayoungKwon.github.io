---
date: 2023-12-7
title: "@RestController는 Object를 return하면 어떻게 알아서 Response를 만들어 전달할까"
category :
  - Java & Spring
permalink: /java-spring/@RestController는 Object를 return하면 어떻게 알아서 Response를 만들어 전달할까/

toc: true
toc_sticky: true
---<h3 id="알고-있던-내용">알고 있던 내용</h3>
<p>일반적으로 사용하는 방식은 다음과 같다.</p>
<pre><code class="language-java">@RestController
public class MyController{

    @GetMapping("/")
    public Dto get(){
        Dto result = service.get();
        return result;
       }

}</code></pre>
<p>@RestController를 사용하면 따로 아래 코드처럼 ResponseEntity type로 return 하거나 @ResponseBody annotation을 붙여주지 않아도 된다.</p>
<pre><code class="language-java">@Controller
public class MyController{

    @GetMapping("/")
    public ResponseEntity&lt;Dto&gt; get(){
        Dto result = service.get();
        return new ResponseEntity&lt;&gt;(result, HttpStatus.OK);
       }

    @ReponseBody
    @GetMapping("/")
    public Dto get2(){
        Dto result = service.get();
        return result;
       }

}
</code></pre>
<p>그 이유는 @RestController Annotation이 이미 @ReponseBody를 가지고 있기 때문이다.
<img alt="" src="https://velog.velcdn.com/images/kny8092/post/da7b988c-a85e-4453-a968-c85c4edffa0b/image.png" /></p>
<h3 id="궁금증">궁금증</h3>
<p>여기서 궁금했던 것은 다음 두가지다.</p>
<ol>
<li>@ResponseBody가 어떻게 동작해서 ResponseEntity를 return 하는 것 처럼 쓸 수 있게된건지</li>
<li>@ResponseBody의 Object는 어떻게 JSON으로 변환되는지</li>
</ol>
<p>Spring MVC 기본으로 돌아가서 처음에 공부했지만 와닿지 않아서 기억이 나지 않는 것들을 리마인드 해봤다.</p>
<p>이번에는 김영한님 강의를 참고했다.</p>
<h2 id="messageconverter">MessageConverter</h2>
<p>Spring MVC 구조를 설명하라고 하면 다음 그림을 떠올린다.</p>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/394e48e3-def7-49f8-8bdd-0e8dbf5af297/image.png" /></p>
<p>여기서 우리가 지금 사용하는 서비스에서는 view가 따로 존재하지 않고 JSON 객체만 전달한다.
이때, @ResponseBody를 사용하거나 ResponseEntity를 전달하면 view Resolver 대신 <code>HttpMessageConverter</code>가 동작한다.</p>
<h3 id="httpmessageconverter">HttpMessageConverter</h3>
<p>HttpMessageConverter는 Interface로 아래와 같이 이루어져있다. </p>
<pre><code class="language-java">public interface HttpMessageConverter&lt;T&gt; {

    // RequestBody
    boolean canRead(Class&lt;?&gt; clazz, @Nullable MediaType mediaType);

    // ResponseBody로 return된 Class의 Type을 지원하는지, Http Accept media type을 지원하는지 확인
    boolean canWrite(Class&lt;?&gt; clazz, @Nullable MediaType mediaType);

    List&lt;MediaType&gt; getSupportedMediaTypes();

    T read(Class&lt;? extends T&gt; clazz, HttpInputMessage inputMessage)
            throws IOException, HttpMessageNotReadableException;

    // MessageConverter를 통해 메세지를 쓰는 기능
    void write(T t, @Nullable MediaType contentType, HttpOutputMessage outputMessage)
            throws IOException, HttpMessageNotWritableException;

}
</code></pre>
<p>@RequestBody와 @ResponseBody 둘 다 사용하는데, canWrite는 message converter가 메세지를 쓸 수 있는지 확인해서 가능하면 write를 수행하도록 한다.
해당 인터페이스의 구현체들은 여러 종류가 있고, 스프링 부스에서 우선순위에 따라 구현체가 canWrite를 만족하는지를 확인한다.
<img alt="" src="https://velog.velcdn.com/images/kny8092/post/93a5796f-7c0c-4014-8dd6-658d819b51d9/image.png" /></p>
<p>여기서 ByteArrayHttpMessageConverter -&gt; StringHttpMessageConverter -&gt; MappingJackson2HttpMessageConverter 순서로 확인하는데, return type이 Object 였다면 <code>MappingJackson2HttpMessageConverter</code> 를 MessaageConverter로 사용할 것이다.</p>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/bc453ba8-9bad-4cc4-b6ce-e58bfed0cff2/image.png" /></p>
<p>이때 어떤 MessaageConverter를 사용할 건지 확인해 호출하는 역할은 ReturnValueHandler에서 한다.</p>
<h2 id="returnvaluehanlder">ReturnValueHanlder</h2>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/235bdc13-5067-417e-afb0-53aa1de32f37/image.png" /></p>
<p>ReturnValueHanlder는 HandlerMethodReturnValueHandler의 줄임말로, 응답 값을 변환하고 처리하는 역할을 한다.
스프링이 지원하는 ReturnValueHanlder는 생각보다 많다.</p>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/b8f09f76-7acf-4354-b155-25bcbdc1364a/image.png" /></p>
<p>HandlerMethodReturnValueHandler도 Interface이고 여러 구현체들을 가지고있다.</p>
<pre><code class="language-java">public interface HandlerMethodReturnValueHandler {

    boolean supportsReturnType(MethodParameter returnType);

    void handleReturnValue(@Nullable Object returnValue, MethodParameter returnType,
            ModelAndViewContainer mavContainer, NativeWebRequest webRequest) throws Exception;

}</code></pre>
<p>Spring MVC는 @ResponseBody가 있으면 <code>RequestResponseBodyMethodProcessor</code>를 사용한다.
<img alt="" src="https://velog.velcdn.com/images/kny8092/post/1e7d39d0-ece3-4d93-8a3d-a09e41501179/image.png" /></p>
<p>HttpEntity가 있으면 <code>HttpEntityMethodProcessor</code>를 사용한다.
<img alt="" src="https://velog.velcdn.com/images/kny8092/post/861c7da7-f715-4866-aea4-df27f191c779/image.png" /></p>
<h3 id="requestresponsebodymethodprocessor">RequestResponseBodyMethodProcessor</h3>
<pre><code class="language-java">    @Override
    public boolean supportsReturnType(MethodParameter returnType) {
        return (AnnotatedElementUtils.hasAnnotation(returnType.getContainingClass(), ResponseBody.class) ||
                returnType.hasMethodAnnotation(ResponseBody.class));
    }

    @Override
    public void handleReturnValue(@Nullable Object returnValue, MethodParameter returnType,
            ModelAndViewContainer mavContainer, NativeWebRequest webRequest)
            throws IOException, HttpMediaTypeNotAcceptableException, HttpMessageNotWritableException {

        mavContainer.setRequestHandled(true);
        ServletServerHttpRequest inputMessage = createInputMessage(webRequest);
        ServletServerHttpResponse outputMessage = createOutputMessage(webRequest);

        // Try even with null return value. ResponseBodyAdvice could get involved.
        writeWithMessageConverters(returnValue, returnType, inputMessage, outputMessage);
    }

    protected ServletServerHttpResponse createOutputMessage(NativeWebRequest webRequest) {
        HttpServletResponse response = webRequest.getNativeResponse(HttpServletResponse.class);
        Assert.state(response != null, "No HttpServletResponse");
        return new ServletServerHttpResponse(response);
    }</code></pre>
<p>httpmessage converter를 찾아서 write 하는 부분</p>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/edb114b3-2869-4890-8bed-236d462763da/image.png" /></p>
<h2 id="mappingjackson2httpmessageconverter">MappingJackson2HttpMessageConverter</h2>
<p>위에서 궁금증 (1)에 대한 내용은 알았고, ReturnValueHandler에서 HttpMessageConverter를 찾아 write 를 수행 한다는 것 까지 알았다.
그러면 write 시에 객체가 JSON 형식으로 변환되는 부분을 간단하게 살펴본다.</p>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/e0f61777-df43-4d96-a4ea-88622c1b510d/image.png" /></p>
<p>위에서 봤던 그림을 다시 가져오면 MappingJackson2HttpMessageConverter의 상속 관계는 다음과 같다.
이름이 길어서 1층, 2층, 3층이라 하겠다.
write는 AbstractGenericHttpMessageConverter(3층)에 구현되어있다.</p>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/2adb34ed-fc9a-48f3-9fef-57fda7e066ee/image.png" /></p>
<p>write 내부에서 writeInternal을 호출하고 OutputStream type인 outputMessage.getBody()를 flush 한다.</p>
<p>writeInternal은 3층에서 abstract method로 정의되어 있고, 한 단계 밑인 AbstractJackson2HttpMessageConverter (2층) 에서 Override 하고있다.</p>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/ebb800de-38db-41b6-af96-aa28538df031/image.png" /></p>
<p>코드가 길지만, writeInternal에서는 생성자에서 지정한 ObjectMapper를 사용해 
Java 객체를 JSON 형식으로 변환하고, 변환된 JSON을 HTTP 응답 메시지의 OutputStream에 쓰는 과정을 거친다.</p>
<p>ObjectMapper를 직접 Custom 할 수도 있다. <a href="https://eblo.tistory.com/193">참고</a>
또는 MessageConverter를 상속받아 직접 구현하는 방식도 있다. <a href="https://kim0lil.github.io/skfactory.github.io/2020/06/03/page7.html">참고</a></p>