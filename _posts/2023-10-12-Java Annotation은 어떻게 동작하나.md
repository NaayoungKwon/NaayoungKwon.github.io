---
date: 2023-10-12
title: "Java Annotation은 어떻게 동작하나"
category :
  - Java & Spring
permalink: /java-spring/Java Annotation은 어떻게 동작하나/

toc: true
toc_sticky: true
---

<blockquote>
<p>로그 출력 시 이메일 등의 개인 정보를 * 로 masking 해야하는 경우가 생겼다. 이 때 masking을 직접 구현하지 않고도 쓸 수 있는 방법이 있을 것 같아 찾아보는 중 Custom Annotation을 알게되면서 Annotation을 더 알아보고싶다는 생각이 들었다.</p>
</blockquote>
<h3 id="내가-알고있는-annotation">내가 알고있는 Annotation</h3>
<p><code>@Override, @Getter, @Setter, @Component</code> 등 일반적으로 사용하는 Annotation이 어떤 의미인지,
<code>@Target, @Retention</code> 이 무엇인지 정도만 알고있었다.</p>
<h2 id="annotation이란">Annotation이란</h2>
<p>metadata의 형태로 Annotation는 프로그램에 대해 데이터를 제공한다.
Annotation은 코드 동작에 직접적인 영향은 미치지 않는다.</p>
<h3 id="annoataion의-용도">Annoataion의 용도</h3>
<ul>
<li>compiler를 위한 정보 : Annotation은 컴파일러가 에러를 감지하는데 사용된다.</li>
<li>컴파일 시간 및 배포 시간 처리 : Annotation 정보를 처리해 코드, XML 파일 등을 생성한다.</li>
<li>런타임 처리 : 일부 Annotation은 런타임에 조사된다.</li>
</ul>
<h3 id="annotation의-형식">Annotation의 형식</h3>
<ul>
<li><code>@</code> 을 붙여서 컴파일러가 annotation임을 알아낸다.</li>
<li>element를 0 ~ n 개 가질 수 있다. <code>@Author(name="chloe", date="20231012)</code></li>
<li>value라는 element 하나만 가질 경우 element를 따로 적지 않아도 된다. <code>@Author("chloe")</code></li>
<li>하나의 선언에 여러 개의 annotation을 붙여도 된다.</li>
<li>repeating annotation : 같은 타입의 annotation을 여러 번 붙일 수 있다.</li>
</ul>
<p>Annotation은 어디서 사용할 수 있는가</p>
<ul>
<li>주로 class, field, method의 선언에 붙일 수 있다.</li>
<li>Java SE 8 release 부터 class 생성자, type cast, exception throw 등에 사용가능하다.</li>
</ul>
<h3 id="annotation-type-선언하기">Annotation Type 선언하기</h3>
<p>Annotation은 크게 2가지로 나뉜다.</p>
<ul>
<li>Built in Annotation : 자바에서 기본 제공하는 어노테이션 ex. @Override, @Deprecated</li>
<li>Meta Annotation : 커스텀 어노테이션을 만들 수 있게 제공된 어노테이션 ex. @Retention, @Target</li>
</ul>
<p>Meta Annotation으로 커스텀 어노테이션을 만들어보자.</p>
<pre><code class="language-java">@interface ClassPreamble {
   String author();
   String date();
   int currentRevision() default 1;
   String lastModified() default "N/A";
   String lastModifiedBy() default "N/A";
   // Note use of array
   String[] reviewers();
}</code></pre>
<ul>
<li>annotation type 정의는 interface 의 한 형태다.</li>
<li>method 처럼 보이는 annotation type element 선언이 포함되어있고 optional로 default value를 정할 수 있다.</li>
<li>다른 annotation에 적용할 수 있는 annotation을 meta-annotation이라고 한다.<ul>
<li><code>@Retention</code><ul>
<li>RetentionPolicy.SOURCE : 소스 수준에서만 유지되며 컴파일러에서는 무시</li>
<li>RetentionPolicy.CLASS : 컴파일 시 컴파일러에 의해 유지되지만 JVM에서는 무시</li>
<li>RetentionPolicy.RUNTIME : JVM에 의해 유지되므로 런타임 환경에서 사용가능</li>
</ul>
</li>
<li><code>@Documented</code> : Javadoc tool을 사용해서 document 화 가능</li>
<li><code>@Target</code> : Annotation이 적용될 수 있는 요소를 제한</li>
</ul>
</li>
</ul>
<h3 id="retention-좀-더-알아보기">@Retention 좀 더 알아보기</h3>
<p>공식 문서에 나와있는 내용이 이해가 안되는건아닌데 잘 와닿지 않아서, Lombok 등을 찾아보면서 예시를 통해 매치해봤다.</p>
<p><strong>RetentionPolicy.SOURCE</strong>
예시 : @Getter, @Data
실제로 컴파일 하고 나면 @Getter를 붙인 클래스에 getFieldName() 들이 우수수 생긴다.</p>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/05c0e872-a148-4f4c-a7a8-7fa610e5708d/image.png" /></p>
<p>왼쪽은 .java이고 오른쪽은 빌드 후 .class 파일인데 @Data annotation은 사라지고, get 메소드들과 생성자가 자동으로 만들어진 것을 볼 수 있다.
그리고 @Min은 RUNTIME이라서 사라지지 않고 유지되었다.</p>
<p><strong>RetentionPolicy.RUNTIME</strong>
예시 : @Min</p>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/ce9cf03a-3af0-41d2-8d67-f769ae2fb367/image.png" /></p>
<p>실행 중에도 Annotation이 유지되어 Java Reflection을 이용해서 알아낼 수 있다</p>
<pre><code class="language-java">Annotation annotation = clazz.getDeclaredAnnotation(MyCustom.class);</code></pre>
<p>맨 처음 이야기했던 masking도 RUNTIME으로 Annotation을 설정해서 사용하면 된다.</p>
<h2 id="annotation-사용하기">Annotation 사용하기</h2>
<p>Annotation을 생성했으니 이를 어떻게 사용할지에 대한 방법들을 알아보려고 한다.
기본 지식이 부족해서 찾아보고 알아내는데 시간이 좀 걸렸지만, 이 방법들 외에도 필요에 따라 Annotation을 활용할 수 있는 방법은 더 많을 것 같다.</p>
<h3 id="reflection">Reflection</h3>
<p>다음과 같이 Annotation을 정의했다고 가정해보자. </p>
<pre><code class="language-java">@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Box {

  String value() default "box";

  String color() default "white";

  int size() default 10;
}</code></pre>
<p>Reflection을 사용하면 Annotation에서 가지고 있는 Meta 정보들을 다음과 같이 가져올 수 있다.
<del>Meta 정보로 사용하는 적절한 예시는 아니긴한데, 아무튼..</del></p>
<pre><code class="language-java">  @Box(value = "iphoneBox", color = "white")
  public class Iphone{
    String version;
    String os;
  }


  public static void main(String[] args) {

    Class&lt;Iphone&gt; iphoneClass = Iphone.class;
    Annotation[] annotations = iphoneClass.getDeclaredAnnotations();
    for (Annotation annotation : annotations) {
      if (annotation instanceof Box) {
        Box box = (Box) annotation;
        System.out.println(box.value()); // iphoneBox
        System.out.println(box.color()); // white
      }
    }

  }</code></pre>
<h3 id="annotation-processor">Annotation Processor</h3>
<ul>
<li>@Getter나 Mapstruct는 컴파일 시에 코드를 생성하는데, 코드를 어떻게 생성할 수 있을까?</li>
<li>annotationProcessor<ul>
<li>build.gradle 파일을 보면 <code>annotationProcessor("org.mapstruct:mapstruct-processor:1.5.3.Final")</code> 와 같은 설정을 볼 수 있다.</li>
<li>Java 코드를 컴파일할 때 사용할 annotation processor를 지정하는 설정</li>
<li>코드의 annotation을 처리하고 해당 annotation을 기반으로 추가 코드를 생성하는 도구다.</li>
<li>프로젝트를 빌드할 때, MapStruct annotation processor는 코드에서 MapStruct annotation (ex. @Mapper)을 스캔하고 해당 annotation을 기반으로 매핑 코드를 생성한다.</li>
</ul>
</li>
<li>lombok과 mapstruct는 annotation processor를 이용해 컴파일 시점에 코드를 생성한다.</li>
</ul>
<p>lombok의 Annotation Processor를 추적해보니 다음과 같다.</p>
<pre><code class="language-java">public class AnnotationProcessor extends AbstractProcessor {

}
public abstract class AbstractProcessor implements Processor {

}
</code></pre>
<p>Annotation Processor를 만들기 위해서는 AbstractProcessor를 상속받고,
AbstractProcessor는 Processor Interface를 구현한다.</p>
<h4 id="abstractprocessor">AbstractProcessor</h4>
<p>AbstractProcessor가 구현해야하는 주요 메서드 4개에 대해서 간단히만 알아보자.</p>
<pre><code class="language-java">public interface Processor {
    Set&lt;String&gt; getSupportedAnnotationTypes();
    SourceVersion getSupportedSourceVersion();
    void init(ProcessingEnvironment processingEnv);
    boolean process(Set&lt;? extends TypeElement&gt; annotations, RoundEnvironment roundEnv);
}</code></pre>
<ul>
<li><p>getSupportedAnnotationTypes : 어떤 annotation을 처리할 것인지 명시적으로 지정</p>
</li>
<li><p>getSupportedSourceVersion : 프로세서가 어떤 Java version을 이용할지 명시한다.</p>
</li>
<li><p>init : Annotation processor가 초기화될 때 호출되며, Processing Environment에 대한 정보에 접근할 수 있으며, Messager를 통해 컴파일러 메시지를 출력하거나, Filer를 사용하여 새로운 소스 파일을 생성할 수 있다.</p>
<ul>
<li>ProcessingEnvironment : annotation processor가 컴파일 동안 사용할 수 있는 도구와 정보를 제공하는 인터페이스</li>
<li>AbstractProcessor 에서는 processingEnv를 초기화하고 있고, 
<img alt="" src="https://velog.velcdn.com/images/kny8092/post/93385b81-be44-4d85-8939-a1a86e08d233/image.png" /></li>
<li>lombok AnnotationProcessor에서는 ProcessingEnvironment가 messager를 통해 컴파일러 메시지를 출력할 수도록 해주는 것을 볼 수 있다.
<img alt="" src="https://velog.velcdn.com/images/kny8092/post/7cd32275-02ae-408a-b20e-544f843e5dad/image.png" /></li>
</ul>
</li>
<li><p>process : 실제로 작업을 처리할 메소드로, 애노테이션을 검사하고 필요한 작업(코드 생성)을 수행하고 반환 값으로 작업의 성공 여부를 전달한다.</p>
</li>
</ul>
<p>기본 동작들은 알았고, Custom Annotation을 만들고 Processor도 구현하도록 GPT에게 시켰다!</p>
<p><strong>요청 사항</strong> 
<img alt="" src="https://velog.velcdn.com/images/kny8092/post/d0c29cb1-1d9a-4c90-ab02-c4d08927e002/image.png" /></p>
<p>GPT가 Processor로 파일을 만드는과정을 똑바로 못해서, 작성해준 것을 기본으로 조금 수정했다.
{annotation이 붙어있는 필드를 가진 클래스 이름} + "ChloeCustomGetter" 클래스를 새로 만들었다.</p>
<pre><code class="language-java">import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.SOURCE)
@Target(ElementType.FIELD)
public @interface ChloeCustomGetter {
}



