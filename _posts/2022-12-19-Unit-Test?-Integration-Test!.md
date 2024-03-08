---
date: 2022-12-19
title: "Unit Test? Integration Test!"
categories:
  - Asnity

permalink: /asnity/Unit-Test?-Integration-Test!/
excerpt: Unit Test가 무조건 최고인가
toc: true
toc_sticky: true
---


## 들어가기 전에


Test는 Test 대상의 범위나 성격에 따라 구분된다.


![0](/assets/img/2022-12-19-Unit-Test?-Integration-Test!.md/0.png)

1. 유닛 테스트
	- 함수 하나하나 개별로 테스트 코드를 작성하는 것
	- 입력 값을 주고 그에 대한 출력 값을 판단
	- 어떠한 부분에 문제가 있고 고칠 부분이 어디인지 명확하게 해줄 때 좋다.
2. 통합 테스트
	- 각각의 시스템들이 서로 어떻게 상호작용하고 제대로 작동 하는지 테스트
	- 다른 컴포넌트와 독립적이지 않다.
3. 기능 테스트
	- E2E Test 또는 브라우저 Test라고 불리며 모두 같은 의미이다.
	- 어떤 어플리케이션이 제대로 동작하는지 완전한 기능을 테스트 하는 것

## 좋다고 하니 합시다? No!


### 많은 사람들이 하고있는 Unit Test


Test를 찾아보면 가장 많이 나오는 건 Unit Test이다.


Unit Test는 함수 단위의 기능에 대한 유효성을 검증하기 때문에 명확하며 각 조건에 대한 유효성을 검증하기에 좋다는 장점이 있다.


많은 사람들이 Unit Test를 선호하고 Test Case를 작성하고 있었으며 부스트 캠프 내에서도 Unit Test를 진행하는 팀이 상당 수 있었다.


기능 별로 Test 하는 것은 확실히 어디서 문제가 발생하는지를 확인하기에 쉽다는 것은 이해한다.


### 이번 프로젝트에선?


그룹 프로젝트 2주차 부터 Test에 대한 고민을 하기 시작했다.


Unit Test가 앞서 말한 장점들이 있다고 하지만, 내가 개발하고 있는 백엔드 비지니스 로직은 대부분 Service Layer에 치중되어있다.


그러면 Service Layer를 집중적으로 Unit Test를 하면될까?


내가 작성 하는 Service Layer Logic을 보면 생각이 달라질 수도 있다.


내가 의문을 가지게한 코드 하나를 가져왔다.
{% raw %}

```typescript
async createCommunity(createCommunityDto: CreateCommunityDto) {
    const community = await this.communityRepository.create({
      ...createCommunityDto,
      users: [createCommunityDto.managerId],
    });
    const newCommunity = makeCommunityObj(community._id.toString(), {});
    await this.userRepository.updateObject({ _id: createCommunityDto.managerId }, newCommunity);
    return getCommunityBasicInfo(community, []);
  }
```
{% endraw %}


> 커뮤니티 생성은 커뮤니티 document를 생성하고, 요청을 한 사용자의 document에도 자신이 속한 community가 추가되었음을 업데이트한다.


	DB에 쓰는 작업이 완료되면 생성된 커뮤니티의 기본 정보를 전달한다.


비지니스 로직이 Repository 에서 전달해주는 값에 의존적이기 때문에, 비지니스 로직을 검증하기 보다는 Repository Input-Output을 검증하는 쪽에 더 가깝다.


그러나 일반적으로 Unit Test를 하기 위해서 Repository에 접근하는 쪽은 mocking하여 사용한다.


**결국 mocking data를 지정해둔다면 위의 함수에서** **`expect( result ).toEqual( mokedData )`** **하는 꼴이 되어버린다.**


내가 만들고 있는 서버는 정말 Unit Test에 적합하지 않다고 생각했다.


