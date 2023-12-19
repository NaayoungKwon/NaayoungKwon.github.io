<h2 id="알고-있던-것">알고 있던 것</h2>
<p>직렬화/역직렬화를 할 때 사용해왔고, 필요한 경우에는 검색으로 짧게 이해하고 사용하거나 팀 repository에 적용된 코드를 참고하면서 사용해왔었다.
이번 기회에 찬찬히 읽어보고 정리하는 시간을 가졌다.</p>
<blockquote>
<p>Baeldung의 다음 3가지 Article을 읽으며 정리했다.
<a href="https://www.baeldung.com/jackson-object-mapper-tutorial">Introduce to the Jackson ObjectMapper</a>
<a href="https://www.baeldung.com/spring-boot-customize-jackson-objectmapper">Spring Boot: Customize the Jackson ObjectMapper</a>
<a href="https://www.baeldung.com/jackson-deserialization">Getting Started with Custom Deserialization in Jackson</a></p>
</blockquote>
<h3 id="jackson은">Jackson은?</h3>
<p>Jackson은 <code>Java JSON 라이브러리</code>로 알려져 있으며, JSON 뿐만 아니라 XML/YAML/CSV 등 다양한 형식의 데이타를 지원하는 data-processing 툴이다.</p>
<p>JSON 관련 라이브러리로 GSON, SimpleJSON도 있지만, 다음과 같은 특징을 가진다.</p>
<pre><code>Advantages of Gson:
Simplicity of toJson/fromJson in the simple cases
For deserialization, do not need access to the Java entities

Advantages of Jackson:
Built into all JAX-RS (Jersey, Apache CXF, RESTEasy, Restlet), and Spring framework
Extensive annotation support</code></pre><p>Spring에서 Jackson을 사용하여 이전 포스팅에서 봤던 ObjectMapper를 MessageConverter를 사용하고 있고 다양한 Annotation을 지원하고 있어 주로 사용하게 되었다고 생각한다.</p>
<p>spring-boot-starter-web에는 Jackson를 포함한다.</p>
<h3 id="기본-사용법">기본 사용법</h3>
<pre><code class="language-java">ObjectMapper objectMapper = new ObjectMapper();
String json = "{ \"color\" : \"Black\", \"type\" : \"BMW\" }";
Car car = objectMapper.readValue(json, Car.class);

