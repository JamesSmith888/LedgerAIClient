# 🔐 签名密钥安全须知

## ⚠️ 重要提醒

`android/gradle.properties` 文件包含签名密钥的敏感信息!

### 当前配置的密钥信息:
- 密钥文件: `ledger-release-key.keystore`
- 别名: `ledger-key-alias`
- 密码: `ledger2024`

## 🚨 安全措施

### 1. 不要提交到 Git

**如果不小心提交了密码,请立即:**

```bash
# 从 git 历史中移除敏感信息
git rm --cached android/gradle.properties
git commit -m "Remove sensitive gradle.properties"

# 或者修改文件,移除密码后再提交
```

### 2. 使用环境变量 (推荐)

修改 `android/gradle.properties`:

```properties
# 不要写死密码,使用环境变量
LEDGER_RELEASE_STORE_FILE=ledger-release-key.keystore
LEDGER_RELEASE_KEY_ALIAS=ledger-key-alias
LEDGER_RELEASE_STORE_PASSWORD=${LEDGER_STORE_PASSWORD}
LEDGER_RELEASE_KEY_PASSWORD=${LEDGER_KEY_PASSWORD}
```

然后在本地设置环境变量:

```bash
# macOS/Linux
export LEDGER_STORE_PASSWORD=ledger2024
export LEDGER_KEY_PASSWORD=ledger2024

# 或者添加到 ~/.zshrc 或 ~/.bashrc
```

### 3. 备份密钥文件

```bash
# 将密钥文件备份到安全位置
cp android/app/ledger-release-key.keystore ~/安全位置/
```

**重要:** 
- 丢失密钥文件 = 无法更新已发布的应用
- 密钥泄露 = 他人可能伪造你的应用

### 4. 团队协作建议

如果是团队开发:

1. **不提交密钥到 Git**
2. **使用专门的密钥管理工具** (如 1Password, LastPass)
3. **只有发布负责人持有生产密钥**
4. **开发环境使用测试密钥**

## 📝 当前 .gitignore 状态

已忽略的文件:
- ✅ `*.keystore` (除了 debug.keystore)
- ⚠️ `gradle.properties` 未被忽略

### 添加到 .gitignore

如果你想忽略 gradle.properties:

```bash
echo "android/gradle.properties" >> .gitignore
```

**但注意:** 这可能影响团队其他成员的构建配置。

## 🔄 CI/CD 环境

如果使用 CI/CD (如 GitHub Actions, GitLab CI):

1. 将密钥文件 Base64 编码:
```bash
base64 android/app/ledger-release-key.keystore > keystore.base64
```

2. 在 CI/CD 中设置密钥:
   - 将 base64 内容作为密钥存储
   - 构建时解码恢复文件

3. 密码使用 CI/CD 的密钥管理功能

## ✅ 安全检查清单

- [ ] ✅ 密钥文件已备份到安全位置
- [ ] ✅ 密码已记录(私密保存)
- [ ] ⚠️ 考虑是否将 gradle.properties 移除版本控制
- [ ] ⚠️ 确认团队成员了解密钥管理规范
- [ ] ⚠️ 考虑使用环境变量替代硬编码密码

---

## 📞 需要帮助?

如果密钥丢失或泄露,请及时联系技术负责人处理。