하지만 많은 사람들이 Unit Test 좋아요! 를 말하고 있었기 때문에 이게 진짜 최적의 방법인가에 대해 2주차 내내 고민했다.


### 나에게 제일 필요한 Test는..


우리는 Postman을 사용하여 개발 API의 응답을 확인했다.


어떤 API에 대한 초기 개발 과정에서는 필요할 때 마다 확인 하는 것이 편했다.


그러나 **코드가 일부 수정될 때 마다 Postman으로 요청을 하나하나 보내 응답을 확인하기엔 시간 비용이 들었다.**


## Integration Test를 하려면 DB에 접근해야하는데..


그러면 Repository 도 Test가 필요하기 때문에, 차라리 Integration Test가 적합하다고 생각했다.


Repository layer는 실제 DB에 접근하여 결과값을 전달하는 역할만 하고있다.


하지만 여기서 또 걸림돌이 있다.


Test는 각각의 Test가 독립적으로 수행되어야 하며, 실제 DB에 접근하면 기존의 데이터들이 존재하여 영향을 미칠 수 있고, Test Data도 그대로 남아있게된다. (Test Data를 지우도록 code를 작성하는 것도 나에겐 비용에 해당한다.)


뿐만 아니라, Github push시 Github Action으로 Test가 진행되도록 설정해두었는데 DB Server의 AWS 과금이 무서웠다.


Repository layer를 검증은 해야겠는데 실제 DB에 접근하기에는 추가로 고려해야할 점이 많았다…


생각해본 방법은 2가지가 있었다.

1. Test 용 DB를 완전히 새로 생성했다가 Test 완료 마다 삭제한다.
2. Test용으로 MongoDB Atlas를 사용한다.

두 가지 방법 중, 2번이 과금 걱정이 없고 Test 용도의 Data는 많은 양의 Data를 저장하지 않기 때문에 가장 적합한 것으로 보고 setup을 진행했었다.


## 가상의 DB Server


매주 금요일은 캠퍼들 간에 기술 공유 시간이 있다.


타이밍 좋게도, 한창 고민을 하고 있을 시기에 가상 DB Server를 만들어 test를 하는 방법을 기술 공유 시간에 알게되었다.


역시 비슷한 고민을 혼자만 하는게 아니다.


내가 고민을 해결해줄 방법이라고 생각해서 바로 적용하게 되었다.


Integration test를 위해 supertest 라이브러리를 사용하여 postman 처럼 request를 보내고 이에 대한 response 값을 검증할 수 있도록 했다.


## 결론 및 TODO..


### 결론


**우리 프로젝트는 Unit Test보다는 Integration Test가 더 적합했고, 이를 위해 가상의 MongoDB Server를 두어 Test 하는 방식으로 변경했다.**


**response 뿐만 아니라, 가상 DB에 만들어진 값을 다시 찾아보면서 신뢰성을 높였다.**
{% raw %}

```typescript
describe('Patch /api/user/settings ', () => {
    it('팔로워 정보 정상 동작', async () => {
      await request(server)
        .patch('/api/user/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(user1Modify)
        .expect(200)
        .expect((res) => {
          expect(res.body.result).toBeDefined();
          expect(res.body.result.message).toEqual('사용자 정보 변경 완료');
        });
      const newUser1 = await userModel.findById(user1._id);
      expect(newUser1.description).toEqual(user1Modify.description);
    });
  });
```
{% endraw %}


### TODO


`—coverage` 로 나타나는 Code coverage만 높다고 해서 신뢰성있는 Test라고 말할 수 없다.


위에 적은 것 처럼 Response 뿐만 아니라 DB에서 올바르게 Data가 들어갔는지 검증하는 것도 필요하다고 생각한다.


작성한 모든 Test에 대해서 위의 방식을 적용하지는 못했기 때문에, 정말 신뢰성있는 Test인지 더 고민해보고 정합성 측면에서 검증이 필요한 부분이 있는지 검토해서 반영하는 것이 좋을 것 같다.