@SupportedAnnotationTypes("org.example.ChloeCustomGetter")
@SupportedSourceVersion(SourceVersion.RELEASE_11)
@AutoService(Processor.class)
public class ChloeCustomGetterProcessor extends AbstractProcessor {

  private ProcessingEnvironment processingEnv;

  @Override
  public synchronized void init(ProcessingEnvironment processingEnv) {
    super.init(processingEnv);
    this.processingEnv = processingEnv;
  }

  @Override
  public boolean process(Set&lt;? extends TypeElement&gt; annotations, RoundEnvironment roundEnv) {
    for (Element element : roundEnv.getElementsAnnotatedWith(ChloeCustomGetter.class)) {
      if (element instanceof VariableElement) {
        VariableElement field = (VariableElement) element;
        String fieldName = field.getSimpleName().toString();
        TypeName fieldTypeName = TypeName.get(field.asType());
        String getterName = "getChloe" + capitalize(fieldName);

        FieldSpec fieldSpec = FieldSpec.builder(fieldTypeName, fieldName)
            .addModifiers(Modifier.PRIVATE)
            .build();

        MethodSpec setterMethod = MethodSpec.methodBuilder("set" + capitalize(fieldName))
            .addModifiers(Modifier.PUBLIC)
            .addParameter(fieldTypeName, fieldName)
            .addStatement("this.$N = $N", fieldName, fieldName)
            .build();

        MethodSpec getterMethod = MethodSpec.methodBuilder(getterName)
            .addModifiers(Modifier.PUBLIC)
            .returns(String.class)
            .addStatement("return \"Chloe said this is \" + $N", fieldName)
            .build();

        TypeElement classElement = (TypeElement) field.getEnclosingElement();
        String packageName = processingEnv.getElementUtils().getPackageOf(classElement).getQualifiedName().toString();

        TypeSpec classToGenerate = TypeSpec.classBuilder(classElement.getSimpleName() + "ChloeCustomGetter")
            .addField(fieldSpec)
            .addMethods(List.of(setterMethod,getterMethod))
            .addModifiers(Modifier.PUBLIC)
            .build();

        JavaFile javaFile = JavaFile.builder(packageName, classToGenerate).build();

        try {
          javaFile.writeTo(processingEnv.getFiler());
        } catch (IOException e) {
          processingEnv.getMessager().printMessage(Diagnostic.Kind.ERROR, "Error generating ChloeCustomGetter class: " + e.getMessage());
        }
      }
    }
    return true;
  }