String carAsString = objectMapper.writeValueAsString(car);</code></pre>
<p>여기서 ObjectMapper에 어떤 설정을 해주고 싶다면 다음과 같이 가능하다.</p>
<pre><code class="language-java">// Deserialize시 null인 property가 있어도 Exception을 발생시키지 않도록 설정
objectMapper.configure(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES, false);</code></pre>
<h2 id="custom-serializerdeserializer">Custom Serializer/Deserializer</h2>
<h3 id="정의하기">정의하기</h3>
<p>Custom serializer와 deserializer는 input이나 output JSON 응답으로 직렬화 역직렬화 되어야하는 경우에 유용하다.
다음은 Deserialize 예시로 추상 클래스인 StdDeserializer를 상속받는다.</p>
<pre><code class="language-java">public class AnimalStdDeserializer extends StdDeserializer&lt;Animal&gt; {

    protected AnimalStdDeserializer(Class&lt;?&gt; vc) {
        super(vc);
    }

    @Override
    public Animal deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        JsonNode node = p.getCodec().readTree(p);
        String type = node.get("type").asText();
        String name = node.get("name").asText();

        Animal animal = new Animal();
        animal.setType(type);
        animal.setName(name);

        return animal;
    }
}
</code></pre>
<p>가끔 예시를 보면 JsonDeserializer를 구현하는 경우가 있는데 상속 관계는 다음과 같다.
<img alt="" src="https://velog.velcdn.com/images/kny8092/post/1e316da0-9d15-46ee-a896-27ee628b622d/image.png" /></p>
<p>jackson 에서는 StdDeserializer, StdSerializer를 사용하기를 권장하고 있다.</p>
<pre><code>Custom deserializers should usually not directly extend this class, 
but instead extend com.fasterxml.jackson.databind.deser.std.StdDeserializer </code></pre><h3 id="custom-serializerdeserializer-사용하는-방법">Custom Serializer/Deserializer 사용하는 방법</h3>
<p>두 가지 방식이 있다.</p>
<ol>
<li>ObjectMapper의 module로 등록<pre><code class="language-java">ObjectMapper objectMapper = new ObjectMapper();
SimpleModule module = new SimpleModule();
module.addDeserializer(Animal.class, new AnimalStdDeserializer());
module.addSerializer(Animal.class, new AnimalStdSerializer());
objectMapper.registerModule(module);
</code></pre>
</li>
</ol>
<p>String jsonStr = "~~";
Animal animal = mapper.readValue(jsonStr, Animal.class);</p>
<pre><code>
2. @JsonSerialize, @JsonDeserialize Annotation을 사용
```java
public class Cage {

    @JsonSerialize(using = AnimalStdSerializer.class)
    @JsonDeserialize(using = AnimalStdDeserializer.class)
    private Animal animal;

}</code></pre><h3 id="generic-type에서-custom-deserializer-정의하기">Generic Type에서 Custom Deserializer 정의하기</h3>
<p>ContextualDeserializer Interface를 구현해서 Generic의 Type parameter를 가져올 수 있도록 해야한다.
createContextual method를 overriding하여 역직렬화에 필요한 정보를 추출해 Deserialize 인스턴스를 생성하도록 한다.</p>
<pre><code class="language-java">public interface ContextualDeserializer
{
    public JsonDeserializer&lt;?&gt; createContextual(DeserializationContext ctxt,
            BeanProperty property)
        throws JsonMappingException;
}</code></pre>
<pre><code class="language-java">public class WrapperDeserializer extends JsonDeserializer&lt;Wrapper&lt;?&gt;&gt; implements ContextualDeserializer {

    private JavaType type;

    @Override // ContextualDeserializer override
    public JsonDeserializer&lt;?&gt; createContextual(DeserializationContext ctxt, BeanProperty property) {
        this.type = property.getType().containedType(0);
        return this;
    }

    @Override // JsonDeserializer override
    public Wrapper&lt;?&gt; deserialize(JsonParser jsonParser, DeserializationContext deserializationContext) throws IOException {
        Wrapper&lt;?&gt; wrapper = new Wrapper&lt;&gt;();
        wrapper.setValue(deserializationContext.readValue(jsonParser, type));
        return wrapper;
    }
}</code></pre>
<p>이전에 인스턴스 필드 중 개인정보는 masking하여 logging할 때 객체를 serialize하는데 이때도 masking할 필드를 Annoation으로 붙여두고 Annotation이 있는 필드에 대해서 JsonSerializer를 적용하도록 하는 것도 해당 방식을 사용할 수 있다.</p>
<h2 id="spring-boot에서-objectmapper-customize">Spring Boot에서 ObjectMapper Customize</h2>
<p>Spring Boot에서 요청을 deserialize, 응답을 serialize할 때 ObjectMapper instance를 사용한다.
Spring Boot는 default로 다음 설정을 disable 시켜뒀다.</p>
<ul>
<li>MapperFeature.DEFAULT_VIEW_INCLUSION<ul>
<li>JSON으로 변환할 때 기본적으로 해당 객체의 모든 필드를 포함할지 여부. </li>
<li>false로 설정하면 현재 활성화된 뷰에만 포함</li>
</ul>
</li>
<li>DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES<ul>
<li>역직렬화 시에 JSON 데이터에 존재하지 않는 속성이 객체에 존재할 때 어떻게 처리할지를 설정.</li>
<li>false로 설정하면 무시된다.</li>
</ul>
</li>
<li>SerializationFeature.WRITE_DATES_AS_TIMESTAMPS<ul>
<li>직렬화할 때, 날짜를 타임스탬프로 표현할지 여부를 설정.</li>
<li>true로 설정하면 날짜가 숫자 타임스탬프로 표현</li>
<li>false로 설정하면 사람이 읽을 수 있는 형식(예: "2023-12-21T12:34:56")으로 표현</li>
</ul>
</li>
</ul>
<p>Spring Boot를 사용할 때 default ObjectMapper의 설정을 customize하거나 override해서 쓸 수 있다.</p>
<h3 id="default-objectmapper를-customize-하는-방법">Default ObjectMapper를 Customize 하는 방법</h3>
<ol>
<li><p>application property를 수정하기</p>
<pre><code>spring.jackson.&lt;category_name&gt;.&lt;feature_name&gt;=true,false</code></pre><p>단점 : 세부적으로 custom하기는 어렵다.</p>
</li>
<li><p>module을 Bean으로 등록한다.</p>
<pre><code class="language-java">@Configuration
@PropertySource("classpath:coffee.properties")
public class CoffeeRegisterModuleConfig {

 @Bean
 public Module javaTimeModule() {
     JavaTimeModule module = new JavaTimeModule();
     module.addSerializer(LOCAL_DATETIME_SERIALIZER);
     return module;
 }
}
</code></pre>
</li>
</ol>
<pre><code>3. Jackson2ObjectMapperBuilderCustomizer 사용하기
functional interface를 사용하는 방법으로, default OBjectMapper를 Jackson2ObjectMapperBuilder를 통해서 JSON 응답값 변경을 적용할 수도 있다.
 

```java
@Bean
public Jackson2ObjectMapperBuilderCustomizer jsonCustomizer() {
    return builder -&gt; builder.serializationInclusion(JsonInclude.Include.NON_NULL)
      .serializers(LOCAL_DATETIME_SERIALIZER);
}</code></pre><p>또 다른 예시로 @JsonFormat을 응답 객체에 매번 붙여두지 않고 공통적인 형식을 지정하는 용도로 사용할 수 있다.
<a href="https://addio3305.tistory.com/101">참고</a></p>
<h3 id="default-configuration을-override-하는-방법">Default Configuration을 Override 하는 방법</h3>
<p>설정을 완전히 컨트롤하려면 auto configuration을 disable하고 custom 설정을 적용하는 방식이 있다.</p>
<ol>
<li>ObjectMapper</li>
</ol>
<p>ObjectMapper를 생성해서 Primary Bean으로 등록하는 방식으로 configuration을 내가 전부 명시해야한다.</p>
<ol start="2">
<li>Jackson2ObjectMapperBuilder</li>
</ol>
<p>Jackson2ObjectMapperBuilder Bean을 정의하는 방법으로 Spring Boot는 ObjectMapper를 만들 때 이 방식을 사용한다.</p>
<p>1번과 다르게 다음 두개가 default로 설정되어있, 좀 더 간단하고 직관적인 방식이다.</p>
<ul>
<li>disable MapperFeature.DEFAULT_VIEW_INCLUSION</li>
<li>disable DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES</li>
</ul>

Date class 관련해서 serialize,deserialize 하는 경우가 많은데 자세한 내용은 다음을 참고하자
https://www.baeldung.com/jackson-serialize-dates


<hr />
<p>참고
<a href="https://github.com/FasterXML/jackson">https://github.com/FasterXML/jackson</a>
<a href="https://www.baeldung.com/jackson-vs-gson">https://www.baeldung.com/jackson-vs-gson</a></p>