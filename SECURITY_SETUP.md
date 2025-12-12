# 보안 설정 가이드

## 환경 변수 설정

이 프로젝트는 민감한 정보(DB 비밀번호, API 키 등)를 환경 변수로 관리합니다.

### 1. 환경 변수 파일 생성

프로젝트 루트 디렉토리에 `.env` 파일을 생성하고 다음 내용을 입력하세요:

```bash
# 데이터베이스 설정
DB_URL=jdbc:mysql://localhost:3306/livewalk?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Seoul&characterEncoding=UTF-8
DB_USERNAME=your_db_username
DB_PASSWORD=your_strong_password_here

# API 키 설정
BOK_API_KEY=your_bok_api_key_here

# Cloudinary 설정
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# 파일 업로드 경로
UPLOAD_DIR=/var/livewalk/uploads/images
BACKUP_DIR=/var/livewalk/backups/csv
```

**중요**: `.env` 파일은 절대 Git에 커밋하지 마세요! (이미 .gitignore에 추가되어 있습니다)

### 2. Windows 환경 변수 설정 (권장)

#### 방법 1: 시스템 환경 변수 (영구적)

1. 윈도우 검색에서 "환경 변수" 검색
2. "시스템 환경 변수 편집" 선택
3. "환경 변수" 버튼 클릭
4. "사용자 변수" 또는 "시스템 변수"에서 "새로 만들기" 클릭
5. 각 변수를 하나씩 추가:
   - 변수 이름: `DB_PASSWORD`
   - 변수 값: `your_strong_password`

#### 방법 2: IntelliJ IDEA에서 설정

1. Run > Edit Configurations
2. Spring Boot 실행 구성 선택
3. Environment variables 필드에 입력:
   ```
   DB_USERNAME=root;DB_PASSWORD=your_password;BOK_API_KEY=your_key
   ```

#### 방법 3: 명령줄에서 실행 시

```bash
set DB_USERNAME=root
set DB_PASSWORD=your_password
set BOK_API_KEY=your_key
gradlew bootRun
```

### 3. Linux/Mac 환경 변수 설정

#### ~/.bashrc 또는 ~/.zshrc에 추가:

```bash
export DB_USERNAME="root"
export DB_PASSWORD="your_strong_password"
export BOK_API_KEY="your_bok_api_key"
export CLOUDINARY_CLOUD_NAME="your_cloud_name"
export CLOUDINARY_API_KEY="your_api_key"
export CLOUDINARY_API_SECRET="your_api_secret"
```

설정 후 적용:
```bash
source ~/.bashrc
```

### 4. Docker 환境에서 실행 시

```bash
docker run -e DB_USERNAME=root \
           -e DB_PASSWORD=your_password \
           -e BOK_API_KEY=your_key \
           your-image-name
```

또는 docker-compose.yml:
```yaml
services:
  app:
    environment:
      - DB_USERNAME=root
      - DB_PASSWORD=${DB_PASSWORD}
      - BOK_API_KEY=${BOK_API_KEY}
```

### 5. 프로덕션 환경 권장 사항

#### AWS Secrets Manager 사용 예시:

```java
@Configuration
public class SecretsConfig {
    @Bean
    public DataSource dataSource() {
        AWSSecretsManager client = AWSSecretsManagerClientBuilder.standard()
            .withRegion("ap-northeast-2")
            .build();

        GetSecretValueRequest request = new GetSecretValueRequest()
            .withSecretId("livewalk/db");

        GetSecretValueResult result = client.getSecretValue(request);
        // Parse and use secret
    }
}
```

### 6. 보안 체크리스트

- [ ] `.env` 파일이 .gitignore에 포함되어 있는지 확인
- [ ] Git 이력에 비밀번호가 커밋되지 않았는지 확인
- [ ] 프로덕션에서는 강력한 비밀번호 사용
- [ ] DB 사용자는 최소 권한만 부여
- [ ] API 키는 정기적으로 갱신

### 7. 긴급 상황 시

만약 실수로 비밀번호를 커밋했다면:

1. **즉시 비밀번호 변경**
2. Git 이력에서 제거:
```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch src/main/resources/application-secret.properties" \
  --prune-empty --tag-name-filter cat -- --all

git push origin --force --all
```

3. GitHub에 이미 push했다면 저장소를 private으로 변경하거나 재생성 고려

### 문의사항

환경 변수 설정에 문제가 있으시면 프로젝트 관리자에게 문의하세요.