  private String capitalize(String s) {
    if (s == null || s.length() == 0) return s;
    return Character.toUpperCase(s.charAt(0)) + s.substring(1);
  }
}</code></pre>
<p>annotation module을 먼저 빌드하고 해당 모듈을 사용할 곳에서 의존성을 추가한다.</p>
<pre><code class="language-gradle">dependencies {
    implementation project(':annotation')
    annotationProcessor project(':annotation')
}</code></pre>
<p>이후에 Phone이라는 클래스를 만들고 custom annotation을 붙였다.</p>
<pre><code class="language-java">public class Phone {

  Phone(String version){
    this.version = version;
  }

  @ChloeCustomGetter
  private String version;
}
</code></pre>
<p>이후 빌드하면 build/ 하위에 CustomGetter 클래스가 생성된다!</p>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/072e5bb5-648f-40ce-a71d-e67c281f12e4/image.png" /></p>
<p>이후에 Main에서 사용할 수있다.</p>
<pre><code>public class Main {

  public static void main(String[] args) {

    PhoneChloeCustomGetter phoneChloeCustomGetter = new PhoneChloeCustomGetter();
    phoneChloeCustomGetter.setVersion("iphone 15 pro");
    System.out.println(phoneChloeCustomGetter.getChloeVersion()); // Chloe said this is iphone 15 pro
  }
}</code></pre><h4 id="컴파일-과정">컴파일 과정</h4>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/20f11563-9c62-4694-a5e1-b38f2a490e9a/image.png" /></p>
<ul>
<li>Annotation은 컴파일 과정에서 위의 그림 처럼 동작한다.<ul>
<li>한 라운드에서 이전 round에서 생성된 source/class file들의 Annotation과 그에 상응하는 Annotation Processor가 호출되고 새로운 파일을 만들고 </li>
<li>다음 round에서 새로운 파일은 또 Annotation이 있는지를 확인하는 과정을 거친다.</li>
<li>더 생성할 것이 없을 때, Syntax tree가 class file로 변환된다.</li>
</ul>
</li>
<li>Annotation Processor는 새 source 파일만 생성할 수 있고 기존 source은 수정할 수 없다.</li>
</ul>
<p><img alt="" src="https://velog.velcdn.com/images/kny8092/post/1eb55365-31cc-417b-b1ce-7ca6b0bfbeb1/image.png" /></p>
<ul>
<li>Annotation 자체만을 포함하는 전용 프로젝트 또는 모듈을 하나 가지고 있다.</li>
<li>Annotation Processor와 Client는 모두 이 프로젝트에 의존합니다. </li>
<li>Client는 Annotation Processor에 컴파일 의존성을 가질 필요가 없고 실제 코드보다 먼저 실행하기만 하면 된다.</li>
</ul>
<h3 id="annotationintrospector">AnnotationIntrospector</h3>
<ul>
<li>Annotation 정보 기반으로 직렬화 및 역직렬화에 사용되는 API를 정의하는 추상 클래스</li>
<li>이 클래스를 직접 extends하지 말고 NopAnnotation Introspector를 상속하는 것이 좋다.</li>
<li>making하여 출력하기 위한 serializer 를 찾아보면 NopAnnotation Introspector를 상속해서 구현하는 내용이 많이 나온다.</li>
</ul>
<hr />
<p>참고
<a href="https://docs.oracle.com/javase/tutorial/java/annotations/index.html">Oracle Java Doc - Annotation tutorial</a>
<a href="https://docs.oracle.com/en/java/javase/11/docs/api/java.compiler/javax/annotation/processing/AbstractProcessor.html">Oracle Java Doc - AbstractProcessor</a>
<a href="https://www.adrianbartnik.de/blog/annotation-processing">https://www.adrianbartnik.de/blog/annotation-processing</a>
<a href="https://code-overflow.tistory.com/entry/%EC%9E%90%EB%B0%94-%EC%95%A0%EB%85%B8%ED%85%8C%EC%9D%B4%EC%85%98-%ED%94%84%EB%A1%9C%EC%84%B8%EC%84%9CJava-Annotation-Processor">https://code-overflow.tistory.com/entry/%EC%9E%90%EB%B0%94-%EC%95%A0%EB%85%B8%ED%85%8C%EC%9D%B4%EC%85%98-%ED%94%84%EB%A1%9C%EC%84%B8%EC%84%9CJava-Annotation-Processor</a>
<a href="https://roadj.tistory.com/9">Javapoet 라이브러리 참조</a>
<a href="https://taes-k.github.io/2021/04/18/java-annotation-processing/">https://taes-k.github.io/2021/04/18/java-annotation-processing/</a></p>